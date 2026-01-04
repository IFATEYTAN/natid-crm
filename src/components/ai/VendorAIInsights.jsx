import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, ThumbsUp, ThumbsDown, TrendingUp, Lightbulb, RefreshCw, LineChart } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function VendorAIInsights({ vendorId }) {
    const [isEnabled, setIsEnabled] = useState(false);

    const { data: insights, isLoading, refetch } = useQuery({
        queryKey: ['vendor-analysis', vendorId],
        queryFn: () => base44.functions.invoke('analyzeVendorPerformance', { vendor_id: vendorId }).then(res => res.data),
        enabled: isEnabled && !!vendorId,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    if (!isEnabled) {
        return (
            <Card className="bg-gradient-to-r from-violet-50 to-indigo-50 border-indigo-100">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Brain className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-indigo-900">ניתוח ביצועים חכם</h3>
                            <p className="text-sm text-indigo-700">קבל תובנות AI על דפוסי הפעילות של הספק</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => setIsEnabled(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        size="sm"
                    >
                        <Brain className="w-4 h-4 ml-2" />
                        הפעל ניתוח
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-indigo-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-50 py-3 px-4 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-600" />
                    <CardTitle className="text-base text-indigo-900">פרופיל ביצועים (AI)</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-8 w-8">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="p-4">
                {isLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-3/4" />
                        <div className="grid grid-cols-2 gap-4">
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                        </div>
                        <Skeleton className="h-12" />
                    </div>
                ) : insights ? (
                    <div className="space-y-5">
                        {/* Strengths & Weaknesses */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                                <h4 className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-1">
                                    <ThumbsUp className="w-3 h-3" /> חוזקות
                                </h4>
                                <ul className="space-y-1">
                                    {insights.strengths?.map((s, i) => (
                                        <li key={i} className="text-sm text-green-800 flex items-start gap-1.5">
                                            <span className="mt-1.5 w-1 h-1 bg-green-500 rounded-full flex-shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                                <h4 className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1">
                                    <ThumbsDown className="w-3 h-3" /> נקודות לשיפור
                                </h4>
                                <ul className="space-y-1">
                                    {insights.weaknesses?.map((w, i) => (
                                        <li key={i} className="text-sm text-red-800 flex items-start gap-1.5">
                                            <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0" />
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Patterns & Trend */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-indigo-50/30 p-3 rounded-lg border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-700 uppercase mb-2 flex items-center gap-1">
                                    <LineChart className="w-3 h-3" /> דפוסים מזוהים
                                </h4>
                                <ul className="space-y-1">
                                    {insights.patterns?.map((p, i) => (
                                        <li key={i} className="text-sm text-indigo-800 flex items-start gap-1.5">
                                            <span className="mt-1.5 w-1 h-1 bg-indigo-500 rounded-full flex-shrink-0" />
                                            {p}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> מגמה צפויה
                                </h4>
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">
                                        {insights.predicted_trend}
                                    </Badge>
                                </div>
                                <p className="text-xs text-gray-500 leading-snug">
                                    {insights.predicted_trend_reason}
                                </p>
                            </div>
                        </div>

                        {/* Actionable Advice */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 rounded-lg border border-orange-100 flex items-start gap-3">
                            <div className="bg-white p-1.5 rounded-full shadow-sm mt-0.5">
                                <Lightbulb className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-amber-900 mb-0.5">המלצת המערכת</h4>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                    {insights.actionable_advice}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        לא התקבלו נתונים לניתוח
                    </div>
                )}
            </CardContent>
        </Card>
    );
}