import { Capacitor, registerPlugin } from '@capacitor/core';
import { base44 } from '@/api/base44Client';

/**
 * Native background-location bridge (Level 2 of the live-tracking plan).
 *
 * The @capacitor-community/background-geolocation plugin is native-only — it is
 * accessed through Capacitor's bridge via registerPlugin, so the web bundle
 * never imports plugin JS and `npm run build` stays green. On the web,
 * isNativeTrackingAvailable() is false and every call here is a no-op, leaving
 * the existing browser geolocation path untouched.
 *
 * On a native build (after `npx cap add ios/android` + device run) this keeps
 * streaming the vendor's location even with the screen locked, feeding the same
 * existing `updateVendorLocation` endpoint — no server/data changes.
 *
 * See docs/LIVE_TRACKING_CAPACITOR_PLAN.md.
 */

const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

let watcherId = null;

export function isNativeTrackingAvailable() {
  return Capacitor.isNativePlatform();
}

export async function startBackgroundLocation(vendorId, { callId = null } = {}) {
  if (!vendorId || watcherId || !Capacitor.isNativePlatform()) return false;
  try {
    watcherId = await BackgroundGeolocation.addWatcher(
      {
        requestPermissions: true,
        stale: false,
        distanceFilter: 50,
        backgroundTitle: 'NatID',
        backgroundMessage: 'שיתוף מיקום פעיל בזמן קריאה',
      },
      (location, error) => {
        if (error || !location) return;
        base44.functions
          .invoke('updateVendorLocation', {
            vendor_id: vendorId,
            call_id: callId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            // plugin reports speed in m/s; our schema expects km/h
            speed: location.speed != null && location.speed >= 0 ? location.speed * 3.6 : null,
            heading: location.bearing,
            battery_level: null,
          })
          .catch(() => {});
      }
    );
    return true;
  } catch {
    watcherId = null;
    return false;
  }
}

export async function stopBackgroundLocation() {
  if (!watcherId) return;
  try {
    await BackgroundGeolocation.removeWatcher({ id: watcherId });
  } catch {
    // ignore — already removed or platform unsupported
  }
  watcherId = null;
}
