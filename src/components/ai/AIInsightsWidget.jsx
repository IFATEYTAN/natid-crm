import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle, TrendingUp, RefreshCw, Lightbulb } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from 'framer-motion';

export default function AIInsightsWidget() {
    const [isEnabled, setIsEnabled] = useState(false);

    const { data: insights, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['ai-patterns'],
        queryFn: () => base44.functions.invoke('analyzeCallPatterns').then(res => res.data),
        enabled: isEnabled,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    if (!isEnabled) {
        return (
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100">
                <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                        <Brain className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-indigo-900 mb-2">ניתוח נתונים חכם</h3>
                    <p className="text-indigo-700/80 text-sm mb-4">
                        הפעל את ה-AI שלנו כדי לזהות דפוסים, צווארי בקבוק והמלצות לשיפור השירות באופן אוטומטי.
                    </p>
                    <Button 
                        onClick={() => setIsEnabled(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                    >
                        <Brain className="w-4 h-4 ml-2" />
                        הפעל ניתוח AI
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-indigo-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-50 flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-lg text-indigo-900">תובנות המערכת</CardTitle>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refetch()}
                    disabled={isLoading || isRefetching}
                    className="text-indigo-600 hover:bg-indigo-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading || isRefetching ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                {(isLoading || isRefetching) ? (
                    <div className="p-6 space-y-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Skeleton className="h-24" />
                            <Skeleton className="h-24" />
                        </div>
                    </div>
                ) : insights ? (
                    <div className="divide-y divide-indigo-50">
                        {/* Summary */}
                        <div className="p-4 bg-indigo-50/30">
                            <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                                {insights.summary}
                            </p>
                        </div>

                        {/* Bottlenecks */}
                        <div className="p-4">
                            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" />
                                צווארי בקבוק
                            </h4>
                            <div className="space-y-3">
                                {insights.bottlenecks?.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-3 bg-red-50 p-3 rounded-lg border border-red-100">
                                        <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                                            item.severity === 'high' ? 'bg-red-500' : 
                                            item.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                                        }`} />
                                        <div>
                                            <p className="text-sm font-semibold text-red-900">{item.title}</p>
                                            <p className="text-xs text-red-700 mt-1">{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div className="p-4">
                            <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Lightbulb className="w-3 h-3" />
                                המלצות לשיפור
                            </h4>
                            <ul className="space-y-2">
                                {insights.recommendations?.map((rec, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                        <span className="text-indigo-500 mt-1">•</span>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-500">
                        לא נמצאו נתונים לניתוח
                    </div>
                )}
            </CardContent>
        </Card>
    );
}