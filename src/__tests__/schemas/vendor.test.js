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

  it('should REJECT unknown fields (vehicle_types_supported)', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      vehicle_types_supported: ['private', 'truck'],
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('unrecognized_keys');
  });

  it('should REJECT unknown fields (coverage_cities)', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      coverage_cities: 'תל אביב, חיפה',
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error.issues[0].code).toBe('unrecognized_keys');
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

  it('should accept payment_rate_per_call as null', () => {
    const data = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      payment_rate_per_call: null,
    };
    const result = vendorCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.payment_rate_per_call).toBeNull();
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

  it('should still reject unknown fields', () => {
    const data = { vehicle_types_supported: ['private'] };
    const result = vendorUpdateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('sanitizeVendorCreate', () => {
  it('should strip unknown fields from form data', () => {
    const formData = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      email: '',
      vehicle_types_supported: ['private', 'truck'],
      coverage_cities: 'תל אביב',
      is_available_now: true,
    };

    // Should throw because of unknown fields
    expect(() => sanitizeVendorCreate(formData)).toThrow('ולידציה');
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

  it('should convert empty payment_rate_per_call to null', () => {
    const formData = {
      vendor_name: 'גרר הצפון',
      phone: '050-1234567',
      payment_rate_per_call: '',
    };
    const result = sanitizeVendorCreate(formData);
    expect(result.payment_rate_per_call).toBeNull();
  });

  it('should handle the exact form data from NewVendor page (fixed version)', () => {
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
    expect(result).not.toHaveProperty('vehicle_types_supported');
    expect(result).not.toHaveProperty('coverage_cities');
    expect(result).not.toHaveProperty('is_available_now');
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

  it('should handle the exact form data from EditVendor page (fixed version)', () => {
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
    expect(result).not.toHaveProperty('vehicle_types_supported');
    expect(result).not.toHaveProperty('coverage_cities');
  });
});
