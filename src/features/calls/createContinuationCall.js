/**
 * createContinuationCall.js
 * -------------------------------------------------------
 * יוצר קריאת המשך מקושרת לקריאת מקור.
 *
 * קריאת המשך = מקטע טיפול נוסף באותו אירוע (למשל: ניידת לא צלחה → נדרש גרר,
 * חילוץ → גרירת המשך). הקריאה החדשה:
 *   - מעתיקה את פרטי הלקוח / הרכב / הביטוח מקריאת המקור
 *   - נקודת האיסוף = המיקום הנוכחי של הרכב (אחסנה → יעד → איסוף מקורי)
 *   - מקושרת למקור דרך parent_call_id + case_reference_code משותף
 *
 * מחזיר את אובייקט הקריאה שנוצר.
 * -------------------------------------------------------
 */

// שדות זהות שמועתקים כפי-שהם מקריאת המקור לקריאת ההמשך.
const COPIED_FIELDS = [
  'customer_name',
  'customer_phone',
  'customer_id_number',
  'customer_email',
  'customer_address',
  'insurance_company',
  'insurance_agent',
  'membership_package',
  'membership_number',
  'coverage_details',
  'vehicle_plate',
  'vehicle_model',
  'vehicle_year',
  'vehicle_type',
  'fuel_type',
  'vehicle_code',
  'issue_type',
  'is_vip',
  'call_priority',
];

export async function createContinuationCall(
  base44,
  originCall,
  { serviceCategory = 'towing', caseCode, createdByName } = {}
) {
  if (!originCall?.id) throw new Error('originCall is required');

  // נקודת האיסוף של מקטע ההמשך = המיקום הנוכחי של הרכב.
  const pickupAddress =
    originCall.storage_location_address ||
    originCall.dropoff_location_address ||
    originCall.pickup_location_address;
  const pickupCity =
    originCall.storage_location_city ||
    originCall.dropoff_location_city ||
    originCall.pickup_location_city;
  const pickupArea =
    originCall.storage_location_area ||
    originCall.dropoff_location_area ||
    originCall.pickup_location_area;

  const payload = {
    service_category: serviceCategory,
    call_status: 'waiting_treatment',
    created_by_source: 'operator',
    pickup_location_address: pickupAddress,
    pickup_location_city: pickupCity || undefined,
    pickup_location_area: pickupArea || undefined,
    parent_call_id: originCall.id,
    case_reference_code:
      caseCode || originCall.case_reference_code || originCall.call_number || undefined,
    operator_notes: `קריאת המשך מקריאה ${originCall.call_number || originCall.id}`,
  };

  for (const field of COPIED_FIELDS) {
    if (originCall[field] !== undefined && originCall[field] !== null) {
      payload[field] = originCall[field];
    }
  }

  void createdByName; // נשמר לשימוש עתידי (תיעוד מי פתח את ההמשך)

  return base44.entities.Call.create(payload);
}
