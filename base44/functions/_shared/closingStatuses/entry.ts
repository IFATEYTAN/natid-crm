/**
 * Backend mirror of src/config/closingStatuses.js (rules only).
 *
 * MUST be kept in sync with the frontend copy. The frontend can't import backend
 * modules and vice-versa (Base44 Call/Function split), so the closing rules live in
 * both places. SMS texts are placeholders pending final wording from the client.
 */

const PLACEHOLDER = '⚠️ נוסח SMS זמני — להחלפה בנוסח הסופי מהלקוח';

export const CLOSING_STATUS_MAP: Record<string, any> = {
  mobile_done: {
    label: 'ניידת שירות סיימה (התנעה / החלפת מצבר / החלפת גלגל)',
    resultingStatus: 'completed',
    isFinal: true,
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: false,
  },
  mobile_failed_evac: {
    label: 'ניידת לא צלחה — בוצע פינוי לפלטפורמה',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  mobile_failed_send: {
    label: 'ניידת לא צלחה — יש לשלוח ניידת / גרר',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  tow_done: {
    label: 'גרר הגיע ליעד הסופי בהצלחה',
    resultingStatus: 'completed',
    isFinal: true,
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: false,
  },
  tow_failed_complex: {
    label: 'גרר לא הצליח — מקרה מורכב, יישלח גרר מותאם',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  extraction_continue: {
    label: 'לאחר חילוץ / חניון תת-קרקעי — גרירת המשך',
    resultingStatus: 'completed',
    sendsSms: true,
    smsText: PLACEHOLDER,
    createsContinuation: true,
    continuationCategory: 'towing',
  },
  tow_to_storage: {
    label: 'גרר לאחסנה',
    resultingStatus: 'in_storage',
    sendsSms: false,
    createsContinuation: false,
    isStorage: true,
  },
};

export function getClosingStatus(key: string) {
  return CLOSING_STATUS_MAP[key] || null;
}

// Fields copied from an origin call to a continuation call.
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

/**
 * Create a linked continuation call (service-role). Mirrors
 * src/features/calls/createContinuationCall.js.
 */
export async function createContinuationCall(
  base44: any,
  originCall: any,
  { serviceCategory = 'towing', caseCode }: { serviceCategory?: string; caseCode?: string } = {}
) {
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

  const payload: Record<string, any> = {
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

  return base44.asServiceRole.entities.Call.create(payload);
}
