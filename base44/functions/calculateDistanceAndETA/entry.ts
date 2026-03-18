import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createRateLimiter, rateLimitResponse } from './_shared/rateLimit.ts';

const kv = await Deno.openKv();
const limiter = createRateLimiter(kv);
const DAILY_MAPS_QUOTA = 20_000;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify caller is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 30 requests per user per minute
    const rl = await limiter.check('maps', user.id, 30, 60_000);
    if (!rl.allowed) return rateLimitResponse(rl.resetAt);

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

    // If API key exists, use Google Maps Directions API with caching
    if (apiKey) {
      // Round coordinates to ~100m precision for cache key
      const cacheKey = [
        'maps_cache',
        `${vendorLocation.latitude.toFixed(3)},${vendorLocation.longitude.toFixed(3)}`,
        `${call.pickup_location_lat.toFixed(3)},${call.pickup_location_lon.toFixed(3)}`,
      ];

      // Check cache first
      const cached = await kv.get<{ roadDistance: number; duration: number }>(cacheKey);
      if (cached.value) {
        roadDistance = cached.value.roadDistance;
        duration = cached.value.duration;
      } else {
        // Check daily quota before calling API
        const dailyCount = await limiter.getDailyCount('google_maps');
        if (dailyCount >= DAILY_MAPS_QUOTA) {
          console.warn(`Google Maps daily quota reached: ${dailyCount}/${DAILY_MAPS_QUOTA}`);
          // Fall through to Haversine calculation
        } else {
          try {
            const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${vendorLocation.latitude},${vendorLocation.longitude}&destination=${call.pickup_location_lat},${call.pickup_location_lon}&key=${apiKey}`;

            const response = await fetch(directionsUrl);
            const data = await response.json();
            await limiter.incrementDaily('google_maps');

            if (data.status === 'OK' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const leg = route.legs[0];

              roadDistance = leg.distance.value / 1000;
              duration = Math.round(leg.duration.value / 60);

              // Cache the result
              await kv.set(cacheKey, { roadDistance, duration }, { expireIn: CACHE_TTL_MS });
            } else if (data.status === 'OVER_QUERY_LIMIT') {
              console.error('Google Maps OVER_QUERY_LIMIT - falling back to Haversine');
            }
          } catch (apiError) {
            console.error('Google Maps API error:', apiError);
            // Continue with straight-line calculation
          }
        }
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