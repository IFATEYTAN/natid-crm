import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Battery, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function VendorGPSTracker({
  vendorId,
  vendorProfile,
  activeCallId,
  activeCallNumber,
  onLocationUpdate,
  onError,
}) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  // Local state for location sharing — avoids race conditions with stale server data
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState(
    () => !!vendorProfile?.is_location_sharing_enabled
  );
  const initializedRef = useRef(false);
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  const latestPositionRef = useRef(null);
  const sendingRef = useRef(false);

  const MIN_SEND_INTERVAL_MS = 30000; // 30 seconds between server updates

  // Sync from prop ONLY on first load (when vendorProfile first arrives)
  useEffect(() => {
    if (!initializedRef.current && vendorProfile?.id) {
      initializedRef.current = true;
      setIsLocationSharingEnabled(!!vendorProfile.is_location_sharing_enabled);
    }
  }, [vendorProfile?.id, vendorProfile?.is_location_sharing_enabled]);

  // Debug logging (reduced to avoid spam)
  useEffect(() => {
    console.log('[GPS] State:', { vendorId, isLocationSharingEnabled, isTracking });
  }, [vendorId, isLocationSharingEnabled, isTracking]);

  // Get battery level if available (Battery API is deprecated in most browsers)
  useEffect(() => {
    let batteryRef = null;
    const handleLevelChange = () => {
      if (batteryRef) {
        setBatteryLevel(Math.round(batteryRef.level * 100));
      }
    };

    const initBattery = async () => {
      try {
        if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
          batteryRef = await navigator.getBattery();
          setBatteryLevel(Math.round(batteryRef.level * 100));
          batteryRef.addEventListener('levelchange', handleLevelChange);
        }
      } catch {
        // Battery API not supported or permission denied - silently ignore
      }
    };
    initBattery();

    return () => {
      if (batteryRef) {
        batteryRef.removeEventListener('levelchange', handleLevelChange);
      }
    };
  }, []);

  // Actually send location to server (no throttle check — caller must check)
  const doSendLocation = useCallback(
    async (position) => {
      if (!vendorId || sendingRef.current) return;

      sendingRef.current = true;
      try {
        const locationData = {
          vendor_id: vendorId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed ? position.coords.speed * 3.6 : null,
          heading: position.coords.heading,
          battery_level: batteryLevel,
          call_id: activeCallId || null,
          call_number: activeCallNumber || null,
        };

        console.log('[GPS] Sending location to server');
        const response = await base44.functions.invoke('updateVendorLocation', locationData);
        console.log('[GPS] Location sent successfully');

        lastSendTimeRef.current = Date.now();
        setLastUpdate(new Date());
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        if (onLocationUpdate) {
          onLocationUpdate(locationData);
        }
      } catch (error) {
        console.error('[GPS] Error sending location:', error?.response?.status, error?.message);
        if (error?.response?.status === 429) {
          lastSendTimeRef.current = Date.now() + 30000;
        }
        if (onError) {
          onError(error?.response?.data?.error || error.message);
        }
      } finally {
        sendingRef.current = false;
      }
    },
    [vendorId, batteryLevel, activeCallId, activeCallNumber, onLocationUpdate, onError]
  );

  // Throttled handler for watchPosition — updates local state always, sends to server only every 30s
  const handlePositionUpdate = useCallback(
    (position) => {
      // Always update local display
      latestPositionRef.current = position;
      setCurrentLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      // Only send to server if enough time has passed
      const now = Date.now();
      if (now - lastSendTimeRef.current >= MIN_SEND_INTERVAL_MS) {
        doSendLocation(position);
      }
    },
    [doSendLocation]
  );

  // Handle location error
  const handleLocationError = useCallback(
    (error) => {
      let errorMessage = 'שגיאה בקבלת מיקום';
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'גישה למיקום נדחתה. אנא אשר גישה בהגדרות הדפדפן.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'מידע מיקום לא זמין';
          break;
        case error.TIMEOUT:
          errorMessage = 'בקשת מיקום פגה';
          break;
      }
      setLocationError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    },
    [onError]
  );

  // Start tracking
  const startTracking = useCallback(() => {
    console.log('[GPS] startTracking called');
    if (!navigator.geolocation) {
      setLocationError('GPS לא נתמך בדפדפן זה');
      return;
    }

    setLocationError(null);
    lastSendTimeRef.current = 0;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('[GPS] getCurrentPosition SUCCESS');
        latestPositionRef.current = pos;
        doSendLocation(pos);
      },
      (err) => {
        console.error('[GPS] getCurrentPosition ERROR:', err.code, err.message);
        handleLocationError(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handlePositionUpdate(pos);
      },
      (err) => {
        console.error('[GPS] watchPosition ERROR:', err.code, err.message);
        handleLocationError(err);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    updateIntervalRef.current = setInterval(() => {
      if (latestPositionRef.current) {
        const now = Date.now();
        if (now - lastSendTimeRef.current >= MIN_SEND_INTERVAL_MS) {
          doSendLocation(latestPositionRef.current);
        }
      }
    }, MIN_SEND_INTERVAL_MS);

    setIsTracking(true);
  }, [doSendLocation, handlePositionUpdate, handleLocationError]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Auto-start/stop tracking based on local sharing state
  useEffect(() => {
    if (isLocationSharingEnabled && !isTracking) {
      startTracking();
    } else if (!isLocationSharingEnabled && isTracking) {
      stopTracking();
    }
    return () => {
      stopTracking();
    };
  }, [isLocationSharingEnabled]);

  // Toggle location sharing — update local state first, then persist to server
  const handleToggleLocationSharing = async (enabled) => {
    console.log('[GPS] Toggle location sharing:', enabled);
    // Update local state immediately to avoid race condition with server refetch
    setIsLocationSharingEnabled(enabled);
    try {
      await base44.entities.Vendor.update(vendorId, {
        is_location_sharing_enabled: enabled,
      });
    } catch (error) {
      console.error('Error toggling location sharing:', error);
      // Revert local state on error
      setIsLocationSharingEnabled(!enabled);
      if (onError) {
        onError('שגיאה בעדכון הגדרות מיקום');
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">מעקב מיקום</span>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="location-sharing" className="text-sm text-gray-600">
            שתף מיקום
          </Label>
          <Switch
            id="location-sharing"
            checked={isLocationSharingEnabled}
            onCheckedChange={handleToggleLocationSharing}
          />
        </div>
      </div>

      {isLocationSharingEnabled && (
        <div className="space-y-2">
          {/* Status indicators */}
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
                דיוק: {Math.round(currentLocation.accuracy)}מ'
              </Badge>
            )}
          </div>

          {/* Last update time */}
          {lastUpdate && (
            <p className="text-xs text-gray-500">
              עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
            </p>
          )}

          {/* Active call indicator */}
          {activeCallId && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm">
              <span className="text-blue-700">
                📍 מיקום נשמר להיסטוריית קריאה {activeCallNumber}
              </span>
            </div>
          )}

          {/* Error message */}
          {locationError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-md">
              <AlertCircle className="w-4 h-4" />
              {locationError}
            </div>
          )}
        </div>
      )}

      {!isLocationSharingEnabled && (
        <p className="text-sm text-gray-500">
          הפעל שיתוף מיקום כדי לאפשר למנהלים לעקוב אחר מיקומך בזמן אמת
        </p>
      )}
    </div>
  );
}