import React, { useState } from 'react';
import { Star, CheckCircle, Send, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import CallFeedbackForm from '@/components/feedback/CallFeedbackForm';
import { satisfactionLabels, satisfactionColors } from '@/config/satisfaction';

export default function CallFeedbackTab({ call, callId }) {
  const queryClient = useQueryClient();
  const [feedbackToken, setFeedbackToken] = useState(null);
  const [sendingSurvey, setSendingSurvey] = useState(false);

  // Final satisfaction result across all survey attempts (ignores "no
  // answer" attempts unless every attempt went unanswered — QA audit Group E).
  const { data: satisfaction } = useQuery({
    queryKey: queryKeys.callSatisfaction.byCall(callId),
    queryFn: async () => {
      const res = await base44.functions.invoke('getCallSatisfaction', { call_id: callId });
      return res.data?.success ? res.data : null;
    },
    enabled: !!callId,
  });

  const refreshSatisfaction = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.callSatisfaction.byCall(callId) });

  const handleSendSurvey = async () => {
    setSendingSurvey(true);
    try {
      const response = await base44.functions.invoke('sendFeedbackSMS', { call_id: callId });
      if (response.data?.success) {
        setFeedbackToken(response.data.token);
        toast.success('סקר נשלח ללקוח בהצלחה!');
        refreshSatisfaction();
      } else {
        toast.error(response.data?.error || 'שגיאה בשליחת הסקר');
      }
    } catch {
      toast.error('שגיאה בשליחת הסקר');
    } finally {
      setSendingSurvey(false);
    }
  };

  const handleCreateSurveyLink = async () => {
    setSendingSurvey(true);
    try {
      const response = await base44.functions.invoke('createFeedbackToken', { call_id: callId });
      if (response.data?.token) {
        setFeedbackToken(response.data.token);
        toast.success('קישור לסקר נוצר בהצלחה');
        refreshSatisfaction();
      }
    } catch {
      toast.error('שגיאה ביצירת הקישור');
    } finally {
      setSendingSurvey(false);
    }
  };

  const copyFeedbackLink = () => {
    const link = `${window.location.origin}/CustomerFeedback?token=${feedbackToken}`;
    navigator.clipboard.writeText(link);
    toast.success('הקישור הועתק');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Customer Survey Section */}
      <Card className="bg-white border-2 border-blue-100">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            סקר שביעות רצון ללקוח
          </CardTitle>
        </CardHeader>
        <CardContent>
          {satisfaction && satisfaction.status !== 'not_sent' && (
            <div className="flex justify-center mb-3">
              <Badge
                variant="outline"
                className={cn('text-sm', satisfactionColors[satisfaction.status])}
              >
                שביעות רצון סופית: {satisfactionLabels[satisfaction.status]}
              </Badge>
            </div>
          )}
          {call?.customer_rating ? (
            <div className="text-center py-4">
              <div className="flex justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      'w-8 h-8',
                      star <= call.customer_rating
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                ))}
              </div>
              <p className="text-green-600 font-medium">הלקוח כבר דירג את השירות</p>
              {call.customer_feedback && (
                <p className="text-gray-600 mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  &quot;{call.customer_feedback}&quot;
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">שלח ללקוח קישור לסקר קצר לדירוג השירות</p>

              {feedbackToken ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-green-700">קישור לסקר נוצר בהצלחה!</span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 gap-2" onClick={copyFeedbackLink}>
                      <Copy className="w-4 h-4" />
                      העתק קישור
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() =>
                        window.open(`/CustomerFeedback?token=${feedbackToken}`, '_blank')
                      }
                    >
                      <ExternalLink className="w-4 h-4" />
                      תצוגה מקדימה
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSendSurvey}
                    disabled={sendingSurvey || !call?.customer_phone}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {sendingSurvey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    שלח SMS ללקוח
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCreateSurveyLink}
                    disabled={sendingSurvey}
                    className="flex-1 gap-2"
                  >
                    צור קישור בלבד
                  </Button>
                </div>
              )}

              {!call?.customer_phone && (
                <p className="text-xs text-orange-600">
                  * לא ניתן לשלוח SMS - חסר מספר טלפון של הלקוח
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operator Feedback Form */}
      <CallFeedbackForm
        callId={callId}
        callNumber={call?.call_number}
        customerName={call?.customer_name}
        customerPhone={call?.customer_phone}
        vendorId={call?.assigned_vendor_id}
        vendorName={call?.assigned_vendor_name}
        feedbackSource="operator"
        onSubmitSuccess={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
        }}
      />
    </div>
  );
}
