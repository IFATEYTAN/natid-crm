import { z } from 'zod';

/**
 * Call entity schema — based on Base44 entity definition
 * Source: SYSTEM_SPECIFICATION_v3.md section 5.1
 */

const callStatus = z.enum([
  'waiting_treatment',
  'awaiting_assignment',
  'assigning',
  'vendor_enroute',
  'in_progress',
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
    service_type: serviceType.optional(),
    issue_type: z.string().optional().default(''),
    issue_description: z.string().optional().default(''),
    dispatch_type: dispatchType.optional(),
    customer_source: customerSource.optional().default('phone'),
    pickup_location_address: z.string().min(1, 'כתובת איסוף היא שדה חובה'),
    pickup_location_city: z.string().optional().default(''),
    pickup_location_lat: z.number().optional(),
    pickup_location_lng: z.number().optional(),
    dropoff_location_address: z.string().optional().default(''),
    dropoff_location_city: z.string().optional().default(''),
    dropoff_location_lat: z.number().optional(),
    dropoff_location_lng: z.number().optional(),
    assigned_vendor_id: z.string().optional(),
    assigned_vendor_name: z.string().optional().default(''),
    internal_notes: z.string().optional().default(''),
    vendor_notes: z.string().optional().default(''),
    questionnaire_answers: z.record(z.unknown()).optional(),
    recording_url: z.string().optional().default(''),
    closing_call_done: z.boolean().optional().default(false),
    cost_to_vendor: z.union([z.number(), z.null()]).optional(),
    sla_deadline: z.string().optional(),
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
