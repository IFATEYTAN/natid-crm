import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function AIInsightsWidget({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-indigo-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          תובנות AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div key={index} className="flex gap-3 text-sm text-indigo-800 bg-white/60 p-2 rounded-lg">
              <span className="shrink-0 pt-0.5">•</span>
              <p>{insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}