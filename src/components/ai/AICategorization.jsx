import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Check, AlertTriangle } from 'lucide-react';
import { showToast } from '@/components/ui/FeedbackToast';
import {
  serviceTypeLabels,
  priorityLabels,
  priorityColors,
  issueTypeLabels,
} from '@/config/labels';

export default function AICategorization({
  problemDescription,
  locationAddress,
  locationCity,
  vehicleType,
  onApply,
}) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCategorize = async () => {
    if (!problemDescription || problemDescription.trim().length < 3) return;
    setLoading(true);
    setApplied(false);
    try {
      const response = await base44.functions.invoke('categorizeCall', {
        problem_description: problemDescription,
        location_address: locationAddress,
        location_city: locationCity,
        vehicle_type: vehicleType,
      });
      setResult(response?.data || null);
    } catch (error) {
      // Don't leave the button stuck in "loading" if the LLM call throws.
      showToast.error(`סיווג ה-AI נכשל: ${error?.message || 'שגיאה לא ידועה'}`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result || !onApply) return;
    onApply({
      service_type: result.service_type,
      priority: result.priority,
    });
    setApplied(true);
  };

  if (!problemDescription || problemDescription.trim().length < 3) return null;

  return (
    <div className="border border-indigo-200 rounded-lg bg-indigo-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-700">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">סיווג AI אוטומטי</span>
        </div>
        {!result && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCategorize}
            disabled={loading}
            className="gap-1 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {loading ? 'מנתח...' : 'נתח תקלה'}
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4 text-indigo-600 text-sm">
          <Loader2 className="w-5 h-5 animate-spin ms-2" />
          מנתח את תיאור התקלה...
        </div>
      )}

      {result && !loading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <div className="text-xs text-gray-500 mb-1">סוג תקלה</div>
              <div className="font-medium text-sm">
                {issueTypeLabels[result.issue_type] || result.issue_type}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <div className="text-xs text-gray-500 mb-1">שירות מומלץ</div>
              <div className="font-medium text-sm">
                {serviceTypeLabels[result.service_type] || result.service_type}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <div className="text-xs text-gray-500 mb-1">עדיפות</div>
              <Badge className={`${priorityColors[result.priority]} text-xs`}>
                {result.priority === 'urgent' && <AlertTriangle className="w-3 h-3 ms-1" />}
                {priorityLabels[result.priority]}
              </Badge>
            </div>
          </div>

          {(result.confidence != null || result.reasoning) && (
            <div className="bg-white rounded-lg p-3 border border-indigo-100">
              <div className="text-xs text-gray-500 mb-1">
                הסבר{result.confidence != null ? ` (${result.confidence}% ביטחון)` : ''}
              </div>
              <p className="text-sm text-gray-700">{result.reasoning || 'אין הסבר נוסף'}</p>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={handleCategorize} className="gap-1">
              <Sparkles className="w-3 h-3" />
              נתח שוב
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={applied}
              className="gap-1 bg-indigo-600 hover:bg-indigo-700"
            >
              {applied ? <Check className="w-3 h-3" /> : null}
              {applied ? 'הוחל' : 'החל סיווג'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
