import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/ui/FeedbackToast';

export default function VendorGPSTracker({ vendorId, vendorName, isAvailable, onLocationUpdate }) {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastPositionRef = useRef(null);

  useEffect(() => {
    if (!vendorId) return;

    const updateLocation = async (position) => {
      const { latitude, longitude, accuracy, speed, heading } = position.coords;
      
      lastPositionRef.current = { latitude, longitude, accuracy, speed, heading };
      setLastUpdate(new Date());
      setLocationError(null);

      // Update VendorLocation entity
      try {
        await base44.entities.VendorLocation.create({
          vendor_id: vendorId,
          vendor_name: vendorName,
          latitude,
          longitude,
          accuracy,
          speed: speed || 0,
          heading: heading || 0,
          is_available: isAvailable
        });

        // Also update Vendor entity with current location
        await base44.entities.Vendor.update(vendorId, {
          current_latitude: latitude,
          current_longitude: longitude,
          last_location_update: new Date().toISOString()
        });

        if (onLocationUpdate) {
          onLocationUpdate({ latitude, longitude, accuracy });
        }
      } catch (e) {
        console.error('Failed to update location:', e);
      }
    };

    const handleError = (error) => {
      console.error('Geolocation error:', error);
      setLocationError(error.message);
      
      if (error.code === 1) {
        showToast.error('יש לאשר הרשאות מיקום כדי לקבל קריאות');
      }
    };

    if (isAvailable) {
      // Start watching position
      if (navigator.geolocation) {
        // Get initial position
        navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });

        // Watch position changes
        watchIdRef.current = navigator.geolocation.watchPosition(
          updateLocation,
          handleError,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );

        // Also update every 60 seconds even if position hasn't changed
        updateIntervalRef.current = setInterval(() => {
          if (lastPositionRef.current) {
            updateLocation({ coords: lastPositionRef.current });
          }
        }, 60000);
      } else {
        setLocationError('הדפדפן לא תומך בשירותי מיקום');
      }
    } else {
      // Stop watching when unavailable
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [vendorId, vendorName, isAvailable, onLocationUpdate]);

  return { lastUpdate, locationError };
}