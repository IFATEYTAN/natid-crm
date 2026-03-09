import { z } from 'zod';

/**
 * Customer entity schema — based on Base44 entity definition
 * Source: SYSTEM_SPECIFICATION_v3.md section 5.2
 */

const customerType = z.enum(['insurance_company', 'fleet', 'individual', 'garage', 'other']);

const contractType = z.enum(['monthly', 'yearly', 'per_call', 'none']);

const customerStatus = z.enum(['active', 'inactive', 'suspended']);

const subscriptionStatus = z.enum(['active', 'suspended', 'cancelled', 'expired']);

const paymentMethod = z.enum(['credit_card', 'bank_transfer', 'cash', 'check']);

const vehicleType = z.enum(['private', 'commercial_light', 'commercial_heavy', 'motorcycle']);

/**
 * Schema for creating a new customer.
 */
export const customerCreateSchema = z
  .object({
    name: z.string().min(1, 'שם לקוח הוא שדה חובה'),
    customer_type: customerType.optional(),
    contact_person: z.string().optional().default(''),
    phone: z.string().min(1, 'טלפון הוא שדה חובה'),
    email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
    address: z.string().optional().default(''),
    city: z.string().optional().default(''),
    contract_type: contractType.optional().default('none'),
    sla_response_minutes: z.number().optional(),
    sla_arrival_minutes: z.number().optional(),
    monthly_budget: z.union([z.number(), z.null()]).optional(),
    status: customerStatus.optional().default('active'),
    // Subscription fields
    subscription_sequence: z.union([z.number(), z.null()]).optional(),
    subscription_start_date: z.string().optional().default(''),
    subscription_end_date: z.string().optional().default(''),
    subscription_issue_date: z.string().optional().default(''),
    subscription_status: subscriptionStatus.optional(),
    // Payment fields
    payment_method: paymentMethod.optional(),
    payment_date: z.string().optional().default(''),
    // Alerts
    alerts: z.string().optional().default(''),
    // Vehicle fields
    vehicle_type: vehicleType.optional(),
    vehicle_model: z.string().optional().default(''),
    vehicle_year: z.union([z.number(), z.null()]).optional(),
    vehicle_model_code: z.string().optional().default(''),
    vehicle_number: z.string().optional().default(''),
    vehicle_personal_import: z.boolean().optional().default(false),
    vehicle_license_expiry: z.string().optional().default(''),
    // Coverage & contract fields
    agent_contract: z.string().optional().default(''),
    coverage_details: z.string().optional().default(''),
  })
  .strict();

/**
 * Schema for updating an existing customer.
 */
export const customerUpdateSchema = customerCreateSchema.partial();

/**
 * Sanitize form data for customer creation.
 */
export function sanitizeCustomerCreate(formData) {
  const result = customerCreateSchema.safeParse(formData);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`שגיאת ולידציה: ${errors.join(', ')}`);
  }

  return result.data;
}
