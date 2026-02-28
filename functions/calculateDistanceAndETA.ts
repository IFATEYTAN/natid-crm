import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify caller is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId, vendorId } = await req.json();

    if (!callId || !vendorId) {
      return Response.json({ error: 'Call ID and Vendor ID are required' }, { status: 400 });
    }

    // Get call details
    const calls = await base44.entities.Call.filter({ id: callId });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }
    const call = calls[0];

    // Get vendor location
    const vendorLocations = await base44.entities.VendorLocation.filter({ vendor_id: vendorId }, '-created_date', 1);
    if (!vendorLocations || vendorLocations.length === 0) {
      return Response.json({ error: 'Vendor location not found' }, { status: 404 });
    }
    const vendorLocation = vendorLocations[0];

    // Calculate straight-line distance (Haversine)
    const straightDistance = calculateDistance(
      vendorLocation.latitude,
      vendorLocation.longitude,
      call.pickup_location_lat,
      call.pickup_location_lon
    );

    // Get Google Maps API key
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    
    let roadDistance = straightDistance;
    let duration = Math.round((straightDistance / 60) * 60); // Assume 60 km/h
    let navigationUrl = `https://www.google.com/maps/dir/?api=1&origin=${vendorLocation.latitude},${vendorLocation.longitude}&destination=${call.pickup_location_lat},${call.pickup_location_lon}`;

    // If API key exists, use Google Maps Directions API
    if (apiKey) {
      try {
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLocation.latitude},${vendorLocation.longitude}&destination=${call.pickup_location_lat},${call.pickup_location_lon}&key=${apiKey}`;
        
        const response = await fetch(directionsUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs[0];
          
          roadDistance = leg.distance.value / 1000; // Convert to km
          duration = Math.round(leg.duration.value / 60); // Convert to minutes
        }
      } catch (apiError) {
        console.error('Google Maps API error:', apiError);
        // Continue with straight-line calculation
      }
    }

    // Calculate ETA
    const eta = new Date(Date.now() + duration * 60 * 1000).toISOString();

    // Update call with distance and ETA
    await base44.entities.Call.update(callId, {
      estimated_distance_km: roadDistance,
      estimated_arrival_time: eta
    });

    return Response.json({
      success: true,
      straightDistance: straightDistance.toFixed(2),
      roadDistance: roadDistance.toFixed(2),
      duration,
      eta,
      navigationUrl,
      vendorLocation: {
        lat: vendorLocation.latitude,
        lon: vendorLocation.longitude
      },
      callLocation: {
        lat: call.pickup_location_lat,
        lon: call.pickup_location_lon
      }
    });

  } catch (error) {
    console.error('Calculate distance error:', error);
    return Response.json({
      error: 'Failed to calculate distance'
    }, { status: 500 });
  }
});

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
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}