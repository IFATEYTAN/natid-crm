import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Ban, DollarSign, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export default function CancelCallDialog({ open, onOpenChange, call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState('choose'); // choose, reason, confirm
  const [cancelType, setCancelType] = useState(''); // no_charge, with_charge, on_site
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const hasVendor = !!call?.assigned_vendor_id;
  const isEnroute = ['vendor_enroute', 'in_progress', 'vendor_arrived'].includes(call?.call_status);

  // Fetch active deposits for this call to auto-cancel them
  const { data: activeDeposits = [] } = useQuery({
    queryKey: queryKeys.deposits?.byCall?.(callId) || ['deposits', callId],
    queryFn: async () => {
      const deposits = await base44.entities.Deposit.filter({ call_id: callId });
      return deposits.filter((d) => d.status === 'active');
    },
    enabled: !!callId && open,
  });

  const cancelTypeLabels = {
    no_charge: 'ביטול ללא חיוב',
    with_charge: 'ביטול עם חיוב ספק',
    on_site: 'ביטול במקום (חיוב לקוח + ספק)',
  };

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error('יש לציין סיבת ביטול');
      return;
    }
    setProcessing(true);

    const updates = {
      call_status: 'cancelled',
      closed_at: new Date().toISOString(),
      closed_by: currentUser?.full_name || 'operator',
    };

    // If with_charge or on_site, mark payment
    if (cancelType === 'with_charge' || cancelType === 'on_site') {
      updates.payment_required = true;
      updates.payment_reason = `ביטול - ${cancelTypeLabels[cancelType]}`;
    }

    await base44.entities.Call.update(callId, updates);

    await base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'status',
      old_value: call?.call_status,
      new_value: 'cancelled',
      notes: `${cancelTypeLabels[cancelType]}: ${reason}`,
      changed_by: currentUser?.full_name || 'operator',
    });

    // לפי דורית נתי גרופ: ביטול במקום (ספק הגיע) = העירבון נשאר על כנו (לא מבוטל)
    // רק ביטול ללא חיוב או עם חיוב ספק בלבד מבטל את העירבון
    const shouldCancelDeposits = cancelType !== 'on_site';

    if (activeDeposits.length > 0 && shouldCancelDeposits) {
      const cancelReason = `ביטול אוטומטי — הקריאה בוטלה: ${reason}`;
      await Promise.all(
        activeDeposits.map((deposit) =>
          base44.entities.Deposit.update(deposit.id, {
            status: 'cancelled',
            notes: (deposit.notes || '') + '\n' + cancelReason,
          })
        )
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.deposits?.byCall?.(callId) || ['deposits', callId],
      });
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
    let depositMsg = '';
    if (cancelType === 'on_site' && activeDeposits.length > 0) {
      depositMsg = ` (עירבון נשאר פעיל — ביטול במקום)`;
    } else if (activeDeposits.length > 0) {
      depositMsg = ` (${activeDeposits.length} עירבונות בוטלו אוטומטית)`;
    }
    toast.success(`הקריאה בוטלה${depositMsg}`);
    setProcessing(false);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep('choose');
    setCancelType('');
    setReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Ban className="w-5 h-5" />
            ביטול קריאה
          </DialogTitle>
        </DialogHeader>

        {step === 'choose' && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              {isEnroute ? 'נותן השירות כבר בדרך. בחר את סוג הביטול:' : 'בחר את סוג הביטול:'}
            </p>
            <RadioGroup value={cancelType} onValueChange={setCancelType} className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="no_charge" id="no_charge" />
                <label htmlFor="no_charge" className="flex-1 cursor-pointer">
                  <div className="font-medium">ביטול ללא חיוב</div>
                  <div className="text-xs text-gray-500">הקריאה תבוטל ללא עלויות</div>
                </label>
              </div>
              {isEnroute && (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="with_charge" id="with_charge" />
                    <label htmlFor="with_charge" className="flex-1 cursor-pointer">
                      <div className="font-medium flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-orange-500" />
                        ביטול עם חיוב ספק
                      </div>
                      <div className="text-xs text-gray-500">הספק יקבל תשלום על הנסיעה</div>
                    </label>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value="on_site" id="on_site" />
                    <label htmlFor="on_site" className="flex-1 cursor-pointer">
                      <div className="font-medium flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        ביטול במקום
                      </div>
                      <div className="text-xs text-gray-500">חיוב לקוח + ספק (הספק כבר הגיע)</div>
                    </label>
                  </div>
                </>
              )}
              {!isEnroute && (
                <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="with_charge" id="with_charge" />
                  <label htmlFor="with_charge" className="flex-1 cursor-pointer">
                    <div className="font-medium">ביטול עם חיוב</div>
                    <div className="text-xs text-gray-500">הלקוח יחויב בדמי ביטול</div>
                  </label>
                </div>
              )}
            </RadioGroup>
            <DialogFooter>
              <Button variant="outline" onClick={resetAndClose}>
                ביטול
              </Button>
              <Button
                disabled={!cancelType}
                onClick={() => setStep('reason')}
                variant="destructive"
              >
                המשך
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'reason' && (
          <div className="space-y-4 py-2">
            <div className="p-2 bg-red-50 rounded-md text-sm text-red-700 font-medium">
              {cancelTypeLabels[cancelType]}
            </div>
            <div>
              <Label>סיבת ביטול *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ציין את סיבת הביטול..."
                rows={3}
              />
            </div>
            <p className="text-xs text-gray-500">הסיבה תתועד בהתנהלות הקריאה</p>
            {activeDeposits.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-300">
                <Wallet className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">
                    {activeDeposits.length} עירבונות פעילים יבוטלו אוטומטית
                  </p>
                  <p className="text-amber-700 text-xs mt-0.5">
                    סה"כ ₪{activeDeposits.reduce((sum, d) => sum + (d.amount || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('choose')}>
                חזרה
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={processing || !reason.trim()}
              >
                {processing ? 'מבטל...' : 'אשר ביטול'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
