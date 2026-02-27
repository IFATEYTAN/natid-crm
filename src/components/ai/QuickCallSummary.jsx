import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, FileText, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export default function QuickCallSummary({ callId }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleGenerate = async () => {
    setLoading(true);
    const response = await base44.functions.invoke('quickCallSummary', { call_id: callId });
    setResult(response.data);
    setLoading(false);
    setExpanded(true);
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="bg-gradient-to-l from-indigo-500 to-purple-500 text-white p-1 rounded-md">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            סיכום AI מהיר
          </CardTitle>
          <div className="flex items-center gap-2">
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
              onClick={handleGenerate}
              disabled={loading}
              className="gap-1 text-indigo-700 border-indigo-300 hover:bg-indigo-100"
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {result ? 'רענן' : 'צור סיכום'}
            </Button>
          </div>
        </div>
      </CardHeader>

      {loading && (
        <CardContent>
          <div className="flex items-center justify-center py-6 text-indigo-600 text-sm">
            <Loader2 className="w-5 h-5 animate-spin ms-2" />
            יוצר סיכום מהיר...
          </div>
        </CardContent>
      )}

      {result && !loading && expanded && (
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-gray-800">סיכום</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {result.summary}
            </p>
          </div>

          {result.key_points?.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-indigo-100">
              <div className="text-sm font-semibold text-gray-800 mb-2">נקודות מפתח</div>
              <ul className="space-y-1">
                {result.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.action_items?.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">המלצות לפעולה</span>
              </div>
              <ul className="space-y-1">
                {result.action_items.map((item, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}

      {!result && !loading && (
        <CardContent>
          <div className="text-center py-4 text-gray-400 text-sm">
            לחץ "צור סיכום" לקבלת סיכום AI מהיר של הקריאה
          </div>
        </CardContent>
      )}
    </Card>
  );
}
