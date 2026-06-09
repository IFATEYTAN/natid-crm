import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// A vendor's GPS streams roughly every 30s while the portal is open and in the
// foreground. Once the app is closed/backgrounded (or the phone is locked), the
// browser stops sending updates — so a marker on the map can become stale and
// must not be trusted as the vendor's real-time position. These thresholds let
// the UI flag that clearly to operators.
export const LOCATION_FRESH_MIN = 2; // under this many minutes: treated as live
export const LOCATION_STALE_MIN = 10; // at/over this many minutes: stale/offline

/**
 * Classify how fresh a vendor's last GPS update is.
 * @param {string|Date|null|undefined} lastUpdate - vendor.last_location_update
 * @returns {{ level: 'live'|'delayed'|'stale'|'none', isStale: boolean,
 *             minutesAgo: number|null, label: string, relative: string|null }}
 */
export function getLocationFreshness(lastUpdate) {
  if (!lastUpdate) {
    return {
      level: 'none',
      isStale: true,
      minutesAgo: null,
      label: 'אין מיקום עדכני',
      relative: null,
    };
  }
  const ts = new Date(lastUpdate).getTime();
  if (Number.isNaN(ts)) {
    return {
      level: 'none',
      isStale: true,
      minutesAgo: null,
      label: 'אין מיקום עדכני',
      relative: null,
    };
  }
  const minutesAgo = (Date.now() - ts) / 60000;
  const relative = formatDistanceToNow(new Date(ts), { addSuffix: true, locale: he });

  if (minutesAgo < LOCATION_FRESH_MIN) {
    return { level: 'live', isStale: false, minutesAgo, label: 'מיקום חי', relative };
  }
  if (minutesAgo < LOCATION_STALE_MIN) {
    return { level: 'delayed', isStale: false, minutesAgo, label: 'מתעדכן באיחור', relative };
  }
  return { level: 'stale', isStale: true, minutesAgo, label: 'מיקום לא עדכני', relative };
}
