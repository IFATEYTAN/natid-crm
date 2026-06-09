import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Battery, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import {
  isNativeTrackingAvailable,
  startBackgroundLocation,
  stopBackgroundLocation,
} from '@/services/backgroundLocation';

const MIN_SEND_INTERVAL_MS = 30000;
const GPS_VERSION = 'v7-clean';

/**
 * GPS Tracker component for vendors.
 * Props:
 *   vendorId (string)                — stable vendor ID (primitive)
 *   initialSharingEnabled (boolean)  — initial value from DB; only read on first mount
 */
export default function VendorGPSTracker({ vendorId, initialSharingEnabled }) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(!!initialSharingEnabled);

  // Log version ONCE on mount to confirm new code is loaded
  useEffect(() => {
    console.log('[GPS-TRACKER]', GPS_VERSION, 'mounted, vendorId:', vendorId);
  }, []);

  // Refs for mutable values used inside geolocation callbacks
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastSendRef = useRef(0);
  const latestPosRef = useRef(null);
  const sendingRef = useRef(false);
  const vendorIdRef = useRef(vendorId);
  const batteryRef = useRef(batteryLevel);
  const userToggledRef = useRef(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    vendorIdRef.current = vendorId;
  }, [vendorId]);
  useEffect(() => {
    batteryRef.current = batteryLevel;
  }, [batteryLevel]);

  // Battery
  useEffect(() => {
    let bat = null;
    const onChange = () => {
      if (bat) setBatteryLevel(Math.round(bat.level * 100));
    };
    (async () => {
      if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
        bat = await navigator.getBattery();
        setBatteryLevel(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', onChange);
      }
    })();
    return () => {
      if (bat) bat.removeEventListener('levelchange', onChange);
    };
  }, []);

  // Keep the screen awake while actively tracking. Mobile browsers suspend
  // geolocation once the screen locks, so holding a screen wake lock keeps GPS
  // streaming during a job (as long as the app stays in the foreground). Wake
  // locks auto-release when the tab is hidden, so we re-acquire on visibility.
  useEffect(() => {
    let cancelled = false;

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
        lock.addEventListener('release', () => {
          if (wakeLockRef.current === lock) wakeLockRef.current = null;
        });
      } catch {
        // Non-fatal: denied or not allowed while backgrounded.
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isTracking) requestWakeLock();
    };

    if (isTracking) {
      requestWakeLock();
      document.addEventListener('visibilitychange', onVisibility);
    } else {
      releaseWakeLock();
    }

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      releaseWakeLock();
    };
  }, [isTracking]);

  // Send location — uses refs only, no state deps
  const sendLocation = async (position) => {
    if (!vendorIdRef.current || sendingRef.current) return;
    sendingRef.current = true;
    try {
      const data = {
        vendor_id: vendorIdRef.current,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed ? position.coords.speed * 3.6 : null,
        heading: position.coords.heading,
        battery_level: batteryRef.current,
      };
      await base44.functions.invoke('updateVendorLocation', data);
      lastSendRef.current = Date.now();
      setLastUpdate(new Date());
      setCurrentLocation({ lat: data.latitude, lng: data.longitude, accuracy: data.accuracy });
    } catch (error) {
      if (error?.response?.status === 429) lastSendRef.current = Date.now() + 30000;
    } finally {
      sendingRef.current = false;
    }
  };

  const onPosition = (pos) => {
    latestPosRef.current = pos;
    setCurrentLocation({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
    if (Date.now() - lastSendRef.current >= MIN_SEND_INTERVAL_MS) {
      sendLocation(pos);
    }
  };

  const onPosError = (err) => {
    const msgs = {
      1: 'גישה למיקום נדחתה. אנא אשר גישה בהגדרות הדפדפן.',
      2: 'מידע מיקום לא זמין',
      3: 'בקשת מיקום פגה',
    };
    setLocationError(msgs[err.code] || 'שגיאה בקבלת מיקום');
  };

  const cleanupGeo = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Explicitly request permission — useful on mobile browsers that block silent requests
  const requestPermission = async () => {
    setLocationError(null);
    try {
      // This triggers the browser permission prompt
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
      });
      latestPosRef.current = pos;
      sendLocation(pos);
      // If permission granted, enable sharing
      if (!sharingEnabled) {
        handleToggle(true);
      } else {
        cleanupGeo();
        watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onPosError, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 5000,
        });
        intervalRef.current = setInterval(() => {
          if (latestPosRef.current && Date.now() - lastSendRef.current >= MIN_SEND_INTERVAL_MS) {
            sendLocation(latestPosRef.current);
          }
        }, MIN_SEND_INTERVAL_MS);
        setIsTracking(true);
      }
    } catch (err) {
      onPosError(err);
    }
  };

  // Single effect: start/stop based on sharingEnabled ONLY
  useEffect(() => {
    const wasToggled = userToggledRef.current;
    userToggledRef.current = false;

    if (!sharingEnabled) {
      cleanupGeo();
      setIsTracking(false);
      return;
    }

    // On native (Capacitor) the OS background-location plugin handles tracking
    // — including with the screen locked — via the effect below, so skip the
    // browser geolocation watch here to avoid duplicate streams.
    if (isNativeTrackingAvailable()) {
      setIsTracking(true);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('GPS לא נתמך בדפדפן זה');
      return;
    }

    const startTracking = () => {
      setLocationError(null);
      lastSendRef.current = 0;
      setIsTracking(true);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          latestPosRef.current = pos;
          sendLocation(pos);
        },
        onPosError,
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );

      watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onPosError, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      });

      intervalRef.current = setInterval(() => {
        if (latestPosRef.current && Date.now() - lastSendRef.current >= MIN_SEND_INTERVAL_MS) {
          sendLocation(latestPosRef.current);
        }
      }, MIN_SEND_INTERVAL_MS);
    };

    if (wasToggled) {
      startTracking();
    } else {
      startTracking();
    }

    return () => {
      cleanupGeo();
    };
  }, [sharingEnabled]);

  // Native (Capacitor) background tracking — runs only on a native build and is
  // a no-op on the web. Streams location to the same updateVendorLocation
  // endpoint even while the app is backgrounded / the screen is locked.
  useEffect(() => {
    if (!isNativeTrackingAvailable()) return undefined;
    if (sharingEnabled && vendorId) {
      startBackgroundLocation(vendorId);
    } else {
      stopBackgroundLocation();
    }
    return () => {
      stopBackgroundLocation();
    };
  }, [sharingEnabled, vendorId]);

  // Toggle handler — local state + persist to server
  const handleToggle = async (enabled) => {
    userToggledRef.current = true;
    setSharingEnabled(enabled);
    try {
      await base44.entities.Vendor.update(vendorId, { is_location_sharing_enabled: enabled });
    } catch {
      setSharingEnabled(!enabled);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">מעקב מיקום</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="gps-sharing-toggle" className="text-sm text-gray-600">
            שתף מיקום
          </Label>
          <Switch id="gps-sharing-toggle" checked={sharingEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {sharingEnabled ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                'gap-1',
                isTracking ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-500'
              )}
            >
              {isTracking ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isTracking ? 'מעקב פעיל' : 'לא פעיל'}
            </Badge>
            {batteryLevel !== null && (
              <Badge variant="outline" className="gap-1">
                <Battery className="w-3 h-3" />
                {batteryLevel}%
              </Badge>
            )}
            {currentLocation && (
              <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50">
                <Navigation className="w-3 h-3" />
                דיוק: {Math.round(currentLocation.accuracy)}מ׳
              </Badge>
            )}
          </div>
          {lastUpdate && (
            <p className="text-xs text-gray-500">
              עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
            </p>
          )}
          {/* Until a location is actually obtained, show an explicit permission button.
              Mobile browsers (iOS Safari / Chrome) block silent geolocation requests that
              don't originate from a user gesture, so the on-mount auto-request often shows
              no prompt at all. A user-initiated tap is the reliable way to trigger the
              browser's location permission dialog. */}
          {!currentLocation && (
            <button
              onClick={requestPermission}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <MapPin className="w-4 h-4" />
              אשר גישה למיקום
            </button>
          )}
          {locationError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {locationError}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          הפעל שיתוף מיקום כדי לאפשר למנהלים לעקוב אחר מיקומך בזמן אמת
        </p>
      )}
    </div>
  );
}
