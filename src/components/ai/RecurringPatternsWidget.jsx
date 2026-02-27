import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  User,
  Car,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const issueLabels = {
  mechanical: 'מכנית',
  stopped_driving: 'לא נוסע',
  flat_tire: "פנצ'ר",
  stuck_wheel: 'גלגל תקוע',
  accident: 'תאונה',
  no_fuel: 'דלק',
  dead_battery: 'מצבר',
  locked_keys: 'מפתחות',
  other: 'אחר',
};

const severityColors = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  critical: 'bg-red-50 border-red-200 text-red-800',
};

const severityLabels = { info: 'מידע', warning: 'אזהרה', critical: 'קריטי' };

export default function RecurringPatternsWidget() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const analyze = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('analyzeHistoricalPatterns', {
      analysis_type: 'recurring_patterns',
    });
    setResult(response.data);
    setLoading(false);
  };

  return (
    <Card className="border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="bg-gradient-to-l from-purple-500 to-indigo-500 text-white p-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            דפוסים חוזרים - ניתוח AI
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
              {result ? 'רענן' : 'נתח'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="flex items-center justify-center py-8 text-purple-600 text-sm">
            <Loader2 className="w-5 h-5 animate-spin ms-2" />
            מנתח היסטוריית קריאות...
          </div>
        </CardContent>
      )}

      {result && !loading && expanded && (
        <CardContent className="space-y-4">
          {result.ai_summary && (
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100 text-sm text-purple-800">
              {result.ai_summary}
            </div>
          )}

          {result.ai_patterns?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">דפוסים שזוהו</h4>
              {result.ai_patterns.map((pattern, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${severityColors[pattern.severity] || severityColors.info}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{pattern.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {severityLabels[pattern.severity]}
                    </Badge>
                  </div>
                  <p className="text-xs opacity-80">{pattern.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {result.repeating_customers?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> לקוחות חוזרים
                </h4>
                {result.repeating_customers.slice(0, 5).map((c, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-2.5 border text-sm flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-gray-500 me-2">{c.phone}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {c.total_calls} קריאות
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {result.repeating_vehicles?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Car className="w-3.5 h-3.5" /> רכבים חוזרים
                </h4>
                {result.repeating_vehicles.slice(0, 5).map((v, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-2.5 border text-sm flex justify-between items-center"
                  >
                    <div>
                      <span className="font-medium" dir="ltr">
                        {v.plate}
                      </span>
                      <span className="text-xs text-gray-500 me-2">{v.model}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {v.total_calls} קריאות
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {result.area_stats?.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> אזורים בולטים
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.area_stats.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-xs gap-1">
                    {a.area} <span className="font-bold">{a.count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            {result.total_analyzed} קריאות נותחו
          </p>
        </CardContent>
      )}

      {!result && !loading && (
        <CardContent>
          <div className="text-center py-6 text-gray-400 text-sm">
            לחץ "נתח" לזיהוי דפוסים חוזרים בהיסטוריית הקריאות
          </div>
        </CardContent>
      )}
    </Card>
  );
}
