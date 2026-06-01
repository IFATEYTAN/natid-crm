import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Users,
  Truck,
  XCircle,
  Clock,
  Wrench,
} from 'lucide-react';

const impactColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-green-100 text-green-700',
};
const impactLabels = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה' };

const categoryIcons = {
  staffing: Users,
  vendor_performance: Truck,
  cancellations: XCircle,
  response_time: Clock,
  preventive: Wrench,
};

export default function ProactiveRecommendationsWidget() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyze = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('analyzeHistoricalPatterns', {
      analysis_type: 'proactive_recommendations',
    });
    setResult(response.data);
    setLoading(false);
  };

  return (
    <Card className="border-emerald-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="bg-gradient-to-l from-emerald-500 to-teal-500 text-white p-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            המלצות פרואקטיביות - AI
          </CardTitle>
          <div className="flex gap-1">
            {result && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="h-7 w-7 p-0"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={analyze}
              disabled={loading}
              className="gap-1 h-7 text-xs"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              {result ? 'רענן' : 'צור המלצות'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="flex items-center justify-center py-8 text-emerald-600 text-sm">
            <Loader2 className="w-5 h-5 animate-spin ms-2" />
            מנתח נתונים ויוצר המלצות...
          </div>
        </CardContent>
      )}

      {result && !loading && expanded && (
        <CardContent className="space-y-4">
          {result.executive_summary && (
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-sm text-emerald-800">
              {result.executive_summary}
            </div>
          )}

          {result.stats && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-lg p-2 border">
                <div className="text-lg font-bold text-gray-900">{result.stats.total}</div>
                <div className="text-[10px] text-gray-500">קריאות נותחו</div>
              </div>
              <div className="bg-white rounded-lg p-2 border">
                <div className="text-lg font-bold text-green-600">{result.stats.completed}</div>
                <div className="text-[10px] text-gray-500">נסגרו</div>
              </div>
              <div className="bg-white rounded-lg p-2 border">
                <div className="text-lg font-bold text-red-600">{result.stats.cancelled}</div>
                <div className="text-[10px] text-gray-500">בוטלו</div>
              </div>
            </div>
          )}

          {result.recommendations?.map((rec, i) => {
            const Icon = categoryIcons[rec.category] || Sparkles;
            return (
              <div
                key={i}
                className="bg-white rounded-lg p-4 border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-sm text-gray-900">{rec.title}</span>
                  </div>
                  <Badge className={`text-[10px] ${impactColors[rec.impact]}`}>
                    השפעה {impactLabels[rec.impact]}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                {rec.actionable_steps?.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-2 space-y-1">
                    <span className="text-[10px] text-gray-500 font-medium">צעדים מומלצים:</span>
                    {rec.actionable_steps.map((step, j) => (
                      <div key={j} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-emerald-500 mt-0.5 shrink-0">→</span>
                        {step}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {result.stats?.peak_hours?.length > 0 && (
            <div className="bg-white rounded-lg p-3 border">
              <span className="text-xs font-semibold text-gray-700">שעות שיא:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {result.stats.peak_hours.map(([hour, count], i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {hour}:00 ({count} קריאות)
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {!result && !loading && (
        <CardContent>
          <div className="text-center py-6 text-gray-400 text-sm">
            לחץ "צור המלצות" לקבלת המלצות מבוססות נתוני עבר
          </div>
        </CardContent>
      )}
    </Card>
  );
}
