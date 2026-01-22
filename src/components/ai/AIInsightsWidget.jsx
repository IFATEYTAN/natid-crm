import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

export default function AIInsightsWidget() {
  const insights = [
    {
      icon: TrendingUp,
      title: "עומס צפוי",
      description: "צפי לעלייה של 20% בקריאות בשעות הערב",
      type: "info"
    },
    {
      icon: AlertTriangle,
      title: "SLA בסיכון",
      description: "3 קריאות קרובות לחריגה מזמן SLA",
      type: "warning"
    },
    {
      icon: Clock,
      title: "זמן תגובה",
      description: "זמן התגובה הממוצע השתפר ב-15% השבוע",
      type: "success"
    }
  ];

  const typeColors = {
    info: "text-blue-600 bg-blue-50",
    warning: "text-amber-600 bg-amber-50",
    success: "text-green-600 bg-green-50"
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          תובנות AI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <div 
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg ${typeColors[insight.type]}`}
          >
            <insight.icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">{insight.title}</p>
              <p className="text-xs opacity-80">{insight.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}