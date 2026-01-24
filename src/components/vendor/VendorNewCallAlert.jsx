import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  MapPin,
  Phone,
  Navigation,
  Clock,
  Car,
  CheckCircle,
  X,
  Timer
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const issueTypeLabels = {
  mechanical: 'תקלה מכנית',
  stopped_driving: 'רכב לא נוסע',
  flat_tire: 'פנצ\'ר',
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'אין דלק',
  dead_battery: 'מצבר',
  locked_keys: 'מפתחות נעולים',
  other: 'אחר'
};

export default function VendorNewCallAlert({ 
  call, 
  isOpen, 
  onAccept, 
  onDecline, 
  timeoutSeconds = 120 
}) {
  const [remainingTime, setRemainingTime] = useState(timeoutSeconds);

  useEffect(() => {
    if (!isOpen) {
      setRemainingTime(timeoutSeconds);
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline?.('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, timeoutSeconds, onDecline]);

  if (!call) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-6 h-6 animate-pulse" />
            קריאה חדשה!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 bg-orange-50 p-3 rounded-lg">
            <Timer className="w-5 h-5 text-orange-600" />
            <span className="text-lg font-bold text-orange-600">
              {formatTime(remainingTime)}
            </span>
            <span className="text-sm text-orange-600">לקבלת הקריאה</span>
          </div>

          {/* Call Info */}
          <Card className="border-2 border-orange-200">
            <CardContent className="p-4 space-y-3">
              {/* Issue Type */}
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#6B778C]" />
                <span className="font-bold text-lg">
                  {issueTypeLabels[call.issue_type] || call.issue_type}
                </span>
              </div>

              {/* Customer */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{call.customer_name}</div>
                  <div className="text-sm text-[#6B778C]" dir="ltr">
                    {call.customer_phone}
                  </div>
                </div>
                <a href={`tel:${call.customer_phone}`}>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Phone className="w-4 h-4" />
                  </Button>
                </a>
              </div>

              {/* Location */}
              <div className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                <MapPin className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium">{call.pickup_location_address}</div>
                  {call.pickup_location_city && (
                    <div className="text-sm text-[#6B778C]">{call.pickup_location_city}</div>
                  )}
                </div>
              </div>

              {/* Distance & ETA */}
              {call.estimated_distance_km && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Navigation className="w-4 h-4 text-blue-500" />
                    <span>{call.estimated_distance_km.toFixed(1)} ק"מ</span>
                  </div>
                  {call.estimated_arrival_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-green-500" />
                      <span>~{Math.round((new Date(call.estimated_arrival_time) - new Date()) / 60000)} דקות</span>
                    </div>
                  )}
                </div>
              )}

              {/* Vehicle */}
              {call.vehicle_model && (
                <div className="text-sm text-[#6B778C]">
                  רכב: {call.vehicle_model} {call.vehicle_plate && `| ${call.vehicle_plate}`}
                </div>
              )}

              {/* Priority */}
              {call.call_priority === 'urgent' || call.call_priority === 'critical' ? (
                <div className="bg-red-50 border border-red-200 p-2 rounded-lg text-center">
                  <span className="text-red-600 font-bold">קריאה דחופה!</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-14 border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => onDecline?.('declined')}
            >
              <X className="w-5 h-5 ml-2" />
              דחה
            </Button>
            <Button
              className="flex-1 h-14 bg-green-600 hover:bg-green-700"
              onClick={onAccept}
            >
              <CheckCircle className="w-5 h-5 ml-2" />
              קבל קריאה
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}