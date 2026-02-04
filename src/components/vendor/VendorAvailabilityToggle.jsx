import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Power,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Coffee,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/ui/FeedbackToast';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const BREAK_DURATIONS = [
  { minutes: 15, label: '15 דקות' },
  { minutes: 30, label: '30 דקות' },
  { minutes: 60, label: 'שעה' },
];

export default function VendorAvailabilityToggle({
  vendor,
  isAvailable,
  onToggle,
  lastLocationUpdate,
  locationError,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(vendor?.availability_status === 'on_break');
  const [breakEndTime, setBreakEndTime] = useState(null);
  const [breakRemaining, setBreakRemaining] = useState(null);
  const [showBreakOptions, setShowBreakOptions] = useState(false);
  const breakTimerRef = useRef(null);

  // Update break remaining time every second
  useEffect(() => {
    if (!breakEndTime) {
      setBreakRemaining(null);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, breakEndTime - Date.now());
      if (remaining <= 0) {
        // Break is over - return to available
        setIsOnBreak(false);
        setBreakEndTime(null);
        setBreakRemaining(null);
        handleEndBreak();
        return;
      }
      setBreakRemaining(remaining);
    };

    tick();
    breakTimerRef.current = setInterval(tick, 1000);
    return () => clearInterval(breakTimerRef.current);
  }, [breakEndTime]);

  const handleToggle = async () => {
    if (isLoading) return;

    // If on break and clicking end shift, end break first
    if (isOnBreak) {
      await handleEndBreak();
      return;
    }

    // If turning on availability, check for location permission first
    if (!isAvailable) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          showToast.error('יש לאשר הרשאות מיקום בהגדרות הדפדפן כדי להתחיל משמרת');
          return;
        }
      } catch (e) {
        // If can't check permissions, try anyway
      }
    }

    setIsLoading(true);
    try {
      await onToggle();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartBreak = async (minutes) => {
    setIsLoading(true);
    setShowBreakOptions(false);
    try {
      await base44.entities.Vendor.update(vendor.id, {
        availability_status: 'on_break',
      });
      setIsOnBreak(true);
      setBreakEndTime(Date.now() + minutes * 60 * 1000);
      showToast.success(`הפסקה ל-${minutes} דקות התחילה`);
    } catch (error) {
      console.error('Error starting break:', error);
      showToast.error('שגיאה בהפעלת הפסקה');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndBreak = useCallback(async () => {
    setIsLoading(true);
    try {
      await base44.entities.Vendor.update(vendor.id, {
        availability_status: 'available',
      });
      setIsOnBreak(false);
      setBreakEndTime(null);
      setBreakRemaining(null);
      clearInterval(breakTimerRef.current);
      showToast.success('חזרת מהפסקה - זמין לקריאות');
    } catch (error) {
      console.error('Error ending break:', error);
    } finally {
      setIsLoading(false);
    }
  }, [vendor?.id]);

  const formatBreakRemaining = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      className={cn(
        'border-2 transition-colors',
        isOnBreak
          ? 'border-yellow-500 bg-yellow-50'
          : isAvailable
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 bg-gray-50'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center',
                isOnBreak ? 'bg-yellow-500' : isAvailable ? 'bg-green-500' : 'bg-gray-400'
              )}
            >
              {isOnBreak ? (
                <Coffee className="w-6 h-6 text-white" />
              ) : (
                <Power className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="font-bold text-lg">
                {isOnBreak ? 'בהפסקה' : isAvailable ? 'במשמרת - זמין לקריאות' : 'לא במשמרת'}
              </div>
              <div className="text-sm text-[#6B778C]">
                {isOnBreak && breakRemaining
                  ? `חוזר בעוד ${formatBreakRemaining(breakRemaining)}`
                  : isAvailable
                    ? 'המערכת תפנה אליך קריאות באזור שלך'
                    : 'לחץ להתחלת משמרת'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAvailable && !isOnBreak && (
              <div className="text-left text-sm ml-2">
                {locationError ? (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="w-4 h-4" />
                    <span>בעיית מיקום</span>
                  </div>
                ) : lastLocationUpdate ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <MapPin className="w-4 h-4" />
                    <span>מיקום פעיל</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>מאתר מיקום...</span>
                  </div>
                )}
              </div>
            )}

            {isOnBreak ? (
              <Button
                onClick={handleEndBreak}
                disabled={isLoading}
                className="min-w-[140px] h-12 text-base font-bold bg-green-500 hover:bg-green-600"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'חזור מהפסקה'}
              </Button>
            ) : (
              <Button
                onClick={handleToggle}
                disabled={isLoading}
                className={cn(
                  'min-w-[140px] h-12 text-base font-bold',
                  isAvailable ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isAvailable ? (
                  'סיים משמרת'
                ) : (
                  'התחל משמרת'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Break Options */}
        {isAvailable && !isOnBreak && (
          <div className="mt-3 pt-3 border-t border-green-200">
            {showBreakOptions ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 ml-1">בחר משך הפסקה:</span>
                {BREAK_DURATIONS.map((opt) => (
                  <Button
                    key={opt.minutes}
                    variant="outline"
                    size="sm"
                    className="gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                    onClick={() => handleStartBreak(opt.minutes)}
                    disabled={isLoading}
                  >
                    <Timer className="w-3 h-3" />
                    {opt.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400"
                  onClick={() => setShowBreakOptions(false)}
                >
                  ביטול
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-green-800">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>המיקום שלך נשלח למוקד</span>
                  </div>
                  {lastLocationUpdate && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        עדכון אחרון:{' '}
                        {formatDistanceToNow(lastLocationUpdate, { addSuffix: true, locale: he })}
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50"
                  onClick={() => setShowBreakOptions(true)}
                >
                  <Coffee className="w-4 h-4" />
                  הפסקה
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Break timer bar */}
        {isOnBreak && breakRemaining && breakEndTime && (
          <div className="mt-3 pt-3 border-t border-yellow-200">
            <div className="flex items-center gap-2 text-sm text-yellow-800">
              <Timer className="w-4 h-4" />
              <span>הפסקה תסתיים אוטומטית בעוד {formatBreakRemaining(breakRemaining)}</span>
            </div>
          </div>
        )}

        {!isAvailable && !isOnBreak && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-4 text-sm text-gray-500">
            <span>לחץ "התחל משמרת" כדי לקבל קריאות</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
