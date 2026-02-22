import { z } from 'zod';

/**
 * Vendor entity schema — based on Base44 entity definition
 * Source: SYSTEM_SPECIFICATION_v3.md section 5.3
 *
 * Fields marked as "writable" can be sent in create/update requests.
 * Fields marked as "computed" are set by the backend and should NOT be sent.
 */

const vendorAvailabilityStatus = z.enum(['available', 'busy', 'on_break', 'offline']);

const vendorType = z.enum(['internal', 'external']);

const serviceTypeEnum = z.enum([
  'tow_truck',
  'mechanic',
  'tire_service',
  'locksmith',
  'fuel_delivery',
  'battery',
  'multi_service',
]);

/**
 * Schema for creating a new vendor.
 * Only includes writable fields that the Base44 API accepts.
 */
export const vendorCreateSchema = z
  .object({
    vendor_name: z.string().min(1, 'שם ספק הוא שדה חובה'),
    phone: z.string().min(1, 'טלפון הוא שדה חובה'),
    email: z.string().email('כתובת אימייל לא תקינה').optional().or(z.literal('')),
    contact_person: z.string().optional().default(''),
    phone_2: z.string().optional().default(''),
    service_type: z.array(z.string()).optional().default([]),
    coverage_areas: z.array(z.string()).optional().default([]),
    availability_status: vendorAvailabilityStatus.optional().default('available'),
    is_active: z.boolean().optional().default(true),
    is_available_now: z.boolean().optional(),
    vendor_type: vendorType.optional(),
    payment_rate_per_call: z.union([z.number(), z.null()]).optional().default(null),
    notes: z.string().optional().default(''),
    works_24_7: z.boolean().optional().default(false),
    working_hours_start: z.string().optional().default('08:00'),
    working_hours_end: z.string().optional().default('18:00'),
    profile_image: z.string().optional().default(''),
    operating_hours: z.string().optional(),
    service_radius: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  .strict();

/**
 * Schema for updating an existing vendor.
 * All fields are optional since we might update only a subset.
 */
export const vendorUpdateSchema = vendorCreateSchema.partial();

/**
 * Sanitize form data for vendor creation.
 * Strips unknown fields, converts types, removes empty optional values.
 */
export function sanitizeVendorCreate(formData) {
  const cleaned = {
    ...formData,
    payment_rate_per_call:
      formData.payment_rate_per_call !== '' && formData.payment_rate_per_call != null
        ? Number(formData.payment_rate_per_call)
        : null,
  };

  const result = vendorCreateSchema.safeParse(cleaned);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`שגיאת ולידציה: ${errors.join(', ')}`);
  }

  return result.data;
}

/**
 * Sanitize form data for vendor update.
 * Same as create but all fields optional.
 */
export function sanitizeVendorUpdate(formData) {
  const cleaned = {
    ...formData,
    payment_rate_per_call:
      formData.payment_rate_per_call !== '' && formData.payment_rate_per_call != null
        ? Number(formData.payment_rate_per_call)
        : null,
  };

  const result = vendorUpdateSchema.safeParse(cleaned);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`שגיאת ולידציה: ${errors.join(', ')}`);
  }

  return result.data;
}
