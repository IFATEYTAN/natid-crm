import React, { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Power, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { base44 } from '@/api/base44Client';
import { showToast } from '@/components/ui/FeedbackToast';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function VendorAvailabilityToggle({ 
  vendor, 
  isAvailable, 
  onToggle, 
  lastLocationUpdate,
  locationError 
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading) return;
    
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

  return (
    <Card className={cn(
      "border-2 transition-colors",
      isAvailable ? "border-green-500 bg-green-50" : "border-gray-300 bg-gray-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isAvailable ? "bg-green-500" : "bg-gray-400"
            )}>
              <Power className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg">
                {isAvailable ? 'במשמרת - זמין לקריאות' : 'לא במשמרת'}
              </div>
              <div className="text-sm text-[#6B778C]">
                {isAvailable 
                  ? 'המערכת תפנה אליך קריאות באזור שלך' 
                  : 'לחץ להתחלת משמרת'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAvailable && (
              <div className="text-left text-sm">
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
            
            <Button
              onClick={handleToggle}
              disabled={isLoading}
              className={cn(
                "min-w-[140px] h-12 text-base font-bold",
                isAvailable 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-green-500 hover:bg-green-600"
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
          </div>
        </div>

        {isAvailable && (
          <div className="mt-3 pt-3 border-t border-green-200 flex items-center gap-4 text-sm text-green-800">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>המיקום שלך נשלח למוקד</span>
            </div>
            {lastLocationUpdate && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>עדכון אחרון: {formatDistanceToNow(lastLocationUpdate, { addSuffix: true, locale: he })}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}