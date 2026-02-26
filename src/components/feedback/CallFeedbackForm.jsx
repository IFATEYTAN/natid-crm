import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Star, ThumbsUp, ThumbsDown, Send, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function StarRating({ value, onChange, label }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-1">
      <Label className="text-sm text-[#6b7280]">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'w-7 h-7 transition-colors',
                hovered >= star || value >= star
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CallFeedbackForm({
  callId,
  callNumber,
  customerName,
  customerPhone,
  vendorId,
  vendorName,
  onSubmitSuccess,
  feedbackSource = 'customer',
}) {
  const [ratings, setRatings] = useState({
    overall: 0,
    serviceQuality: 0,
    responseTime: 0,
    professionalism: 0,
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      // Create feedback record
      await base44.entities.CallFeedback.create({
        call_id: callId,
        call_number: callNumber,
        customer_name: customerName,
        customer_phone: customerPhone,
        vendor_id: vendorId,
        vendor_name: vendorName,
        overall_rating: ratings.overall,
        service_quality_rating: ratings.serviceQuality,
        response_time_rating: ratings.responseTime,
        professionalism_rating: ratings.professionalism,
        feedback_text: feedbackText,
        would_recommend: wouldRecommend,
        feedback_source: feedbackSource,
        submitted_at: new Date().toISOString(),
      });

      // Update call with customer rating
      await base44.entities.Call.update(callId, {
        customer_rating: ratings.overall,
        customer_feedback: feedbackText,
      });

      // Also create VendorRating record
      if (vendorId) {
        await base44.entities.VendorRating.create({
          vendor_id: vendorId,
          vendor_name: vendorName,
          call_id: callId,
          call_number: callNumber,
          rating_source: feedbackSource,
          overall_rating: ratings.overall,
          response_time_rating: ratings.responseTime,
          service_quality_rating: ratings.serviceQuality,
          professionalism_rating: ratings.professionalism,
          feedback: feedbackText,
          would_recommend: wouldRecommend,
        });
      }
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: queryKeys.calls.detail(callId) });
      toast.success('תודה על המשוב!');
      onSubmitSuccess?.();
    },
    onError: () => {
      toast.error('שגיאה בשליחת המשוב');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ratings.overall === 0) {
      toast.error('נא לבחור דירוג כללי');
      return;
    }
    submitFeedbackMutation.mutate();
  };

  if (submitted) {
    return (
      <Card className="bg-white">
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-[#111827] mb-2">תודה רבה!</h3>
          <p className="text-[#6b7280]">המשוב שלך נשלח בהצלחה</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          דרג את השירות
        </CardTitle>
        {vendorName && <p className="text-sm text-[#6b7280]">ספק: {vendorName}</p>}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="p-4 bg-[#f3f4f6] rounded-lg">
            <StarRating
              value={ratings.overall}
              onChange={(val) => setRatings({ ...ratings, overall: val })}
              label="דירוג כללי *"
            />
          </div>

          {/* Detailed Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StarRating
              value={ratings.serviceQuality}
              onChange={(val) => setRatings({ ...ratings, serviceQuality: val })}
              label="איכות השירות"
            />
            <StarRating
              value={ratings.responseTime}
              onChange={(val) => setRatings({ ...ratings, responseTime: val })}
              label="זמן תגובה"
            />
            <StarRating
              value={ratings.professionalism}
              onChange={(val) => setRatings({ ...ratings, professionalism: val })}
              label="מקצועיות"
            />
          </div>

          {/* Would Recommend */}
          <div className="space-y-2">
            <Label className="text-sm text-[#6b7280]">האם תמליץ על השירות?</Label>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={wouldRecommend === true ? 'default' : 'outline'}
                className={cn(
                  'flex-1 gap-2',
                  wouldRecommend === true && 'bg-green-500 hover:bg-green-600'
                )}
                onClick={() => setWouldRecommend(true)}
              >
                <ThumbsUp className="w-4 h-4" />
                כן, בהחלט
              </Button>
              <Button
                type="button"
                variant={wouldRecommend === false ? 'default' : 'outline'}
                className={cn(
                  'flex-1 gap-2',
                  wouldRecommend === false && 'bg-red-500 hover:bg-red-600'
                )}
                onClick={() => setWouldRecommend(false)}
              >
                <ThumbsDown className="w-4 h-4" />
                לא
              </Button>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="space-y-2">
            <Label className="text-sm text-[#6b7280]">משוב נוסף (אופציונלי)</Label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="ספר לנו על החוויה שלך..."
              className="min-h-[100px]"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] gap-2"
            disabled={submitFeedbackMutation.isPending}
          >
            {submitFeedbackMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            שלח משוב
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
