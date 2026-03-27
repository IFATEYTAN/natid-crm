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
    fax: z.string().optional().default(''),
    address: z.string().optional().default(''),
    city: z.string().optional().default(''),
    company_id: z.string().optional().default(''),
    insurance_agency: z.string().optional().default(''),
    inspector_name: z.string().optional().default(''),
    inspector_phone: z.string().optional().default(''),
    inspector_fax: z.string().optional().default(''),
    handler_name: z.string().optional().default(''),
    handler_phone: z.string().optional().default(''),
    handler_fax: z.string().optional().default(''),
    status_text: z.string().optional().default(''),
    department_contracts: z.string().optional().default(''),
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
  const cleaned = { ...formData };

  // Convert payment_rate_per_call to number or remove it entirely
  if (cleaned.payment_rate_per_call === '' || cleaned.payment_rate_per_call == null) {
    delete cleaned.payment_rate_per_call;
  } else {
    cleaned.payment_rate_per_call = Number(cleaned.payment_rate_per_call);
  }

  // Remove fields not in the Zod schema to avoid .strict() rejection
  delete cleaned.coverage_cities;
  delete cleaned.vehicle_types_supported;

  const result = vendorCreateSchema.safeParse(cleaned);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`שגיאת ולידציה: ${errors.join(', ')}`);
  }

  // Re-add optional fields that exist on the entity but not in the Zod schema
  const output = result.data;
  if (formData.coverage_cities) output.coverage_cities = formData.coverage_cities;
  if (formData.vehicle_types_supported?.length) output.vehicle_types_supported = formData.vehicle_types_supported;

  return output;
}

/**
 * Sanitize form data for vendor update.
 * Same as create but all fields optional.
 */
export function sanitizeVendorUpdate(formData) {
  const cleaned = { ...formData };

  if (cleaned.payment_rate_per_call === '' || cleaned.payment_rate_per_call == null) {
    delete cleaned.payment_rate_per_call;
  } else {
    cleaned.payment_rate_per_call = Number(cleaned.payment_rate_per_call);
  }

  delete cleaned.coverage_cities;
  delete cleaned.vehicle_types_supported;

  const result = vendorUpdateSchema.safeParse(cleaned);

  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`שגיאת ולידציה: ${errors.join(', ')}`);
  }

  const output = result.data;
  if (formData.coverage_cities) output.coverage_cities = formData.coverage_cities;
  if (formData.vehicle_types_supported?.length) output.vehicle_types_supported = formData.vehicle_types_supported;

  return output;
}