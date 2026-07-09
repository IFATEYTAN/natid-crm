import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { resolveAppRole } from './_shared/appRole.ts';

/**
 * Update vendor location - called from vendor GPS tracker
 * Stores location history when vendor is on an active call
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.log('[updateVendorLocation] No user found - unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[updateVendorLocation] User:', user.email, 'Role:', user.role);

    const appRole = await resolveAppRole(base44, user);

    // Only vendors (and admins for testing) can update vendor location
    if (!['admin', 'vendor'].includes(appRole)) {
      console.log('[updateVendorLocation] Forbidden - role:', user.role);
      return Response.json({ error: 'Forbidden - vendor role required' }, { status: 403 });
    }

    const body = await req.json();
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
    } = body;

    console.log('[updateVendorLocation] Received:', JSON.stringify({
      vendor_id, latitude, longitude, accuracy, speed, heading, battery_level, call_id
    }));

    if (!vendor_id || latitude === undefined || longitude === undefined) {
      console.log('[updateVendorLocation] Missing required fields');
      return Response.json({ 
        error: 'vendor_id, latitude and longitude are required' 
      }, { status: 400 });
    }

    // Fetch vendor to verify - use service role to ensure we can read it
    let vendor;
    try {
      const vendors = await base44.asServiceRole.entities.Vendor.filter({ id: vendor_id });
      console.log('[updateVendorLocation] Vendor filter result count:', vendors.length);
      if (vendors.length === 0) {
        return Response.json({ error: 'Vendor not found' }, { status: 404 });
      }
      vendor = vendors[0];
    } catch (fetchErr) {
      console.error('[updateVendorLocation] Error fetching vendor:', fetchErr.message);
      return Response.json({ error: 'Error fetching vendor: ' + fetchErr.message }, { status: 500 });
    }

    console.log('[updateVendorLocation] Found vendor:', vendor.vendor_name, 'email:', vendor.email);

    // Ownership check: vendors can only update their own location
    if (appRole === 'vendor' && vendor.email !== user.email) {
      console.log('[updateVendorLocation] Ownership mismatch:', vendor.email, '!=', user.email);
      return Response.json({ error: 'Forbidden - can only update your own location' }, { status: 403 });
    }

    // Check if location sharing is enabled
    if (!vendor.is_location_sharing_enabled) {
      console.log('[updateVendorLocation] Location sharing disabled for vendor');
      return Response.json({ 
        success: false, 
        message: 'Location sharing is disabled for this vendor' 
      });
    }

    // Update vendor's current location
    try {
      await base44.asServiceRole.entities.Vendor.update(vendor_id, {
        current_latitude: latitude,
        current_longitude: longitude,
        last_location_update: new Date().toISOString()
      });
      console.log('[updateVendorLocation] Vendor location updated successfully');
    } catch (updateErr) {
      console.error('[updateVendorLocation] Error updating vendor:', updateErr.message);
      return Response.json({ error: 'Error updating vendor: ' + updateErr.message }, { status: 500 });
    }

    // Create location history record
    let locationRecord;
    try {
      locationRecord = await base44.asServiceRole.entities.VendorLocation.create({
        vendor_id,
        vendor_name: vendor.vendor_name,
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        battery_level: battery_level || null,
        call_id: call_id || null,
        is_available: vendor.is_available_now || false,
      });
      console.log('[updateVendorLocation] Location record created:', locationRecord.id);
    } catch (createErr) {
      console.error('[updateVendorLocation] Error creating location record:', createErr.message);
      // Don't fail the whole request if location history fails
    }

    // If there's an active call, update its ETA based on new location
    if (call_id) {
      try {
        const calls = await base44.asServiceRole.entities.Call.filter({ id: call_id });
        if (calls.length > 0) {
          const call = calls[0];
          
          if (call.pickup_location_lat && call.pickup_location_lon) {
            const distance = calculateDistance(
              latitude, longitude, 
              call.pickup_location_lat, call.pickup_location_lon
            );
            
            const avgSpeedKmh = speed && speed > 5 ? speed : 40;
            const etaMinutes = Math.round((distance / avgSpeedKmh) * 60);
            const estimatedArrival = new Date(Date.now() + etaMinutes * 60 * 1000);

            await base44.asServiceRole.entities.Call.update(call_id, {
              estimated_distance_km: Math.round(distance * 10) / 10,
              estimated_arrival_time: estimatedArrival.toISOString()
            });
            console.log('[updateVendorLocation] Call ETA updated, distance:', distance.toFixed(1), 'km');
          }
        }
      } catch (callErr) {
        console.error('[updateVendorLocation] Error updating call ETA:', callErr.message);
      }
    }

    return Response.json({
      success: true,
      location_id: locationRecord?.id || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[updateVendorLocation] Unhandled error:', error.message, error.stack);
    return Response.json({ error: 'Failed to update vendor location: ' + error.message }, { status: 500 });
  }
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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
// redeploy-marker v2
