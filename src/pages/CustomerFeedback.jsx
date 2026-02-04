import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function CustomerFeedbackPage() {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(null);

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  useEffect(() => {
    if (!token) {
      setError({ type: 'invalid', message: 'קישור לא תקין' });
      setLoading(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await base44.functions.invoke('getFeedbackTokenInfo', { token });

      if (response.data.valid) {
        setTokenInfo(response.data);
      } else {
        setError({
          type: response.data.error,
          message: response.data.message,
          rating: response.data.rating,
        });
      }
    } catch (e) {
      setError({ type: 'error', message: 'שגיאה בטעינת הסקר' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const response = await base44.functions.invoke('validateAndSubmitFeedback', {
        token,
        rating,
        feedback_text: feedbackText,
        would_recommend: wouldRecommend,
      });

      if (response.data.success) {
        setSubmitted(true);
      } else {
        setError({ type: 'error', message: response.data.error || 'שגיאה בשליחת המשוב' });
      }
    } catch (e) {
      setError({ type: 'error', message: 'שגיאה בשליחת המשוב' });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4"
        dir="rtl"
      >
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">טוען את הסקר...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error states
  if (error) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4"
        dir="rtl"
      >
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            {error.type === 'used' ? (
              <>
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">תודה על המשוב!</h2>
                <p className="text-gray-600 mb-4">{error.message}</p>
                {error.rating && (
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'w-8 h-8',
                          star <= error.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : error.type === 'expired' ? (
              <>
                <Clock className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">פג תוקף</h2>
                <p className="text-gray-600">{error.message}</p>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">שגיאה</h2>
                <p className="text-gray-600">{error.message}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div
        className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4"
        dir="rtl"
      >
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-20 h-20 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">תודה רבה!</h2>
            <p className="text-gray-600 mb-4">המשוב שלך התקבל בהצלחה</p>
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'w-8 h-8',
                    star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                  )}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">המשוב שלך עוזר לנו להשתפר</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Feedback form
  return (
    <div
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6955a04a2de0845ff4cb8a71/36b225264_NatiLogoRGB.png"
              alt="נתי"
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-xl font-bold text-gray-800">איך היה השירות?</h1>
            <p className="text-gray-600 text-sm mt-1">
              שלום {tokenInfo?.customer_first_name}, נשמח לשמוע את דעתך
            </p>
            {tokenInfo?.service_date && (
              <p className="text-gray-500 text-xs mt-1">
                שירות מתאריך {new Date(tokenInfo.service_date).toLocaleDateString('he-IL')}
              </p>
            )}
          </div>

          {/* Star Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              דרג את השירות
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      'w-10 h-10 transition-colors',
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-gray-500 mt-2">
                {rating === 5 && 'מעולה! 🎉'}
                {rating === 4 && 'טוב מאוד 👍'}
                {rating === 3 && 'בסדר'}
                {rating === 2 && 'צריך שיפור'}
                {rating === 1 && 'לא טוב 😞'}
              </p>
            )}
          </div>

          {/* Would Recommend */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              האם תמליץ לחברים?
            </label>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all',
                  wouldRecommend === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                )}
              >
                <ThumbsUp className="w-5 h-5" />
                כן
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all',
                  wouldRecommend === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-red-300'
                )}
              >
                <ThumbsDown className="w-5 h-5" />
                לא
              </button>
            </div>
          </div>

          {/* Feedback Text */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              רוצה להוסיף משהו? (אופציונלי)
            </label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="ספר לנו על החוויה שלך..."
              className="h-24 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{feedbackText.length}/500</p>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              'שלח משוב'
            )}
          </Button>

          {/* Vendor name */}
          {tokenInfo?.vendor_name && (
            <p className="text-center text-xs text-gray-400 mt-4">
              נותן השירות: {tokenInfo.vendor_name}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
