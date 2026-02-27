import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update vendor location - called from vendor GPS tracker
 * Stores location history when vendor is on an active call
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only vendors (and admins for testing) can update vendor location
    if (!['admin', 'vendor'].includes(user.role)) {
      return Response.json({ error: 'Forbidden - vendor role required' }, { status: 403 });
    }

    const {
      vendor_id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      battery_level,
      call_id,
      call_number
    } = await req.json();

    if (!vendor_id || latitude === undefined || longitude === undefined) {
      return Response.json({ 
        error: 'vendor_id, latitude and longitude are required' 
      }, { status: 400 });
    }

    // Fetch vendor to verify and get name
    const vendors = await base44.entities.Vendor.filter({ id: vendor_id });
    if (vendors.length === 0) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }
    const vendor = vendors[0];

    // Ownership check: vendors can only update their own location
    if (user.role === 'vendor' && vendor.email !== user.email) {
      return Response.json({ error: 'Forbidden - can only update your own location' }, { status: 403 });
    }

    // Check if location sharing is enabled
    if (!vendor.is_location_sharing_enabled) {
      return Response.json({ 
        success: false, 
        message: 'Location sharing is disabled for this vendor' 
      });
    }

    // Update vendor's current location
    await base44.entities.Vendor.update(vendor_id, {
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_update: new Date().toISOString()
    });

    // Create location history record
    const locationRecord = await base44.asServiceRole.entities.VendorLocation.create({
      vendor_id,
      vendor_name: vendor.vendor_name,
      latitude,
      longitude,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      battery_level: battery_level || null,
      call_id: call_id || null,
      call_number: call_number || null,
      is_available: vendor.is_available_now,
      is_tracking_active: true
    });

    // If there's an active call, update its ETA based on new location
    if (call_id) {
      const calls = await base44.entities.Call.filter({ id: call_id });
      if (calls.length > 0) {
        const call = calls[0];
        
        // Calculate distance to pickup if we have coordinates
        if (call.pickup_location_lat && call.pickup_location_lon) {
          const distance = calculateDistance(
            latitude, 
            longitude, 
            call.pickup_location_lat, 
            call.pickup_location_lon
          );
          
          // Estimate arrival time (assume average speed of 40 km/h in city)
          const avgSpeedKmh = speed && speed > 5 ? speed : 40;
          const etaMinutes = Math.round((distance / avgSpeedKmh) * 60);
          const estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000);

          await base44.entities.Call.update(call_id, {
            estimated_distance_km: Math.round(distance * 10) / 10,
            estimated_arrival_time: estimatedArrival.toISOString()
          });
        }
      }
    }

    return Response.json({
      success: true,
      location_id: locationRecord.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update location error:', error);
    return Response.json({ error: 'Failed to update vendor location' }, { status: 500 });
  }
});

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}