import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertCircle,
  MapPin,
  Phone,
  Navigation,
  Clock,
  Car,
  CheckCircle,
  X,
  Timer,
  Banknote,
  ChevronRight,
} from 'lucide-react';
import { issueTypeLabels } from '@/config/labels';

const DECLINE_REASONS = [
  { id: 'too_far', label: 'רחוק מדי' },
  { id: 'vehicle_issue', label: 'תקלה ברכב שלי' },
  { id: 'end_of_shift', label: 'סוף משמרת' },
  { id: 'on_another_call', label: 'באמצע קריאה אחרת' },
  { id: 'no_equipment', label: 'אין ציוד מתאים' },
  { id: 'personal', label: 'סיבה אישית' },
];

export default function VendorNewCallAlert({
  call,
  isOpen,
  onAccept,
  onDecline,
  timeoutSeconds = 120,
  vendorContract,
  vendorProfile,
}) {
  const [remainingTime, setRemainingTime] = useState(timeoutSeconds);
  const [showDeclineReasons, setShowDeclineReasons] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setRemainingTime(timeoutSeconds);
      setShowDeclineReasons(false);
      return;
    }

    const timer = setInterval(() => {
      setRemainingTime((prev) => {
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

  // Calculate estimated payment
  const getEstimatedPayment = () => {
    if (!vendorContract) {
      // Fallback to vendor's default rate
      if (vendorProfile?.payment_rate_per_call) {
        return { amount: vendorProfile.payment_rate_per_call, source: 'תעריף ברירת מחדל' };
      }
      return null;
    }

    if (vendorContract.contract_type === 'per_call') {
      return { amount: vendorContract.rate_per_call, source: 'לפי חוזה' };
    } else if (vendorContract.contract_type === 'hourly') {
      return { amount: vendorContract.hourly_rate, source: 'לשעה (לפי חוזה)', perHour: true };
    } else if (vendorContract.contract_type === 'monthly') {
      return {
        amount: vendorContract.monthly_fee,
        source: 'חודשי (ללא עלות נוספת)',
        monthly: true,
      };
    }
    return null;
  };

  const payment = getEstimatedPayment();

  const handleDeclineWithReason = (reason) => {
    setShowDeclineReasons(false);
    onDecline?.(reason);
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

        {showDeclineReasons ? (
          /* Decline Reasons Screen */
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-medium text-gray-700">מדוע אתה דוחה את הקריאה?</p>
              <p className="text-sm text-gray-500 mt-1">בחר סיבה מהרשימה</p>
            </div>

            <div className="space-y-2">
              {DECLINE_REASONS.map((reason) => (
                <Button
                  key={reason.id}
                  variant="outline"
                  className="w-full h-12 justify-between text-end"
                  onClick={() => handleDeclineWithReason(reason.label)}
                >
                  <span>{reason.label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              className="w-full text-gray-500"
              onClick={() => setShowDeclineReasons(false)}
            >
              חזור
            </Button>
          </div>
        ) : (
          /* Main Call Info Screen */
          <div className="space-y-4">
            {/* Timer */}
            <div className="flex items-center justify-center gap-2 bg-orange-50 p-3 rounded-lg">
              <Timer className="w-5 h-5 text-orange-600" />
              <span className="text-lg font-bold text-orange-600">{formatTime(remainingTime)}</span>
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
                        <span>
                          ~
                          {Math.round((new Date(call.estimated_arrival_time) - new Date()) / 60000)}{' '}
                          דקות
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Estimated Payment */}
                {payment && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 p-3 rounded-lg">
                    <Banknote className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <div className="font-bold text-green-800">
                        {payment.monthly
                          ? 'כלול בחוזה חודשי'
                          : `₪${payment.amount?.toLocaleString() || 0}${payment.perHour ? '/שעה' : ''}`}
                      </div>
                      <div className="text-xs text-green-600">{payment.source}</div>
                    </div>
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
                onClick={() => setShowDeclineReasons(true)}
              >
                <X className="w-5 h-5 ms-2" />
                דחה
              </Button>
              <Button className="flex-1 h-14 bg-green-600 hover:bg-green-700" onClick={onAccept}>
                <CheckCircle className="w-5 h-5 ms-2" />
                קבל קריאה
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
