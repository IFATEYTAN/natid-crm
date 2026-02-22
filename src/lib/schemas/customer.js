import { z } from 'zod';

/**
 * Customer entity schema — based on Base44 entity definition
 * Source: SYSTEM_SPECIFICATION_v3.md section 5.2
 */

const customerType = z.enum(['insurance_company', 'fleet', 'individual', 'garage', 'other']);

const contractType = z.enum(['monthly', 'yearly', 'per_call', 'none']);

const customerStatus = z.enum(['active', 'inactive', 'suspended']);

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
