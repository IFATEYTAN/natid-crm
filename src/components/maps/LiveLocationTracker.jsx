import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LiveLocationTracker({ vendorId, onLocationUpdate, autoStart = false }) {
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    if (autoStart && !isTracking && !watchId) {
      startTracking();
    }
  }, [autoStart]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('הדפדפן אינו תומך במיקום GPS');
      toast.error('הדפדפן אינו תומך במיקום GPS');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;

        try {
          // Update vendor location
          await base44.functions.invoke('updateVendorLocation', {
            vendor_id: vendorId,
            latitude,
            longitude,
            accuracy,
            speed: speed ? Math.round(speed * 3.6) : null, // Convert m/s to km/h
            heading: heading || null,
            is_available: true
          });

          setLastUpdate(new Date());
          setError(null);
          
          if (onLocationUpdate) {
            onLocationUpdate({ latitude, longitude, accuracy, speed, heading });
          }
        } catch (err) {
          console.error('Failed to update location:', err);
          setError('שגיאה בעדכון מיקום');
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(getGeolocationErrorMessage(err.code));
        toast.error(getGeolocationErrorMessage(err.code));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setWatchId(id);
    setIsTracking(true);
    toast.success('מעקב מיקום הופעל');
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.info('מעקב מיקום הופסק');
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const getGeolocationErrorMessage = (code) => {
    switch (code) {
      case 1:
        return 'גישה למיקום נדחתה. אנא אפשר גישה להגדרות הדפדפן';
      case 2:
        return 'מיקום לא זמין';
      case 3:
        return 'פג תוקף הבקשה למיקום';
      default:
        return 'שגיאה לא ידועה';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-[#2E7D32] animate-pulse' : 'bg-[#9E9E9E]'}`} />
            <div>
              <div className="font-medium text-[#212121]">
                {isTracking ? 'מעקב GPS פעיל' : 'מעקב GPS כבוי'}
              </div>
              {lastUpdate && (
                <div className="text-xs text-[#616161]">
                  עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
                </div>
              )}
            </div>
          </div>
          
          <Button
            onClick={isTracking ? stopTracking : startTracking}
            variant={isTracking ? 'outline' : 'default'}
            className={isTracking ? '' : 'bg-[#2E7D32] hover:bg-[#1B5E20]'}
            size="sm"
          >
            {isTracking ? (
              <>
                <MapPin className="w-4 h-4 ml-2" />
                הפסק מעקב
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 ml-2" />
                התחל מעקב
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-[#D32F2F] bg-[#FFEBEE] p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {isTracking && !error && (
          <div className="flex items-center gap-2 text-sm text-[#2E7D32] bg-[#E8F5E9] p-3 rounded-lg">
            <CheckCircle2 className="w-4 h-4" />
            המיקום שלך מתעדכן אוטומטית כל כמה שניות
          </div>
        )}
      </CardContent>
    </Card>
  );
}