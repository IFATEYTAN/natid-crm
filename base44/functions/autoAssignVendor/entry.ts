import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);

/**
 * Auto-assign optimal vendor to a call
 * Scoring algorithm considers: distance, availability, service type, rating, response time
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: only admin/operator can trigger auto-assignment
    const user = await base44.auth.me();
    if (!user || !['admin', 'operator'].includes(user.role)) {
      return Response.json({ error: 'Unauthorized - admin or operator role required' }, { status: 403 });
    }

    const rl = await limiter.check('autoAssignVendor', user.id, 20, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

    const { call_id, exclude_vendor_ids = [] } = await req.json();

    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    // Get the call details
    const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Duplicate assignment prevention: check if call is already assigned
    if (call.assigned_vendor_id && ['vendor_enroute', 'in_progress'].includes(call.call_status)) {
      return Response.json({
        success: false,
        error: 'Call already assigned to a vendor',
        assigned_vendor_id: call.assigned_vendor_id,
        assigned_vendor_name: call.assigned_vendor_name
      });
    }

    // Check for pending (non-expired) assignment attempts
    const pendingAttempts = await base44.asServiceRole.entities.CallAssignmentAttempt.filter({
      call_id: call_id,
      status: 'pending'
    });
    const activePending = pendingAttempts.filter(a => new Date(a.expires_at) > new Date());
    if (activePending.length > 0) {
      return Response.json({
        success: false,
        error: 'Call has a pending assignment attempt',
        pending_vendor_id: activePending[0].vendor_id,
        expires_at: activePending[0].expires_at
      });
    }

    // Get all active vendors
    const allVendors = await base44.asServiceRole.entities.Vendor.filter({ is_active: true });
    
    // Filter available vendors (exclude busy, offline, on_break)
    const availableVendors = allVendors.filter(v =>
      v.availability_status === 'available' &&
      !exclude_vendor_ids.includes(v.id)
    );

    if (availableVendors.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'No available vendors',
        recommendation: null 
      });
    }

    // Calculate score for each vendor
    const scoredVendors = availableVendors.map(vendor => {
      let score = 0;
      const details = {};

      // 1. Distance scoring (40 points max)
      // If vendor has location and call has location
      if (vendor.current_latitude && vendor.current_longitude && 
          call.pickup_location_lat && call.pickup_location_lon) {
        const distance = calculateDistance(
          vendor.current_latitude, vendor.current_longitude,
          call.pickup_location_lat, call.pickup_location_lon
        );
        details.distance_km = Math.round(distance * 10) / 10;
        
        // Closer = better score (max 40 points)
        if (distance <= 5) score += 40;
        else if (distance <= 10) score += 35;
        else if (distance <= 20) score += 25;
        else if (distance <= 30) score += 15;
        else if (distance <= 50) score += 10;
        else score += 5;
        
        details.distance_score = score;
      } else {
        // No location data - check coverage areas
        if (vendor.coverage_areas?.includes(call.pickup_location_area)) {
          score += 25;
          details.coverage_match = true;
        }
      }

      // 2. Service type match (20 points)
      // Primary: explicit call.service_type from the form (towing/mobile_unit/...)
      // Fallback: infer from call.issue_type (flat_tire/dead_battery/...)
      const serviceCategoryMap = {
        'towing': ['tow_truck', 'multi_service'],
        'towing_storage': ['tow_truck', 'multi_service'],
        'towing_mobile': ['tow_truck', 'mechanic', 'multi_service'],
        'mobile_unit': ['mechanic', 'multi_service'],
        'storage_only': ['tow_truck', 'multi_service'],
        'other': ['multi_service', 'tow_truck'],
      };
      const issueTypeMap = {
        'mechanical': ['mechanic', 'multi_service'],
        'stopped_driving': ['tow_truck', 'multi_service'],
        'flat_tire': ['tire_service', 'tow_truck', 'multi_service'],
        'stuck_wheel': ['tow_truck', 'multi_service'],
        'accident': ['tow_truck', 'multi_service'],
        'no_fuel': ['fuel_delivery', 'multi_service'],
        'dead_battery': ['mechanic', 'multi_service'],
        'locked_keys': ['locksmith', 'multi_service'],
        'other': ['multi_service', 'tow_truck'],
      };

      const neededServices =
        serviceCategoryMap[call.service_type] ||
        serviceCategoryMap[call.service_category] ||
        issueTypeMap[call.issue_type] ||
        ['tow_truck'];
      const vendorServices = vendor.service_type || [];
      const serviceMatch = neededServices.some(s => vendorServices.includes(s));

      if (serviceMatch) {
        score += 20;
        details.service_match = true;
      }

      // 3. Rating score (20 points max)
      if (vendor.average_rating) {
        const ratingScore = (vendor.average_rating / 5) * 20;
        score += ratingScore;
        details.rating = vendor.average_rating;
        details.rating_score = Math.round(ratingScore);
      }

      // 4. Response time score (10 points max)
      if (vendor.average_response_time) {
        // Lower response time = higher score
        if (vendor.average_response_time <= 10) score += 10;
        else if (vendor.average_response_time <= 20) score += 8;
        else if (vendor.average_response_time <= 30) score += 6;
        else if (vendor.average_response_time <= 45) score += 4;
        else score += 2;
        
        details.avg_response_time = vendor.average_response_time;
      }

      // 5. Completion rate (10 points max)
      if (vendor.completion_rate) {
        const completionScore = (vendor.completion_rate / 100) * 10;
        score += completionScore;
        details.completion_rate = vendor.completion_rate;
      }

      // 6. Vehicle type support bonus (5 points)
      if (call.vehicle_type && vendor.vehicle_types_supported?.includes(call.vehicle_type)) {
        score += 5;
        details.vehicle_type_match = true;
      }

      // 7. Workload balancing (-5 to +5 points)
      // Fewer active calls = bonus
      const activeCallsToday = vendor.total_calls_assigned || 0;
      if (activeCallsToday < 3) score += 5;
      else if (activeCallsToday < 5) score += 2;
      else if (activeCallsToday > 10) score -= 5;

      return {
        vendor,
        score: Math.round(score),
        details
      };
    });

    // Sort by score descending
    scoredVendors.sort((a, b) => b.score - a.score);

    // Get top recommendation
    const topRecommendation = scoredVendors[0];
    
    if (!topRecommendation) {
      return Response.json({ 
        success: false, 
        error: 'No suitable vendor found',
        recommendation: null 
      });
    }

    // Calculate estimated arrival time using OSRM routing API
    let estimatedMinutes = topRecommendation.details.distance_km
      ? Math.round(topRecommendation.details.distance_km * 2) + 10 // fallback: 2 min/km + 10 min buffer
      : 30;

    const topVendor = topRecommendation.vendor;
    if (topVendor.current_latitude && topVendor.current_longitude &&
        call.pickup_location_lat && call.pickup_location_lon) {
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/` +
          `${topVendor.current_longitude},${topVendor.current_latitude};` +
          `${call.pickup_location_lon},${call.pickup_location_lat}?overview=false`;

        const osrmResponse = await fetch(osrmUrl, {
          signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (osrmResponse.ok) {
          const osrmData = await osrmResponse.json();
          if (osrmData.code === 'Ok' && osrmData.routes?.[0]) {
            const durationSeconds = osrmData.routes[0].duration;
            const routeDistanceKm = osrmData.routes[0].distance / 1000;
            // OSRM duration + 5 min buffer for parking/finding customer
            estimatedMinutes = Math.round(durationSeconds / 60) + 5;
            topRecommendation.details.route_distance_km = Math.round(routeDistanceKm * 10) / 10;
            topRecommendation.details.eta_source = 'osrm';
          }
        }
      } catch (osrmError) {
        // OSRM failed - use fallback formula
        console.log('OSRM routing failed, using fallback ETA:', osrmError.message);
        topRecommendation.details.eta_source = 'fallback';
      }
    }

    // Create assignment attempt record
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const attempt = await base44.asServiceRole.entities.CallAssignmentAttempt.create({
      call_id,
      vendor_id: topRecommendation.vendor.id,
      status: 'pending',
      score: topRecommendation.score,
      distance_km: topRecommendation.details.distance_km,
      expires_at: expiresAt.toISOString()
    });

    return Response.json({
      success: true,
      recommendation: {
        vendor_id: topRecommendation.vendor.id,
        vendor_name: topRecommendation.vendor.vendor_name,
        vendor_phone: topRecommendation.vendor.phone,
        score: topRecommendation.score,
        details: topRecommendation.details,
        estimated_arrival_minutes: estimatedMinutes,
        attempt_id: attempt.id,
        expires_at: expiresAt.toISOString()
      },
      alternatives: scoredVendors.slice(1, 4).map(sv => ({
        vendor_id: sv.vendor.id,
        vendor_name: sv.vendor.vendor_name,
        score: sv.score,
        details: sv.details
      }))
    });

  } catch (error) {
    console.error('Auto-assign error:', error);
    return Response.json({ error: 'Failed to auto-assign vendor' }, { status: 500 });
  }
});

// Haversine formula for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}