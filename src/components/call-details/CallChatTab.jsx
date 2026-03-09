import { lazyRetry } from '@/lib/lazyRetry';
import React, { Suspense } from 'react';
import { MessageSquare, Truck, CheckCircle, Headset, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EnhancedCallChat = lazyRetry(() => import('@/components/chat/EnhancedCallChat'));

export default function CallChatTab({ callId, call, currentUser, onSendStatusMessage }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Suspense fallback={<div className="h-[500px] w-full bg-gray-50" />}>
          <EnhancedCallChat
            callId={callId}
            currentUserRole="operator"
            currentUserName={currentUser?.full_name || 'מוקדן'}
            height="500px"
          />
        </Suspense>
      </div>
      <div className="space-y-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">שלח עדכון ללקוח</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => onSendStatusMessage(callId, 'הקריאה התקבלה ואנחנו מטפלים בה')}
            >
              <MessageSquare className="w-4 h-4" />
              קריאה התקבלה
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => onSendStatusMessage(callId, 'הספק בדרך אליך!')}
            >
              <Truck className="w-4 h-4" />
              ספק בדרך
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => onSendStatusMessage(callId, 'הספק הגיע למיקום')}
            >
              <CheckCircle className="w-4 h-4" />
              ספק הגיע
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => onSendStatusMessage(callId, 'הטיפול הושלם בהצלחה!')}
            >
              <CheckCircle className="w-4 h-4 text-green-500" />
              טיפול הושלם
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">משתתפים בשיחה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Headset className="w-3 h-3 text-white" />
              </div>
              <span>מוקדן</span>
            </div>
            {call?.assigned_vendor_name && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Truck className="w-3 h-3 text-white" />
                </div>
                <span>{call.assigned_vendor_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                <User className="w-3 h-3 text-white" />
              </div>
              <span>{call?.customer_name}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
