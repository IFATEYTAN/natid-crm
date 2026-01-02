import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vendorId, latitude, longitude, accuracy, speed, heading, isAvailable } = await req.json();

    if (!vendorId || !latitude || !longitude) {
      return Response.json({ 
        error: 'Missing required fields: vendorId, latitude, longitude' 
      }, { status: 400 });
    }

    // Get vendor details
    const vendors = await base44.entities.Vendor.filter({ id: vendorId });
    const vendor = vendors[0];

    if (!vendor) {
      return Response.json({ error: 'Vendor not found' }, { status: 404 });
    }

    // Create location record
    await base44.entities.VendorLocation.create({
      vendor_id: vendorId,
      vendor_name: vendor.vendor_name,
      latitude,
      longitude,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      is_available: isAvailable !== undefined ? isAvailable : true
    });

    // Update vendor's current location and availability
    const updateData = {
      current_latitude: latitude,
      current_longitude: longitude,
      last_location_update: new Date().toISOString()
    };

    if (isAvailable !== undefined) {
      updateData.is_available_now = isAvailable;
      updateData.availability_status = isAvailable ? 'available' : 'busy';
    }

    await base44.entities.Vendor.update(vendorId, updateData);

    return Response.json({
      success: true,
      message: 'Location updated successfully',
      vendor: {
        id: vendorId,
        latitude,
        longitude,
        is_available: isAvailable
      }
    });

  } catch (error) {
    console.error('Update location error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});