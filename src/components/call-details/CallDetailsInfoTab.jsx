import React, { Suspense } from 'react';
import { User, Car, MapPin, Truck, PenTool, CheckCircle, Mic, ExternalLink, Shield, FileText, Clock, Key, Warehouse, Pencil, AlertTriangle, Star, CreditCard, Timer, Phone, Mail, Hash, Navigation, Fuel, Settings, Info } from 'lucide-react';
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

const sourceLabels = {
  bot: 'בוט',
  operator: 'מוקדן',
  customer_app: 'אפליקציית לקוח',
  vendor_interface: 'ממשק ספק',
};

const priorityLabels = {
  normal: 'רגיל',
  urgent: 'דחוף',
  critical: 'קריטי',
};

const priorityColors = {
  normal: 'bg-gray-100 text-gray-700',
  urgent: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

const paymentTypeLabels = {
  credit_card: 'כרטיס אשראי',
  cash: 'מזומן',
  bank_transfer: 'העברה בנקאית',
  none: 'ללא',
};

const slaStatusLabels = {
  on_track: 'עומד ביעד',
  near_breach: 'קרוב לחריגה',
  breached: 'חריגה',
};

const slaStatusColors = {
  on_track: 'bg-green-100 text-green-800',
  near_breach: 'bg-yellow-100 text-yellow-800',
  breached: 'bg-red-100 text-red-800',
};

const BoolField = ({ value, label }) => (
  <div className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
    <span className="text-sm text-[#6B778C]">{label}</span>
    <span className={`text-sm font-medium ${value ? 'text-green-700' : 'text-red-600'}`}>
      {value ? 'כן' : 'לא'}
    </span>
  </div>
);

const InfoField = ({ label, value, dir }) => (
  <div>
    <Label className="text-xs text-[#6B778C]">{label}</Label>
    <p className="font-medium" dir={dir}>{value || '-'}</p>
  </div>
);

export default function CallDetailsInfoTab({
  call,
  callId,
  photos,
  showSignature,
  setShowSignature,
  onSignatureSaved,
  onEditCall,
}) {
  return (
    <div className="space-y-4">
      {/* Edit Button */}
      {onEditCall && (
        <div className="flex justify-end">
          <Button className="gap-2" onClick={onEditCall}>
            <Pencil className="w-4 h-4" />
            ערוך את כל הפרטים
          </Button>
        </div>
      )}

      {/* Call Meta Info */}
      <Card className="bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="w-4 h-4 text-[#6B778C]" />
            פרטי קריאה כלליים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoField label="מספר קריאה" value={call?.call_number} />
            <div>
              <Label className="text-xs text-[#6B778C]">עדיפות</Label>
              <div className="mt-0.5">
                <Badge className={priorityColors[call?.call_priority] || priorityColors.normal}>
                  {priorityLabels[call?.call_priority] || 'רגיל'}
                </Badge>
                {call?.is_vip && <Badge className="bg-purple-100 text-purple-800 mr-1">VIP</Badge>}
              </div>
            </div>
            <InfoField label="מקור קריאה" value={sourceLabels[call?.created_by_source] || call?.created_by_source || '-'} />
            <InfoField label="נפתחה על ידי" value={call?.created_by} />
            <InfoField label="תאריך פתיחה" value={formatDateTime(call?.created_date)} />
            {call?.closed_at && <InfoField label="תאריך סגירה" value={formatDateTime(call?.closed_at)} />}
            {call?.closed_by && <InfoField label={'נסגרה ע"י'} value={call?.closed_by} />}
            {call?.sla_status && (
              <div>
                <Label className="text-xs text-[#6B778C]">סטטוס SLA</Label>
                <div className="mt-0.5">
                  <Badge className={slaStatusColors[call?.sla_status] || 'bg-gray-100'}>
                    {slaStatusLabels[call?.sla_status] || call?.sla_status}
                  </Badge>
                </div>
              </div>
            )}
            {call?.sla_target && <InfoField label="יעד SLA (דקות)" value={call?.sla_target} />}
          </div>
        </CardContent>
      </Card>

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
              <InfoField label="שם" value={call?.customer_name} />
              <InfoField label="ת.ז." value={call?.customer_id_number} dir="ltr" />
              <InfoField label="טלפון ראשי" value={call?.customer_phone} dir="ltr" />
              <InfoField label="טלפון משני" value={call?.customer_phone_2} dir="ltr" />
              <InfoField label="אימייל" value={call?.customer_email} />
              <InfoField label="כתובת" value={call?.customer_address} />
              {call?.customer_response_code && <InfoField label="קוד לזיהוי לקוח" value={call?.customer_response_code} />}
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
              <InfoField label="חברת ביטוח" value={call?.insurance_company} />
              <InfoField label="חבילה" value={call?.membership_package} />
              <InfoField label="מספר מנוי" value={call?.membership_number} dir="ltr" />
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
              <InfoField label="מספר רכב" value={call?.vehicle_plate} dir="ltr" />
              <InfoField label="דגם" value={call?.vehicle_model} />
              <InfoField label="שנת ייצור" value={call?.vehicle_year} />
              <InfoField label="סוג רכב" value={vehicleTypeLabels[call?.vehicle_type] || call?.vehicle_type} />
              <InfoField label="סוג דלק" value={fuelTypeLabels[call?.fuel_type] || call?.fuel_type} />
              <InfoField label="קודן" value={call?.vehicle_code} />
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
              <InfoField label="סוג תקלה" value={issueTypeLabels[call?.issue_type] || call?.issue_type} />
              {call?.has_key !== undefined && (
                <div>
                  <Label className="text-xs text-[#6B778C]">יש מפתח</Label>
                  <p className={`font-medium ${call?.has_key ? 'text-green-700' : 'text-red-600'}`}>{call?.has_key ? 'כן' : 'לא'}</p>
                </div>
              )}
              {call?.key_location && <InfoField label="מיקום מפתח" value={call?.key_location} />}
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
                <InfoField label="כתובת/מיקום" value={call?.pickup_location_address} />
              </div>
              <InfoField label="עיר" value={call?.pickup_location_city} />
              <InfoField label="אזור" value={areaLabels[call?.pickup_location_area] || call?.pickup_location_area} />
            </div>

            {/* Technical conditions at location */}
            <div className="border-t pt-2 mt-2 space-y-1">
              <Label className="text-xs text-[#6B778C] font-semibold">תנאי מיקום:</Label>
              <div className="grid grid-cols-2 gap-x-4">
                <BoolField label="גישה למשאית גרר" value={call?.is_road_accessible} />
                <BoolField label="חניון תת קרקעי" value={call?.is_underground_parking} />
                <BoolField label="כביש אגרה" value={call?.is_toll_road} />
                <BoolField label="לקוח ליד הרכב" value={call?.is_customer_with_vehicle} />
              </div>
            </div>

            {/* Drop-off */}
            {(call?.dropoff_garage_name || call?.dropoff_location_address) && (
              <>
                <div className="border-t pt-2 mt-2">
                  <Label className="text-xs text-[#6B778C] font-semibold">יעד פריקה סופי:</Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {call?.dropoff_garage_name && <InfoField label="מוסך" value={call.dropoff_garage_name} />}
                  {call?.dropoff_garage_phone && <InfoField label="טלפון מוסך" value={call.dropoff_garage_phone} dir="ltr" />}
                  <div className="col-span-2">
                    <InfoField label="כתובת יעד" value={call?.dropoff_location_address} />
                  </div>
                  <InfoField label="עיר" value={call?.dropoff_location_city} />
                  <InfoField label="אזור" value={areaLabels[call?.dropoff_location_area] || call?.dropoff_location_area} />
                </div>
              </>
            )}

            {/* Storage */}
            {(call?.storage_location_address || call?.storage_location_city) && (
              <>
                <div className="border-t pt-2 mt-2">
                  <Label className="text-xs text-[#6B778C] font-semibold flex items-center gap-1">
                    <Warehouse className="w-3 h-3" /> מיקום אחסנה:
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <InfoField label="כתובת" value={call?.storage_location_address} />
                  </div>
                  <InfoField label="עיר" value={call?.storage_location_city} />
                  <InfoField label="אזור" value={areaLabels[call?.storage_location_area]} />
                  {call?.storage_days && <InfoField label="ימי אחסנה" value={call?.storage_days} />}
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
                  <InfoField label="נותן השירות" value={call.assigned_vendor_name} />
                  <InfoField label="אזור" value={areaLabels[call?.assigned_vendor_area] || call?.assigned_vendor_area} />
                  <InfoField label="שובץ ב-" value={formatDateTime(call.assigned_at)} />
                  <InfoField label="צפי הגעה" value={formatDateTime(call.vendor_arrival_time_estimated)} />
                  {call.vendor_arrival_time_actual && <InfoField label="הגעה בפועל" value={formatDateTime(call.vendor_arrival_time_actual)} />}
                  {call.service_end_time && <InfoField label="סיום טיפול" value={formatDateTime(call.service_end_time)} />}
                  {call.estimated_distance_km && <InfoField label="מרחק מוערך (ק״מ)" value={call.estimated_distance_km} />}
                  {call.estimated_arrival_time && <InfoField label="זמן הגעה מחושב" value={formatDateTime(call.estimated_arrival_time)} />}
                </div>
                {call.early_notification_minutes && (
                  <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>הודעה מוקדמת: {call.early_notification_minutes} דקות לפני הגעה</span>
                  </div>
                )}
                {call.vendor_notes && (
                  <div>
                    <Label className="text-xs text-[#6B778C]">הערות מהספק</Label>
                    <p className="text-sm bg-[#F4F5F7] p-2 rounded mt-1">{call.vendor_notes}</p>
                  </div>
                )}
                {call.cost_to_vendor && (
                  <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span>עלות לספק: ₪{call.cost_to_vendor?.toLocaleString()}</span>
                  </div>
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

      {/* Technical Questionnaire + Payment + Timing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bot Questionnaire */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#6B778C]" />
              שאלון טכני מהבוט
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

        {/* Payment Info */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#6B778C]" />
              פרטי תשלום
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6B778C]">נדרש תשלום</Label>
                <p className={`font-medium ${call?.payment_required ? 'text-red-600' : 'text-green-700'}`}>
                  {call?.payment_required ? 'כן' : 'לא'}
                </p>
              </div>
              {call?.payment_reason && <InfoField label="סיבת תשלום" value={call?.payment_reason} />}
              {call?.payment_amount_customer && <InfoField label="סכום מהלקוח" value={`₪${call?.payment_amount_customer?.toLocaleString()}`} />}
              {call?.payment_type && <InfoField label="אמצעי תשלום" value={paymentTypeLabels[call?.payment_type] || call?.payment_type} />}
              {call?.payment_date && <InfoField label="תאריך תשלום" value={formatDateTime(call?.payment_date)} />}
              {call?.cost_to_vendor && <InfoField label="עלות לספק" value={`₪${call?.cost_to_vendor?.toLocaleString()}`} />}
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        {(call?.time_waiting || call?.time_to_vendor_assignment || call?.time_to_completion) && (
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Timer className="w-4 h-4 text-[#6B778C]" />
                מדדי זמן
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {call?.time_waiting && <InfoField label="זמן המתנה (דקות)" value={call?.time_waiting} />}
                {call?.time_to_vendor_assignment && <InfoField label="זמן עד שיוך ספק (דקות)" value={call?.time_to_vendor_assignment} />}
                {call?.time_to_completion && <InfoField label="זמן מפתיחה לסגירה (דקות)" value={call?.time_to_completion} />}
              </div>
            </CardContent>
          </Card>
        )}

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

      {/* Customer Feedback Summary (if exists) */}
      {(call?.customer_rating || call?.customer_feedback) && (
        <Card className="bg-white border-yellow-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              משוב לקוח
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {call?.customer_rating && (
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-5 h-5 ${s <= call.customer_rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="font-bold mr-2">{call.customer_rating}/5</span>
                </div>
              )}
            </div>
            {call?.customer_feedback && (
              <p className="text-sm bg-gray-50 p-2 rounded mt-2">{call.customer_feedback}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Call Summary (if exists) */}
      {(call?.summary_draft || call?.summary_final) && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6B778C]" />
              סיכום קריאה
            </CardTitle>
          </CardHeader>
          <CardContent>
            {call?.summary_final ? (
              <div>
                <Label className="text-xs text-green-600 font-medium">סיכום סופי:</Label>
                <p className="text-sm bg-green-50 p-3 rounded mt-1 whitespace-pre-line">{call.summary_final}</p>
              </div>
            ) : call?.summary_draft ? (
              <div>
                <Label className="text-xs text-blue-600 font-medium">טיוטת סיכום:</Label>
                <p className="text-sm bg-blue-50 p-3 rounded mt-1 whitespace-pre-line">{call.summary_draft}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Operator Notes (read-only display) */}
      {call?.operator_notes && (
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#6B778C]" />
              הערות מוקדן
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm bg-yellow-50 p-3 rounded whitespace-pre-line">{call.operator_notes}</p>
          </CardContent>
        </Card>
      )}

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