import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { showToast } from '@/components/ui/FeedbackToast';
import { Phone, MapPin, Clock, Wrench, Navigation, CheckCircle, AlertTriangle } from 'lucide-react';
import { issueTypeLabels, priorityLabels, priorityColors } from '@/config/labels';
import { CLOSING_STATUSES } from '@/config/closingStatuses';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

// Forward status action available to a field agent for a given call status.
function getForwardAction(status) {
  switch (status) {
    case 'awaiting_assignment':
    case 'assigning':
    case 'assigned':
      return { label: 'יצאתי לדרך', status: 'vendor_enroute' };
    case 'vendor_enroute':
      return { label: 'הגעתי למקום', status: 'vendor_arrived' };
    case 'vendor_arrived':
      return { label: 'התחל טיפול', status: 'in_progress' };
    case 'in_progress':
      return { label: 'סיים קריאה', status: 'completed' };
    default:
      return null;
  }
}

/**
 * Summary card for a call assigned to a field agent.
 * Read-only by default; when `canUpdateStatus` is true (admin-granted permission)
 * it also exposes field status-update controls backed by the updateAgentCallStatus
 * server function (which re-enforces the permission and ownership).
 */
export default function AgentCallCard({ call, canUpdateStatus = false }) {
  const queryClient = useQueryClient();
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [showClosingDialog, setShowClosingDialog] = useState(false);
  const [reason, setReason] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.calls.all() });
    queryClient.invalidateQueries({ queryKey: queryKeys.queue.all() });
  };

  const mutation = useMutation({
    mutationFn: (updates) =>
      base44.functions.invoke('updateAgentCallStatus', { call_id: call.id, updates }),
    onSuccess: () => {
      invalidate();
      showToast.success('הסטטוס עודכן');
    },
    onError: () => showToast.error('שגיאה בעדכון הסטטוס'),
  });

  // Completion goes through the business-closure path (closing status + SMS + continuation)
  const closeMutation = useMutation({
    mutationFn: (closingKey) =>
      base44.functions.invoke('closeCall', { call_id: call.id, closing_status: closingKey }),
    onSuccess: (res) => {
      const data = res?.data || res;
      if (!data?.success) {
        showToast.error('שגיאה בסגירת הקריאה');
        return;
      }
      setShowClosingDialog(false);
      invalidate();
      showToast.success(
        data.continuation_call_id ? 'הקריאה נסגרה ונפתחה קריאת המשך' : 'הקריאה נסגרה'
      );
    },
    onError: () => showToast.error('שגיאה בסגירת הקריאה'),
  });

  const handleForward = (status) => {
    if (status === 'completed') {
      setShowClosingDialog(true);
    } else {
      mutation.mutate({ call_status: status });
    }
  };

  if (!call) return null;

  const location =
    call.pickup_location_address ||
    call.pickup_location_city ||
    call.incident_location ||
    'מיקום לא צוין';

  const createdAt = call.created_date
    ? formatDistanceToNow(new Date(call.created_date), { addSuffix: true, locale: he })
    : null;

  const forward = getForwardAction(call.call_status);
  const canReportProblem = ['vendor_arrived', 'in_progress'].includes(call.call_status);
  const showActions =
    canUpdateStatus && (forward || canReportProblem) && call.call_status !== 'completed';

  const handleReleaseProblem = () => {
    mutation.mutate(
      { call_status: 'cannot_complete', cannot_complete_reason: reason },
      {
        onSuccess: () => {
          setShowReasonDialog(false);
          setReason('');
        },
      }
    );
  };

  return (
    <>
      <Card className="bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-[#172B4D]">
              {call.call_number || `#${call.id?.substring(0, 8)}`}
            </span>
            <StatusBadge status={call.call_status} />
          </div>

          <div className="space-y-1.5 text-sm text-[#42526E]">
            {call.customer_name && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#6B778C]" />
                <span>
                  {call.customer_name}
                  {call.customer_phone ? ` · ${call.customer_phone}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6B778C]" />
              <span>{location}</span>
            </div>
            {call.issue_type && (
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#6B778C]" />
                <span>{issueTypeLabels[call.issue_type] || call.issue_type}</span>
              </div>
            )}
            {createdAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6B778C]" />
                <span>{createdAt}</span>
              </div>
            )}
          </div>

          {call.call_priority && (
            <Badge className={priorityColors[call.call_priority] || 'bg-gray-100 text-gray-700'}>
              {priorityLabels[call.call_priority] || call.call_priority}
            </Badge>
          )}

          {showActions && (
            <div className="pt-2 border-t flex flex-col gap-2">
              {forward && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10"
                  onClick={() => handleForward(forward.status)}
                  disabled={mutation.isPending}
                >
                  {forward.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 ms-2" />
                  ) : (
                    <Navigation className="w-4 h-4 ms-2" />
                  )}
                  {forward.label}
                </Button>
              )}
              {canReportProblem && (
                <Button
                  variant="ghost"
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                  onClick={() => {
                    setReason('');
                    setShowReasonDialog(true);
                  }}
                  disabled={mutation.isPending}
                >
                  <AlertTriangle className="w-4 h-4 ms-2" />
                  לא ניתן לטפל
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>לא ניתן לטפל בקריאה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#6B778C]">פרט את הסיבה — הדיווח יישלח למוקד.</p>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: חניון תת-קרקעי נעול, נדרש ציוד מותאם..."
              rows={3}
            />
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={handleReleaseProblem}
              disabled={mutation.isPending || !reason.trim()}
            >
              שלח דיווח למוקד
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showClosingDialog} onOpenChange={setShowClosingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>סגירת קריאה — בחר תוצאת טיפול</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {CLOSING_STATUSES.map((s) => (
              <Button
                key={s.key}
                variant="outline"
                className="justify-start h-auto py-3 text-start whitespace-normal"
                onClick={() => closeMutation.mutate(s.key)}
                disabled={closeMutation.isPending}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
