/**
 * Distance Matrix Service
 * Calculates distances and travel times between multiple origins and destinations
 * Uses OSRM (free) with optional Google Maps API fallback
 */

// Haversine formula for straight-line distance
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate distance and duration using OSRM Table API
async function osrmDistanceMatrix(origins, destinations) {
  const results = [];

  // OSRM Table API can handle multiple points
  // Format: /table/v1/driving/lon1,lat1;lon2,lat2;...
  const allPoints = [...origins, ...destinations];
  const coords = allPoints.map(p => `${p.longitude},${p.latitude}`).join(';');

  // Specify which are sources and which are destinations
  const sources = origins.map((_, i) => i).join(';');
  const destIndices = destinations.map((_, i) => origins.length + i).join(';');

  try {
    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${sources}&destinations=${destIndices}&annotations=distance,duration`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.code !== 'Ok') {
      throw new Error('OSRM request failed');
    }

    // Parse results into matrix format
    for (let i = 0; i < origins.length; i++) {
      for (let j = 0; j < destinations.length; j++) {
        results.push({
          origin: origins[i],
          destination: destinations[j],
          distance: data.distances[i][j] / 1000, // Convert to km
          duration: Math.round(data.durations[i][j] / 60), // Convert to minutes
          source: 'osrm'
        });
      }
    }

    return results;
  } catch (error) {
    console.error('OSRM distance matrix error:', error);
    // Fallback to individual route calculations
    return fallbackDistanceMatrix(origins, destinations);
  }
}

// Fallback: Calculate distances one by one
async function fallbackDistanceMatrix(origins, destinations) {
  const results = [];

  for (const origin of origins) {
    for (const destination of destinations) {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=false`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes?.[0]) {
          results.push({
            origin,
            destination,
            distance: data.routes[0].distance / 1000,
            duration: Math.round(data.routes[0].duration / 60),
            source: 'osrm-route'
          });
        } else {
          // Use haversine as last resort
          results.push({
            origin,
            destination,
            distance: haversineDistance(
              origin.latitude, origin.longitude,
              destination.latitude, destination.longitude
            ),
            duration: Math.round(haversineDistance(
              origin.latitude, origin.longitude,
              destination.latitude, destination.longitude
            ) / 50 * 60), // Assume 50 km/h average
            source: 'haversine'
          });
        }
      } catch {
        // Use haversine
        results.push({
          origin,
          destination,
          distance: haversineDistance(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
          ),
          duration: Math.round(haversineDistance(
            origin.latitude, origin.longitude,
            destination.latitude, destination.longitude
          ) / 50 * 60),
          source: 'haversine'
        });
      }
    }
  }

  return results;
}

/**
 * Calculate distance matrix between origins and destinations
 * @param {Array<{latitude: number, longitude: number, id?: string}>} origins
 * @param {Array<{latitude: number, longitude: number, id?: string}>} destinations
 * @returns {Promise<Array<{origin, destination, distance, duration, source}>>}
 */
export async function calculateDistanceMatrix(origins, destinations) {
  if (!origins?.length || !destinations?.length) {
    return [];
  }

  return osrmDistanceMatrix(origins, destinations);
}

/**
 * Find the nearest destination from an origin
 * @param {Object} origin - {latitude, longitude}
 * @param {Array} destinations - Array of {latitude, longitude, ...}
 * @returns {Promise<{destination, distance, duration}>}
 */
export async function findNearestDestination(origin, destinations) {
  if (!destinations?.length) return null;

  const matrix = await calculateDistanceMatrix([origin], destinations);

  let nearest = null;
  let minDistance = Infinity;

  for (const result of matrix) {
    if (result.distance < minDistance) {
      minDistance = result.distance;
      nearest = result;
    }
  }

  return nearest;
}

/**
 * Find the nearest vendor for a call
 * @param {Object} callLocation - {latitude, longitude}
 * @param {Array} vendors - Array of vendor objects with location data
 * @returns {Promise<Array>} - Sorted array of vendors with distance/duration
 */
export async function findNearestVendors(callLocation, vendors) {
  if (!vendors?.length) return [];

  const vendorLocations = vendors
    .filter(v => v.latitude && v.longitude)
    .map(v => ({
      ...v,
      latitude: v.latitude,
      longitude: v.longitude
    }));

  if (!vendorLocations.length) return [];

  const matrix = await calculateDistanceMatrix(vendorLocations, [callLocation]);

  // Merge distance data with vendor data
  const vendorsWithDistance = vendorLocations.map(vendor => {
    const distanceData = matrix.find(m =>
      m.origin.latitude === vendor.latitude &&
      m.origin.longitude === vendor.longitude
    );

    return {
      ...vendor,
      distance: distanceData?.distance || null,
      duration: distanceData?.duration || null,
      distanceSource: distanceData?.source || null
    };
  });

  // Sort by distance
  return vendorsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
}

/**
 * Calculate optimal route visiting multiple stops
 * Uses nearest neighbor algorithm for simplicity
 * @param {Object} start - Starting location
 * @param {Array} stops - Array of stops to visit
 * @param {Object} end - Optional end location (defaults to start)
 * @returns {Promise<{route: Array, totalDistance: number, totalDuration: number}>}
 */
export async function calculateOptimalRoute(start, stops, end = null) {
  if (!stops?.length) {
    return { route: [], totalDistance: 0, totalDuration: 0 };
  }

  const unvisited = [...stops];
  const route = [];
  let current = start;
  let totalDistance = 0;
  let totalDuration = 0;

  // Nearest neighbor algorithm
  while (unvisited.length > 0) {
    const nearest = await findNearestDestination(current, unvisited);

    if (!nearest) break;

    route.push({
      ...nearest.destination,
      distanceFromPrevious: nearest.distance,
      durationFromPrevious: nearest.duration
    });

    totalDistance += nearest.distance;
    totalDuration += nearest.duration;

    // Remove from unvisited
    const index = unvisited.findIndex(s =>
      s.latitude === nearest.destination.latitude &&
      s.longitude === nearest.destination.longitude
    );
    if (index > -1) unvisited.splice(index, 1);

    current = nearest.destination;
  }

  // Add return to end (if specified)
  if (end) {
    const returnMatrix = await calculateDistanceMatrix([current], [end]);
    if (returnMatrix[0]) {
      totalDistance += returnMatrix[0].distance;
      totalDuration += returnMatrix[0].duration;
    }
  }

  return {
    route,
    totalDistance: Math.round(totalDistance * 10) / 10,
    totalDuration: Math.round(totalDuration)
  };
}

/**
 * Hook for using distance matrix calculations
 */
export function useDistanceMatrix() {
  return {
    calculateMatrix: calculateDistanceMatrix,
    findNearest: findNearestDestination,
    findNearestVendors,
    calculateOptimalRoute,
    haversineDistance
  };
}

export default {
  calculateDistanceMatrix,
  findNearestDestination,
  findNearestVendors,
  calculateOptimalRoute,
  haversineDistance,
  useDistanceMatrix
};
