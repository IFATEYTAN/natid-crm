import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShieldCheck, ShieldX, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Badge } from '@/components/ui/badge';

export default function QualityControlSection({ call, callId, currentUser }) {
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    await base44.entities.Call.update(callId, {
      passed_quality_control: true,
      quality_controller_name: currentUser?.full_name || 'בקר',
      returned_to_agent: false,
    });
    await base44.entities.CallHistory.create({
      call_id: callId,
      call_number: call?.call_number,
      change_type: 'status',
      old_value: 'בקרה',
      new_value: 'אושר לתפעול',
      notes: `אושר ע"י ${currentUser?.full_name || 'בקר'}`,
      changed_by: currentUser?.full_name || 'בקר',
    });
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
    toast.success('הקריאה אושרה לתפעול');
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('יש לציין סיבת דחייה');
      return;
    }
    setProcessing(true);
    await base44.entities.Call.update(callId, {
      passed_quality_control: false,
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
    setProcessing(false);
    setShowRejectForm(false);
  };

  // Already processed
  if (call?.passed_quality_control === true) {
    return (
      <Card className="bg-white border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <span className="font-medium text-green-700">אושר בבקרה</span>
              {call.quality_controller_name && (
                <span className="text-sm text-gray-500 mr-2">ע"י {call.quality_controller_name}</span>
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
              <Badge className="bg-red-100 text-red-700 mr-2 text-xs">דורש תיקון</Badge>
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
        <p className="text-sm text-gray-600 mb-4">
          בדוק את תקינות הקריאה לפני מעבר לתפעול ספק. ודא שהקריאה עומדת בכתב השירות.
        </p>

        {showRejectForm ? (
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
              <Button variant="destructive" onClick={handleReject} disabled={processing} className="gap-2">
                <ShieldX className="w-4 h-4" />
                {processing ? 'שולח...' : 'החזר למוקדן'}
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>ביטול</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button onClick={handleApprove} disabled={processing} className="gap-2 bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="w-4 h-4" />
              {processing ? 'מאשר...' : 'אישור - עומד בכת"ש'}
            </Button>
            <Button variant="outline" onClick={() => setShowRejectForm(true)} className="gap-2 text-red-600 border-red-300 hover:bg-red-50">
              <ShieldX className="w-4 h-4" />
              לא עומד בכת"ש
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}