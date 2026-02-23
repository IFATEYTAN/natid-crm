import React, { Suspense } from 'react';
import { User, Car, MapPin, Truck, PenTool, CheckCircle, Mic, ExternalLink, Shield, FileText, Clock, Key, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/components/utils';
import { issueTypeLabels } from './callDetailsConstants';

const SignaturePad = React.lazy(() => import('@/components/signature/SignaturePad'));

const vehicleTypeLabels = {
  private: 'פרטי',
  commercial_light: 'מסחרי קל',
  truck: 'משאית',
  motorcycle: 'אופנוע',
};

const fuelTypeLabels = {
  gasoline: 'בנזין',
  diesel: 'דיזל',
  hybrid: 'היברידי',
  electric: 'חשמלי',
};

const areaLabels = {
  center: 'המרכז',
  sharon: 'השרון',
  north: 'צפון',
  south: 'דרום',
  jerusalem: 'ירושלים',
  lowlands: 'שפלה',
};

const BoolField = ({ value, label }) => (
  <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
    <span className="text-sm text-[#6B778C]">{label}</span>
    <span className={`text-sm font-medium ${value ? 'text-green-700' : 'text-red-600'}`}>
      {value ? 'כן' : 'לא'}
    </span>
  </div>
);

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
                <Label className="text-xs text-[#6B778C]">ת.ז.</Label>
                <p className="font-medium" dir="ltr">{call?.customer_id_number || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">טלפון ראשי</Label>
                <p className="font-medium" dir="ltr">{call?.customer_phone || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">טלפון משני</Label>
                <p className="font-medium" dir="ltr">{call?.customer_phone_2 || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">אימייל</Label>
                <p className="font-medium text-sm">{call?.customer_email || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">כתובת</Label>
                <p className="font-medium text-sm">{call?.customer_address || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance & Coverage */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6B778C]" />
              ביטוח וכיסוי
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6B778C]">חברת ביטוח</Label>
                <p className="font-medium">{call?.insurance_company || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">חבילה</Label>
                <p className="font-medium">{call?.membership_package || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">מספר מנוי</Label>
                <p className="font-medium" dir="ltr">{call?.membership_number || '-'}</p>
              </div>
            </div>
            {call?.coverage_details && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <Label className="text-xs text-blue-600 font-medium">פירוט כיסוי:</Label>
                <p className="text-sm text-blue-800 mt-1">{call.coverage_details}</p>
              </div>
            )}
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
                <p className="font-medium" dir="ltr">{call?.vehicle_plate || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">דגם</Label>
                <p className="font-medium">{call?.vehicle_model || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">שנת ייצור</Label>
                <p className="font-medium">{call?.vehicle_year || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">סוג רכב</Label>
                <p className="font-medium">{vehicleTypeLabels[call?.vehicle_type] || call?.vehicle_type || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">סוג דלק</Label>
                <p className="font-medium">{fuelTypeLabels[call?.fuel_type] || call?.fuel_type || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">קודן</Label>
                <p className="font-medium">{call?.vehicle_code || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issue Details */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6B778C]" />
              פירוט התקלה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6B778C]">סוג תקלה</Label>
                <p className="font-medium">{issueTypeLabels[call?.issue_type] || call?.issue_type || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">מיקום מפתח</Label>
                <p className="font-medium">{call?.key_location || '-'}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-[#6B778C]">תיאור התקלה</Label>
              <p className="text-sm bg-gray-50 p-2 rounded mt-1">{call?.issue_description || '-'}</p>
            </div>
            {call?.operation_instructions && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
                <Label className="text-xs text-amber-700 font-medium">הוראות תפעול:</Label>
                <p className="text-sm text-amber-800 mt-1">{call.operation_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location - Pickup */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#6B778C]" />
              מיקום למתן שירות
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs text-[#6B778C]">כתובת/מיקום</Label>
                <p className="font-medium">{call?.pickup_location_address || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">עיר</Label>
                <p className="font-medium">{call?.pickup_location_city || '-'}</p>
              </div>
              <div>
                <Label className="text-xs text-[#6B778C]">אזור</Label>
                <p className="font-medium">{areaLabels[call?.pickup_location_area] || call?.pickup_location_area || '-'}</p>
              </div>
            </div>
            {call?.dropoff_garage_name && (
              <>
                <div className="border-t pt-2 mt-2">
                  <Label className="text-xs text-[#6B778C] font-semibold">יעד פריקה סופי:</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-[#6B778C]">מוסך</Label>
                    <p className="font-medium">{call.dropoff_garage_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">טלפון מוסך</Label>
                    <p className="font-medium" dir="ltr">{call.dropoff_garage_phone || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-[#6B778C]">כתובת יעד</Label>
                    <p className="font-medium">{call.dropoff_location_address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">עיר</Label>
                    <p className="font-medium">{call.dropoff_location_city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">אזור</Label>
                    <p className="font-medium">{areaLabels[call?.dropoff_location_area] || call?.dropoff_location_area || '-'}</p>
                  </div>
                </div>
              </>
            )}
            {(call?.storage_location_address || call?.storage_location_city) && (
              <>
                <div className="border-t pt-2 mt-2">
                  <Label className="text-xs text-[#6B778C] font-semibold flex items-center gap-1">
                    <Warehouse className="w-3 h-3" /> מיקום אחסנה:
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label className="text-xs text-[#6B778C]">כתובת</Label>
                    <p className="font-medium">{call.storage_location_address || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">עיר</Label>
                    <p className="font-medium">{call.storage_location_city || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">אזור</Label>
                    <p className="font-medium">{areaLabels[call?.storage_location_area] || '-'}</p>
                  </div>
                </div>
              </>
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
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-[#6B778C]">נותן השירות</Label>
                    <p className="font-medium text-lg">{call.assigned_vendor_name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">אזור</Label>
                    <p className="font-medium">{areaLabels[call?.assigned_vendor_area] || call?.assigned_vendor_area || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">שובץ ב-</Label>
                    <p className="text-sm">{formatDateTime(call.assigned_at)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-[#6B778C]">צפי הגעה</Label>
                    <p className="text-sm">{formatDateTime(call.vendor_arrival_time_estimated) || '-'}</p>
                  </div>
                  {call.vendor_arrival_time_actual && (
                    <div>
                      <Label className="text-xs text-[#6B778C]">הגעה בפועל</Label>
                      <p className="text-sm">{formatDateTime(call.vendor_arrival_time_actual)}</p>
                    </div>
                  )}
                  {call.service_end_time && (
                    <div>
                      <Label className="text-xs text-[#6B778C]">סיום טיפול</Label>
                      <p className="text-sm">{formatDateTime(call.service_end_time)}</p>
                    </div>
                  )}
                </div>
                {call.early_notification_minutes && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>הודעה מוקדמת: {call.early_notification_minutes} דקות לפני הגעה</span>
                  </div>
                )}
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

      {/* Technical Questionnaire */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bot Questionnaire */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#6B778C]" />
              שאלון מהבוט
            </CardTitle>
          </CardHeader>
          <CardContent>
            {call?.questionnaire_answers && Object.keys(call.questionnaire_answers).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(call.questionnaire_answers).map(([key, value], idx) => (
                  <div
                    key={key}
                    className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-sm text-[#6B778C]">
                      <span className="text-xs text-gray-400 ml-1">#{idx + 1}</span>
                      {key}
                    </span>
                    <span className={`text-sm font-medium ${
                      value === true || value === 'כן' ? 'text-green-700' : 
                      value === false || value === 'לא' ? 'text-red-600' : ''
                    }`}>
                      {typeof value === 'boolean' ? (value ? 'כן' : 'לא') : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <BoolField label="גישה מלאה למשאית גרר" value={call?.is_road_accessible} />
                <BoolField label="חניון תת קרקעי/מקורה" value={call?.is_underground_parking} />
                <BoolField label="ידית הילוכים על N" value={call?.is_gear_neutral} />
                <BoolField label="ההגה נעול" value={call?.is_steering_locked} />
                <BoolField label="בלם יד משוחרר" value={call?.is_handbrake_released} />
                <BoolField label="כביש אגרה" value={call?.is_toll_road} />
                <BoolField label="לקוח ליד הרכב עם מפתח" value={call?.is_customer_with_vehicle} />
                <BoolField label="יש מפתח" value={call?.has_key} />
              </div>
            )}
          </CardContent>
        </Card>

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