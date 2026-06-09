/**
 * Lightweight client-side geocoding for Israeli addresses via OpenStreetMap
 * Nominatim. Turns a city + street address into { lat, lon } so calls carry
 * real coordinates — which the location-based vendor auto-assignment
 * (autoAssignVendor) and the live-ETA logic depend on.
 *
 * Design notes:
 * - Never throws. Callers treat `null` as "no coordinates available" and keep
 *   the existing behaviour (save the call without coords).
 * - Scoped to Israel (countrycodes=il) and Hebrew results.
 * - Results are cached in-memory per query for the session to avoid hammering
 *   the public Nominatim endpoint (which asks for light, throttled usage).
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const cache = new Map();

/**
 * @param {{ city?: string, address?: string }} parts
 * @returns {Promise<{ lat: number, lon: number } | null>}
 */
export async function geocodeIsraeliAddress({ city, address } = {}) {
  const query = [address, city]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ');

  if (!query) return null;
  if (cache.has(query)) return cache.get(query);

  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      countrycodes: 'il',
      limit: '1',
      'accept-language': 'he',
    });

    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;

    if (!hit?.lat || !hit?.lon) {
      cache.set(query, null);
      return null;
    }

    const result = { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) };
    cache.set(query, result);
    return result;
  } catch {
    // Network error / timeout / blocked — non-blocking, just no coords.
    return null;
  }
}
