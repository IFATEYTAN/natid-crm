import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ShieldX, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Badge } from '@/components/ui/badge';

export default function QualityControlSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showManualActions, setShowManualActions] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      await base44.entities.Call.update(callId, {
        passed_quality_control: true,
        quality_control_source: 'manual',
        quality_controller_name: currentUser?.full_name || 'בקר',
        returned_to_agent: false,
      });
      await base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call?.call_number,
        change_type: 'status',
        old_value: 'בקרה',
        new_value: 'אושר לתפעול',
        notes: `אושר ידנית (חריג) ע"י ${currentUser?.full_name || 'בקר'}`,
        changed_by: currentUser?.full_name || 'בקר',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
      toast.success('הקריאה אושרה לתפעול (אישור ידני)');
    } catch (error) {
      console.error('Manual QC approve failed:', error);
      toast.error('שגיאה באישור הקריאה, נסה שוב');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('יש לציין סיבת דחייה');
      return;
    }
    setProcessing(true);
    try {
      await base44.entities.Call.update(callId, {
        passed_quality_control: false,
        quality_control_source: 'manual',
        quality_controller_name: currentUser?.full_name || 'בקר',
        returned_to_agent: true,
        call_status: 'waiting_treatment',
      });
      await base44.entities.CallHistory.create({
        call_id: callId,
        call_number: call?.call_number,
        change_type: 'status',
        old_value: 'בקרה',
        new_value: 'הוחזר למוקדן',
        notes: `נדחה: ${rejectionReason}`,
        changed_by: currentUser?.full_name || 'בקר',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
      toast.success('הקריאה הוחזרה למוקדן');
      setShowRejectForm(false);
    } catch (error) {
      console.error('Manual QC reject failed:', error);
      toast.error('שגיאה בהחזרת הקריאה, נסה שוב');
    } finally {
      setProcessing(false);
    }
  };

  const isManualApproval = call?.quality_control_source === 'manual';

  // Already processed
  if (call?.passed_quality_control === true) {
    return (
      <Card className="bg-white border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="flex items-center flex-wrap gap-y-1">
              <span className="font-medium text-green-700">אושר בבקרה</span>
              {isManualApproval ? (
                <Badge className="bg-amber-100 text-amber-800 me-2 text-xs">אישור ידני</Badge>
              ) : (
                <Badge className="bg-blue-100 text-blue-700 me-2 text-xs">סונכרן מנתי</Badge>
              )}
              {isManualApproval && call.quality_controller_name && (
                <span className="text-sm text-gray-500 me-2">
                  ע"י {call.quality_controller_name}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (call?.returned_to_agent) {
    return (
      <Card className="bg-white border-red-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <span className="font-medium text-red-700">הוחזר למוקדן</span>
              <Badge className="bg-red-100 text-red-700 me-2 text-xs">דורש תיקון</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-blue-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          בקרת קריאה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-700">ממתין לאישור בקרה</span>
        </div>
        <p className="text-sm text-gray-600 mb-4 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          הבקרה מתבצעת במערכת נתי והסטטוס מתעדכן כאן אוטומטית בסנכרון.
        </p>

        {!showManualActions ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualActions(true)}
            className="text-gray-500 hover:text-gray-700 px-2"
          >
            בקרה ידנית למקרה חריג...
          </Button>
        ) : showRejectForm ? (
          <div className="space-y-3">
            <div>
              <Label>סיבת דחייה / הנחיות למוקדן</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="פרט מה נדרש לתקן..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
                className="gap-2"
              >
                <ShieldX className="w-4 h-4" />
                {processing ? 'שולח...' : 'החזר למוקדן'}
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                ביטול
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              אישור ידני מיועד למקרים חריגים בלבד. הוא נשמר גם אם הקריאה טרם אושרה בנתי, ולא יידרס
              בסנכרון.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={processing}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                {processing ? 'מאשר...' : 'אישור ידני - עומד בכת"ש'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <ShieldX className="w-4 h-4" />
                לא עומד בכת"ש
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowManualActions(false)}
                className="text-gray-500"
              >
                ביטול
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
