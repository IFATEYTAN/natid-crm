import { z } from 'zod';

/**
 * Call entity schema — based on Base44 entity definition
 * Source: SYSTEM_SPECIFICATION_v3.md section 5.1
 */

const callStatus = z.enum([
  'waiting_treatment',
  'awaiting_assignment',
  'assigning',
  'assigned',
  'vendor_enroute',
  'vendor_arrived',
  'in_progress',
  'in_storage',
  'continued_treatment',
  'awaiting_payment',
  'future_service',
  'in_followup',
  'completed',
  'cancelled',
]);

const callPriority = z.enum(['low', 'normal', 'high', 'urgent']);

const serviceType = z.enum(['tow', 'mechanic', 'tire', 'locksmith', 'fuel', 'battery', 'combined']);

const dispatchType = z.enum(['mobile_unit', 'tow_truck']);

const customerSource = z.enum(['phone', 'bot']);

/**
 * Schema for creating a new call.
 */
const fuelType = z.enum(['gasoline', 'diesel', 'electric', 'hybrid', 'gas']);
const depositStatus = z.enum(['pending', 'collected', 'returned', 'cancelled']);

export const callCreateSchema = z
  .object({
    call_status: callStatus.optional().default('waiting_treatment'),
    priority: callPriority.optional().default('normal'),
    customer_name: z.string().min(1, 'שם לקוח הוא שדה חובה'),
    customer_phone: z.string().min(1, 'טלפון לקוח הוא שדה חובה'),
    insurance_company: z.string().optional().default(''),
    membership_package: z.string().optional().default(''),
    vehicle_plate: z.string().optional().default(''),
    vehicle_type: z.string().optional().default(''),
    vehicle_model: z.string().optional().default(''),
    vehicle_year: z.union([z.number(), z.null()]).optional(),
    fuel_type: fuelType.optional(),
    vehicle_model_code: z.string().optional().default(''),
    service_type: serviceType.optional(),
    issue_type: z.string().optional().default(''),
    issue_description: z.string().optional().default(''),
    dispatch_type: dispatchType.optional(),
    customer_source: customerSource.optional().default('phone'),
    pickup_location_address: z.string().min(1, 'כתובת איסוף היא שדה חובה'),
    pickup_location_city: z.string().optional().default(''),
    pickup_location_lat: z.number().optional(),
    pickup_location_lon: z.number().optional(),
    dropoff_location_address: z.string().optional().default(''),
    dropoff_location_city: z.string().optional().default(''),
    dropoff_location_lat: z.number().optional(),
    dropoff_location_lon: z.number().optional(),
    assigned_vendor_id: z.string().optional(),
    assigned_vendor_name: z.string().optional().default(''),
    internal_notes: z.string().optional().default(''),
    vendor_notes: z.string().optional().default(''),
    questionnaire_answers: z.record(z.unknown()).optional(),
    recording_url: z.string().optional().default(''),
    closing_call_done: z.boolean().optional().default(false),
    cost_to_vendor: z.union([z.number(), z.null()]).optional(),
    sla_deadline: z.string().optional(),
    // Coverage
    coverage_details: z.string().optional().default(''),
    // Exception questionnaire
    is_in_parking: z.boolean().optional().default(false),
    is_at_garage: z.boolean().optional().default(false),
    was_towed_before: z.boolean().optional().default(false),
    is_toll_road: z.boolean().optional().default(false),
    is_dirt_road: z.boolean().optional().default(false),
    // Customer questionnaire
    questionnaire_engine_starts: z.boolean().optional().default(false),
    questionnaire_gearbox_ok: z.boolean().optional().default(false),
    questionnaire_starter_sound: z.boolean().optional().default(false),
    questionnaire_automatic_neutral: z.boolean().optional().default(false),
    questionnaire_steering_free: z.boolean().optional().default(false),
    questionnaire_handbrake_electric: z.boolean().optional().default(false),
    questionnaire_truck_access: z.boolean().optional().default(false),
    // Deposit fields
    deposit_type: z.string().optional().default(''),
    deposit_amount: z.union([z.number(), z.null()]).optional(),
    deposit_date: z.string().optional().default(''),
    deposit_reason: z.string().optional().default(''),
    deposit_agent: z.string().optional().default(''),
    deposit_status: depositStatus.optional(),
    // Payment fields
    payment_type: z.string().optional().default(''),
    payment_date: z.string().optional().default(''),
    payment_amount: z.union([z.number(), z.null()]).optional(),
    payment_total: z.union([z.number(), z.null()]).optional(),
    payment_installments: z.union([z.number(), z.null()]).optional(),
    payment_delivered_to: z.string().optional().default(''),
    payment_agent: z.string().optional().default(''),
    payment_paid_for: z.string().optional().default(''),
    // Early alert
    early_alert_minutes: z.union([z.number(), z.null()]).optional(),
  })
  .strict();

/**
 * Schema for updating an existing call.
 */
export const callUpdateSchema = callCreateSchema.partial();

/**
 * Sanitize form data for call creation.
 */
export function sanitizeCallCreate(formData) {
  const result = callCreateSchema.safeParse(formData);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`שגיאת ולידציה: ${errors.join(', ')}`);
  }

  return result.data;
}
