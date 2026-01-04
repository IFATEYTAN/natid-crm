import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AIInsightsWidget() {
    return (
        <Card className="border-indigo-100 overflow-hidden h-full">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-50 pb-4">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg text-indigo-900">תובנות המערכת (AI)</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="space-y-6">
                    {/* Load Prediction */}
                    <div>
                        <h4 className="font-semibold text-sm text-neutral-800 mb-1">תחזית עומסים</h4>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            צפוי עומס חריג (עלייה של 40%) בין השעות 16:00-19:00 עקב עומסי חום כבדים באזור המרכז. מומלץ לתגבר מוקדנים.
                        </p>
                    </div>
                    
                    {/* Geographic Bottlenecks */}
                    <div>
                        <h4 className="font-semibold text-sm text-neutral-800 mb-1">זיהוי פערי כיסוי (Bottlenecks)</h4>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            זוהה ביקוש גבוה באזור צפון תל אביב עם רק 2 ניידות שירות זמינות ברדיוס של 10 ק"מ. זמן הגעה משוער (ETA) עלול לחרוג מה-SLA.
                        </p>
                    </div>

                    {/* Optimal Vendor Recommendation */}
                    <div>
                        <h4 className="font-semibold text-sm text-neutral-800 mb-1">המלצה למיקום אופטימלי</h4>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                            מומלץ לקדם 2 ספקים פנויים למחלפי איילון (השלום / קק"ל) לקיצור זמני הגעה ב-15% בשעות העומס הקרובות.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}