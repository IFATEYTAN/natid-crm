import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, MessageSquare, Zap, Settings } from 'lucide-react';
import { SlideUp } from '@/components/animations/AnimatedComponents';

export default function AgentsPage() {
  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">סוכנים</h1>
          <p className="text-[#6b7280] text-sm">ניהול סוכני AI אוטומטיים למערכת</p>
        </div>

        {/* Coming Soon */}
        <Card className="bg-white border border-[#e5e7eb]">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[#f3f4f6] flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-[#3b82f6]" />
              </div>
              <h2 className="text-xl font-semibold text-[#111827] mb-2">סוכני AI</h2>
              <p className="text-[#6b7280] max-w-md mx-auto mb-6">
                בקרוב תוכלו להגדיר סוכנים אוטומטיים שיטפלו במשימות שונות במערכת
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="p-4 rounded-[8px] bg-[#f9fafb] border border-[#e5e7eb]">
                  <MessageSquare className="w-6 h-6 text-[#3b82f6] mx-auto mb-2" />
                  <div className="text-sm font-medium text-[#111827]">צ'אט אוטומטי</div>
                  <div className="text-xs text-[#6b7280]">מענה ללקוחות</div>
                </div>
                <div className="p-4 rounded-[8px] bg-[#f9fafb] border border-[#e5e7eb]">
                  <Zap className="w-6 h-6 text-[#3b82f6] mx-auto mb-2" />
                  <div className="text-sm font-medium text-[#111827]">שיבוץ חכם</div>
                  <div className="text-xs text-[#6b7280]">התאמת ספקים</div>
                </div>
                <div className="p-4 rounded-[8px] bg-[#f9fafb] border border-[#e5e7eb]">
                  <Settings className="w-6 h-6 text-[#3b82f6] mx-auto mb-2" />
                  <div className="text-sm font-medium text-[#111827]">אוטומציה</div>
                  <div className="text-xs text-[#6b7280]">תהליכים אוטומטיים</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SlideUp>
  );
}
