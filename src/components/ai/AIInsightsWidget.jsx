import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useCalls } from '@/features/calls/hooks/useCalls';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';

export default function AIInsightsWidget() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const { data: calls = [] } = useCalls();

  const typeColors = {
    info: 'text-blue-600 bg-blue-50',
    warning: 'text-amber-600 bg-amber-50',
    success: 'text-green-600 bg-green-50',
    danger: 'text-red-600 bg-red-50',
  };

  const iconMap = {
    trend: TrendingUp,
    sla: AlertTriangle,
    time: Clock,
    general: Lightbulb,
  };

  const generateInsights = async () => {
    if (calls.length === 0) return;
    setLoading(true);

    const openCalls = calls.filter((c) => !['completed', 'cancelled'].includes(c.call_status));
    const completedToday = calls.filter((c) => {
      const d = new Date(c.created_date);
      const today = new Date();
      return c.call_status === 'completed' && d.toDateString() === today.toDateString();
    });
    const urgentOpen = openCalls.filter(
      (c) => c.call_priority === 'urgent' || c.call_priority === 'critical'
    );
    const waitingLong = openCalls.filter((c) => {
      const mins = (Date.now() - new Date(c.created_date).getTime()) / 60000;
      return mins > 30;
    });

    const prompt = `אתה מערכת AI לניהול מוקד שירותי דרך. נתח את הנתונים הבאים וצור 3 תובנות חכמות ומשמעותיות.

נתונים:
- סה"כ קריאות פתוחות: ${openCalls.length}
- קריאות שהושלמו היום: ${completedToday.length}
- קריאות דחופות פתוחות: ${urgentOpen.length}
- קריאות הממתינות מעל 30 דקות: ${waitingLong.length}
- סה"כ קריאות במערכת: ${calls.length}

צור 3 תובנות שונות. כל תובנה צריכה להיות קצרה ומעשית.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'כותרת קצרה (3-5 מילים)' },
                description: { type: 'string', description: 'תובנה קצרה (משפט אחד)' },
                type: { type: 'string', enum: ['info', 'warning', 'success', 'danger'] },
                icon: { type: 'string', enum: ['trend', 'sla', 'time', 'general'] },
              },
              required: ['title', 'description', 'type', 'icon'],
            },
          },
        },
        required: ['insights'],
      },
    });

    setInsights(response.insights || []);
    setLoading(false);
  };

  useEffect(() => {
    if (calls.length > 0 && !insights && !loading) {
      generateInsights();
    }
  }, [calls.length]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            תובנות AI
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={generateInsights}
            disabled={loading}
            className="gap-1 text-gray-500 h-7"
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin ms-2" />
            מנתח נתונים...
          </div>
        )}
        {!loading &&
          insights &&
          insights.map((insight, index) => {
            const Icon = iconMap[insight.icon] || Lightbulb;
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${typeColors[insight.type] || typeColors.info}`}
              >
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs opacity-80">{insight.description}</p>
                </div>
              </div>
            );
          })}
        {!loading && !insights && (
          <div className="text-center py-4 text-gray-400 text-sm">אין מספיק נתונים לתובנות</div>
        )}
      </CardContent>
    </Card>
  );
}
