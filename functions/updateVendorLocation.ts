import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update vendor's GPS location
 * Called by vendor's mobile device periodically
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      vendor_id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      battery_level
    } = await req.json();

    if (!vendor_id || latitude === undefined || longitude === undefined) {
      return Response.json({ 
        error: 'Missing required fields: vendor_id, latitude, longitude' 
      }, { status: 400 });
    }

    // Reverse geocode to get address (using free API)
    let address = '';
    try {
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=he`
      );
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        address = geocodeData.display_name || '';
      }
    } catch (e) {
      console.log('Geocode error:', e);
    }

    // Create location record
    const locationRecord = await base44.asServiceRole.entities.VendorLocation.create({
      vendor_id,
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      address,
      battery_level,
      is_available: true
    });

    // Update vendor's current location
    await base44.asServiceRole.entities.Vendor.update(vendor_id, {
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_update: new Date().toISOString()
    });

    return Response.json({
      success: true,
      location_id: locationRecord.id,
      address
    });

  } catch (error) {
    console.error('Location update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});