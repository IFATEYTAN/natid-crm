import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { callId } = await req.json();

    if (!callId) {
      return Response.json({ error: 'Call ID is required' }, { status: 400 });
    }

    // Get call details
    const calls = await base44.asServiceRole.entities.Call.filter({ id: callId });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    
    const call = calls[0];

    // Get all active vendors with active contracts
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ 
      is_active: true,
      is_available_now: true 
    });

    if (vendors.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No available vendors found' 
      });
    }

    // Get vendor locations and contracts
    const [vendorLocations, vendorContracts] = await Promise.all([
      base44.asServiceRole.entities.VendorLocation.list('-created_date', 1000),
      base44.asServiceRole.entities.VendorContract.filter({ status: 'active' })
    ]);

    // Create location map
    const locationMap = {};
    vendorLocations.forEach(loc => {
      if (!locationMap[loc.vendor_id] || new Date(loc.created_date) > new Date(locationMap[loc.vendor_id].created_date)) {
        locationMap[loc.vendor_id] = loc;
      }
    });

    // Create contract map
    const contractMap = {};
    vendorContracts.forEach(contract => {
      contractMap[contract.vendor_id] = contract;
    });

    // Filter by service type and coverage area
    let suitableVendors = vendors.filter(v => {
      const providesService = v.service_type?.includes(mapIssueToService(call.issue_type));
      const coversArea = v.coverage_areas?.includes(call.pickup_location_area);
      return providesService && coversArea;
    });

    if (suitableVendors.length === 0) {
      suitableVendors = vendors.filter(v => 
        v.coverage_areas?.includes(call.pickup_location_area)
      );
    }

    if (suitableVendors.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No suitable vendors found for this area and service type' 
      });
    }

    // Advanced scoring algorithm
    const scoredVendors = suitableVendors.map(vendor => {
      let score = 0;
      const weights = {
        distance: 0.35,
        availability: 0.25,
        rating: 0.20,
        responseTime: 0.10,
        contract: 0.10
      };

      // 1. Distance score (0-100)
      let distanceScore = 50; // Default if no location
      const vendorLocation = locationMap[vendor.id];
      if (vendorLocation && call.pickup_location_lat && call.pickup_location_lon) {
        const distance = calculateDistance(
          vendorLocation.latitude,
          vendorLocation.longitude,
          call.pickup_location_lat,
          call.pickup_location_lon
        );
        // Score: closer is better (max 30km radius, linear decay)
        distanceScore = Math.max(0, 100 - (distance / 30) * 100);
        
        // Check if location is recent (last 15 minutes)
        const locationAge = (Date.now() - new Date(vendorLocation.created_date).getTime()) / 1000 / 60;
        if (locationAge > 15) {
          distanceScore *= 0.7; // Penalize old location data
        }
      }

      // 2. Availability score (0-100)
      let availabilityScore = 100;
      if (vendor.availability_status === 'busy') {
        availabilityScore = 30;
      } else if (vendor.availability_status === 'on_break') {
        availabilityScore = 10;
      } else if (vendor.availability_status === 'offline') {
        availabilityScore = 0;
      }

      // 3. Rating score (0-100)
      const ratingScore = (vendor.average_rating || 3) * 20;

      // 4. Response time score (0-100)
      const avgResponseTime = vendor.average_response_time || 30;
      const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 60) * 100);

      // 5. Contract score (0-100)
      let contractScore = 50;
      const contract = contractMap[vendor.id];
      if (contract) {
        contractScore = 100;
        // Bonus for per-call contracts
        if (contract.contract_type === 'per_call') {
          contractScore += 10;
        }
      }

      // Calculate weighted total score
      score = (
        distanceScore * weights.distance +
        availabilityScore * weights.availability +
        ratingScore * weights.rating +
        responseTimeScore * weights.responseTime +
        contractScore * weights.contract
      );

      return {
        vendor,
        score,
        details: {
          distanceScore: distanceScore.toFixed(1),
          availabilityScore,
          ratingScore: ratingScore.toFixed(1),
          responseTimeScore: responseTimeScore.toFixed(1),
          contractScore,
          distance: vendorLocation ? calculateDistance(
            vendorLocation.latitude,
            vendorLocation.longitude,
            call.pickup_location_lat,
            call.pickup_location_lon
          ).toFixed(1) : 'N/A'
        }
      };
    });

    // Sort by score (highest first)
    scoredVendors.sort((a, b) => b.score - a.score);

    const selectedVendor = scoredVendors[0].vendor;
    const scoringDetails = scoredVendors[0].details;

    // Assign vendor to call
    await base44.asServiceRole.entities.Call.update(callId, {
      assigned_vendor_id: selectedVendor.id,
      assigned_vendor_name: selectedVendor.vendor_name,
      call_status: 'assigning',
      assigned_at: new Date().toISOString()
    });

    // Log assignment with scoring details
    await base44.asServiceRole.entities.CallHistory.create({
      call_id: callId,
      call_number: call.call_number,
      change_type: 'vendor_assignment',
      new_value: selectedVendor.vendor_name,
      changed_by: 'System (Auto-Assignment)',
      notes: `שובץ אוטומטית - ציון: ${scoredVendors[0].score.toFixed(1)}, מרחק: ${scoringDetails.distance}km, דירוג: ${selectedVendor.average_rating || 'N/A'}`
    });

    // Send SMS to vendor
    try {
      await base44.functions.invoke('sendSMS', {
        phone: selectedVendor.phone,
        message: `קריאה חדשה ${call.call_number}: ${call.customer_name}, ${call.pickup_location_address}. ${call.issue_type}`,
        callId
      });
    } catch (smsError) {
      console.error('Failed to send SMS to vendor:', smsError);
    }

    return Response.json({ 
      success: true,
      vendor: {
        id: selectedVendor.id,
        name: selectedVendor.vendor_name,
        phone: selectedVendor.phone
      },
      score: scoredVendors[0].score.toFixed(1),
      scoringDetails,
      message: `Vendor assigned successfully: ${selectedVendor.vendor_name}`
    });

  } catch (error) {
    console.error('Auto-assign error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

// Helper function to map issue types to service types
function mapIssueToService(issueType) {
  const mapping = {
    'mechanical': 'mechanic',
    'stopped_driving': 'tow_truck',
    'flat_tire': 'tire_service',
    'stuck_wheel': 'tow_truck',
    'accident': 'tow_truck',
    'no_fuel': 'fuel_delivery',
    'dead_battery': 'mechanic',
    'locked_keys': 'locksmith'
  };
  return mapping[issueType] || 'tow_truck';
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}