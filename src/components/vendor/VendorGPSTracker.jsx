import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Battery, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const MIN_SEND_INTERVAL_MS = 30000;

export default function VendorGPSTracker({
  vendorId,
  vendorProfile,
  activeCallId,
  activeCallNumber,
  onLocationUpdate,
  onError,
}) {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isTracking, setIsTracking] = useState(false);

  // Local toggle state — only set from prop once on mount, then fully local
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const initDoneRef = useRef(false);

  // One-time init from prop
  useEffect(() => {
    if (!initDoneRef.current && vendorId) {
      initDoneRef.current = true;
      setSharingEnabled(!!vendorProfile?.is_location_sharing_enabled);
    }
  }, [vendorId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refs for mutable values used inside geolocation callbacks
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const lastSendRef = useRef(0);
  const latestPosRef = useRef(null);
  const sendingRef = useRef(false);
  const vendorIdRef = useRef(vendorId);
  const activeCallRef = useRef({ id: activeCallId, number: activeCallNumber });
  const batteryRef = useRef(batteryLevel);
  const callbacksRef = useRef({ onLocationUpdate, onError });

  useEffect(() => { vendorIdRef.current = vendorId; }, [vendorId]);
  useEffect(() => { activeCallRef.current = { id: activeCallId, number: activeCallNumber }; }, [activeCallId, activeCallNumber]);
  useEffect(() => { batteryRef.current = batteryLevel; }, [batteryLevel]);
  useEffect(() => { callbacksRef.current = { onLocationUpdate, onError }; }, [onLocationUpdate, onError]);

  // Battery
  useEffect(() => {
    let bat = null;
    const onChange = () => { if (bat) setBatteryLevel(Math.round(bat.level * 100)); };
    (async () => {
      if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
        bat = await navigator.getBattery();
        setBatteryLevel(Math.round(bat.level * 100));
        bat.addEventListener('levelchange', onChange);
      }
    })();
    return () => { if (bat) bat.removeEventListener('levelchange', onChange); };
  }, []);

  // Send location to server — plain function using refs only
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
        call_id: activeCallRef.current.id || null,
        call_number: activeCallRef.current.number || null,
      };
      await base44.functions.invoke('updateVendorLocation', data);
      lastSendRef.current = Date.now();
      setLastUpdate(new Date());
      setCurrentLocation({ lat: data.latitude, lng: data.longitude, accuracy: data.accuracy });
      callbacksRef.current.onLocationUpdate?.(data);
    } catch (error) {
      if (error?.response?.status === 429) lastSendRef.current = Date.now() + 30000;
      callbacksRef.current.onError?.(error?.response?.data?.error || error.message);
    } finally {
      sendingRef.current = false;
    }
  };

  const onPosition = (pos) => {
    latestPosRef.current = pos;
    setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
    if (Date.now() - lastSendRef.current >= MIN_SEND_INTERVAL_MS) {
      sendLocation(pos);
    }
  };

  const onPosError = (err) => {
    const msgs = { 1: 'גישה למיקום נדחתה. אנא אשר גישה בהגדרות הדפדפן.', 2: 'מידע מיקום לא זמין', 3: 'בקשת מיקום פגה' };
    const msg = msgs[err.code] || 'שגיאה בקבלת מיקום';
    setLocationError(msg);
    callbacksRef.current.onError?.(msg);
  };

  // Cleanup helper (doesn't touch state — avoids triggering re-renders)
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

  // Single effect: start/stop based on sharingEnabled
  useEffect(() => {
    if (!sharingEnabled) {
      cleanupGeo();
      setIsTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('GPS לא נתמך בדפדפן זה');
      return;
    }

    setLocationError(null);
    lastSendRef.current = 0;

    navigator.geolocation.getCurrentPosition(
      (pos) => { latestPosRef.current = pos; sendLocation(pos); },
      onPosError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition, onPosError,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    intervalRef.current = setInterval(() => {
      if (latestPosRef.current && Date.now() - lastSendRef.current >= MIN_SEND_INTERVAL_MS) {
        sendLocation(latestPosRef.current);
      }
    }, MIN_SEND_INTERVAL_MS);

    setIsTracking(true);

    return () => {
      cleanupGeo();
      // NOTE: Do NOT call setIsTracking(false) here — that would cause a state
      // change after unmount or trigger a re-render loop if cleanup runs during
      // the same render cycle.
    };
  }, [sharingEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle handler
  const handleToggle = async (enabled) => {
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
          <Label htmlFor="gps-location-sharing" className="text-sm text-gray-600">שתף מיקום</Label>
          <Switch id="gps-location-sharing" checked={sharingEnabled} onCheckedChange={handleToggle} />
        </div>
      </div>

      {sharingEnabled ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={cn('gap-1', isTracking ? 'text-green-600 border-green-200 bg-green-50' : 'text-gray-500')}>
              {isTracking ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isTracking ? 'מעקב פעיל' : 'לא פעיל'}
            </Badge>
            {batteryLevel !== null && (
              <Badge variant="outline" className="gap-1"><Battery className="w-3 h-3" />{batteryLevel}%</Badge>
            )}
            {currentLocation && (
              <Badge variant="outline" className="gap-1 text-blue-600 border-blue-200 bg-blue-50">
                <Navigation className="w-3 h-3" />דיוק: {Math.round(currentLocation.accuracy)}מ'
              </Badge>
            )}
          </div>
          {lastUpdate && <p className="text-xs text-gray-500">עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}</p>}
          {activeCallId && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm">
              <span className="text-blue-700">📍 מיקום נשמר להיסטוריית קריאה {activeCallNumber}</span>
            </div>
          )}
          {locationError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-md">
              <AlertCircle className="w-4 h-4" />{locationError}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">הפעל שיתוף מיקום כדי לאפשר למנהלים לעקוב אחר מיקומך בזמן אמת</p>
      )}
    </div>
  );
}