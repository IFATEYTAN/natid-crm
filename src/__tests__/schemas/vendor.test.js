import { describe, it, expect } from 'vitest';
import {
  vendorCreateSchema,
  vendorUpdateSchema,
  sanitizeVendorCreate,
  sanitizeVendorUpdate,
} from '@/lib/schemas/vendor';

describe('vendorCreateSchema', () => {
  it('should accept valid minimal vendor data', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept valid full vendor data', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      email: 'vendor@example.com',
      contact_person: 'ישראל ישראלי',
      phone_2: '052-7654321',
      service_type: ['tow_truck', 'mechanic'],
      coverage_areas: ['center', 'north'],
      availability_status: 'available',
      is_active: true,
      payment_rate_per_call: 250,
      notes: 'ספק אמין',
      works_24_7: false,
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      profile_image: 'https://example.com/image.jpg',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept vehicle_types_supported (now a known field)', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      vehicle_types_supported: ['private', 'truck'],
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.vehicle_types_supported).toEqual(['private', 'truck']);
  });

  it('should accept coverage_cities (now a known field)', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      coverage_cities: 'תל אביב, חיפה',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.coverage_cities).toBe('תל אביב, חיפה');
  });

  it('should REJECT payment_rate_per_call as empty string', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      payment_rate_per_call: '',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE vendor_name', () => {
    const data = { phone: '050-1234567' };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE phone', () => {
    const data = { vendor_name: 'גרר הצפון' };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject empty vendor_name', () => {
    const data = { vendor_name: '', phone: '050-1234567' };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      email: 'not-an-email',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should allow empty email string', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      email: '',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid availability_status', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      availability_status: 'invalid_status',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should accept payment_rate_per_call as number', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      payment_rate_per_call: 350,
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.payment_rate_per_call).toBe(350);
  });

  it('should accept payment_rate_per_call when omitted', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.payment_rate_per_call).toBeUndefined();
  });
});

describe('vendorUpdateSchema', () => {
  it('should accept partial updates', () => {
    const data = { availability_status: 'busy' };
    const result = vendorUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept empty object for no-op update', () => {
    const result = vendorUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept vehicle_types_supported in updates (known field)', () => {
    const data = { vehicle_types_supported: ['private'] };
    const result = vendorUpdateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});

describe('sanitizeVendorCreate', () => {
  it('should accept full form data including vehicle_types_supported and coverage_cities', () => {
    const formData = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      email: '',
      vehicle_types_supported: ['private', 'truck'],
      coverage_cities: 'תל אביב',
      is_available_now: true,
    };

    const result = sanitizeVendorCreate(formData);
    expect(result.vendor_name).toBe('גרר הצפון');
    expect(result.vehicle_types_supported).toEqual(['private', 'truck']);
    expect(result.coverage_cities).toBe('תל אביב');
    expect(result.is_available_now).toBe(true);
  });

  it('should convert payment_rate_per_call from string to number', () => {
    const formData = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      payment_rate_per_call: '350',
    };
    const result = sanitizeVendorCreate(formData);
    expect(result.payment_rate_per_call).toBe(350);
    expect(typeof result.payment_rate_per_call).toBe('number');
  });

  it('should remove empty payment_rate_per_call (converts to undefined, not null)', () => {
    const formData = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      payment_rate_per_call: '',
    };
    const result = sanitizeVendorCreate(formData);
    expect(result.payment_rate_per_call).toBeUndefined();
  });

  it('should handle the exact form data from NewVendor page', () => {
    const formData = {
      vendor_name: 'גרר טסט',
      contact_person: 'ישראל',
      phone: '050-1111111',
      phone_2: '',
      email: 'test@test.com',
      service_type: ['tow_truck'],
      coverage_areas: ['center'],
      works_24_7: false,
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      payment_rate_per_call: '200',
      notes: '',
      is_active: true,
      availability_status: 'available',
    };
    const result = sanitizeVendorCreate(formData);
    expect(result.vendor_name).toBe('גרר טסט');
    expect(result.payment_rate_per_call).toBe(200);
    // Schema applies defaults for optional fields not in formData
    expect(result.vehicle_types_supported).toEqual([]);
    expect(result.coverage_cities).toBe('');
  });

  it('should throw on missing required fields', () => {
    expect(() => sanitizeVendorCreate({ vendor_name: 'test' })).toThrow();
    expect(() => sanitizeVendorCreate({ phone: '050-1111111' })).toThrow();
  });
});

describe('sanitizeVendorUpdate', () => {
  it('should accept partial vendor update data', () => {
    const formData = {
      vendor_name: 'שם חדש',
      phone: '052-9999999',
    };
    const result = sanitizeVendorUpdate(formData);
    expect(result.vendor_name).toBe('שם חדש');
  });

  it('should handle the exact form data from EditVendor page', () => {
    const formData = {
      vendor_name: 'גרר טסט',
      contact_person: 'ישראל',
      phone: '050-1111111',
      phone_2: '',
      email: 'test@test.com',
      service_type: ['tow_truck'],
      coverage_areas: ['center'],
      works_24_7: false,
      working_hours_start: '08:00',
      working_hours_end: '18:00',
      notes: 'הערה',
      is_active: true,
    };
    const result = sanitizeVendorUpdate(formData);
    expect(result.vendor_name).toBe('גרר טסט');
    // Update schema is partial, so missing optional fields stay missing
    expect(result.vehicle_types_supported).toBeUndefined();
    expect(result.coverage_cities).toBeUndefined();
  });
});
