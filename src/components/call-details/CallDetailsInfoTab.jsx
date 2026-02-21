import React, { Suspense } from 'react';
import { User, Car, MapPin, Truck, PenTool, CheckCircle, Mic, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/components/utils';
import { issueTypeLabels } from './callDetailsConstants';

const SignaturePad = React.lazy(() => import('@/components/signature/SignaturePad'));

export default function CallDetailsInfoTab({
  call,
  callId,
  photos,
  showSignature,
  setShowSignature,
  onSignatureSaved,
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Info */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-[#6B778C]" />
              פרטי לקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6B778C]">שם</Label>
                <p className="font-medium">{call?.customer_name || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">טלפון</Label>
                <p className="font-medium" dir="ltr">
                  {call?.customer_phone || '-'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">ביטוח</Label>
                <p className="font-medium">{call?.insurance_company || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">חבילה</Label>
                <p className="font-medium">{call?.membership_package || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Info */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="w-4 h-4 text-[#6B778C]" />
              פרטי רכב
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6B778C]">מספר רכב</Label>
                <p className="font-medium" dir="ltr">
                  {call?.vehicle_plate || '-'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">דגם</Label>
                <p className="font-medium">{call?.vehicle_model || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">סוג תקלה</Label>
                <p className="font-medium">
                  {issueTypeLabels[call?.issue_type] || call?.issue_type || '-'}
                </p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">תיאור</Label>
                <p className="text-sm">{call?.issue_description || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6B778C]" />
              מיקום
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-[#6B778C]">כתובת איסוף</Label>
              <p className="font-medium">{call?.pickup_location_address || '-'}</p>
              <p className="text-sm text-[#6B778C]">{call?.pickup_location_city}</p>
            </div>
            {call?.dropoff_location_address && (
              <div>
                <Label className="text-xs text-[#6B778C]">כתובת יעד</Label>
                <p className="font-medium">{call?.dropoff_location_address}</p>
                <p className="text-sm text-[#6B778C]">{call?.dropoff_location_city}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Vendor */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#6B778C]" />
              ספק משובץ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {call?.assigned_vendor_name ? (
              <div className="space-y-2">
                <p className="font-medium text-lg">{call.assigned_vendor_name}</p>
                <p className="text-sm text-[#6B778C]">שובץ ב-{formatDateTime(call.assigned_at)}</p>
                {call.vendor_notes && (
                  <p className="text-sm bg-[#F4F5F7] p-2 rounded">{call.vendor_notes}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-[#6B778C]">
                <Truck className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>טרם שובץ ספק</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recording & Questionnaire Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Call Recording */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#6B778C]" />
              הקלטת שיחה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {call?.recording_url ? (
              <div className="space-y-2">
                <a
                  href={call.recording_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  האזנה להקלטה
                </a>
                {call.closing_call_done && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    שיחת סגירה בוצעה
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-[#6B778C]">
                <Mic className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>אין הקלטה זמינה</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Questionnaire Answers */}
        {call?.questionnaire_answers && Object.keys(call.questionnaire_answers).length > 0 && (
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#6B778C]" />
                שאלון טכני
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(call.questionnaire_answers).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-[#6B778C]">{key}</span>
                    <span className="text-sm font-medium">
                      {typeof value === 'boolean' ? (value ? 'כן' : 'לא') : value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Signature Section */}
      {(call?.call_status === 'in_progress' || call?.call_status === 'completed') && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PenTool className="w-4 h-4 text-[#6B778C]" />
              חתימת לקוח
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showSignature ? (
              <Suspense fallback={<div className="h-64 w-full bg-gray-50" />}>
                <SignaturePad
                  callId={callId}
                  onSave={onSignatureSaved}
                  onCancel={() => setShowSignature(false)}
                />
              </Suspense>
            ) : (
              <div className="text-center py-6">
                {photos.some((p) => p.category === 'customer_signature') ? (
                  <div>
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                    <p className="text-green-600 font-medium">חתימה קיימת</p>
                  </div>
                ) : (
                  <>
                    <PenTool className="w-10 h-10 mx-auto mb-2 text-[#6B778C] opacity-50" />
                    <p className="text-[#6B778C] mb-4">טרם נחתם</p>
                    <Button onClick={() => setShowSignature(true)} className="gap-2">
                      <PenTool className="w-4 h-4" />
                      הוסף חתימה
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
