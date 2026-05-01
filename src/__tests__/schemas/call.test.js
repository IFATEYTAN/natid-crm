import { describe, it, expect } from 'vitest';
import { callCreateSchema, sanitizeCallCreate } from '@/lib/schemas/call';

describe('callCreateSchema', () => {
  it('should accept valid minimal call data', () => {
    const data = {
      customer_name: 'ישראל ישראלי',
      customer_phone: '050-1234567',
      pickup_location_address: 'רחוב הרצל 1, תל אביב',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    expect(result.data.call_status).toBe('waiting_treatment');
    expect(result.data.priority).toBe('normal');
  });

  it('should accept valid full call data', () => {
    const data = {
      call_status: 'awaiting_assignment',
      priority: 'urgent',
      customer_name: 'ישראל ישראלי',
      customer_phone: '050-1234567',
      insurance_company: 'הראל',
      vehicle_plate: '12-345-67',
      vehicle_type: 'private',
      vehicle_model: 'טויוטה קורולה',
      service_type: 'tow',
      issue_type: 'flat_tire',
      issue_description: "פנצ'ר בגלגל קדמי",
      dispatch_type: 'tow_truck',
      customer_source: 'phone',
      pickup_location_address: 'רחוב הרצל 1',
      pickup_location_city: 'תל אביב',
      pickup_location_lat: 32.0853,
      pickup_location_lon: 34.7818,
      dropoff_location_address: 'רחוב בן יהודה 50',
      dropoff_location_city: 'תל אביב',
      internal_notes: 'לקוח VIP',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should REJECT unknown fields', () => {
    const data = {
      customer_name: 'ישראל',
      customer_phone: '050-1234567',
      pickup_location_address: 'כתובת',
      some_invalid_field: 'value',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE customer_name', () => {
    const data = {
      customer_phone: '050-1234567',
      pickup_location_address: 'כתובת',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE customer_phone', () => {
    const data = {
      customer_name: 'ישראל',
      pickup_location_address: 'כתובת',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE pickup_location_address', () => {
    const data = {
      customer_name: 'ישראל',
      customer_phone: '050-1234567',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid call_status', () => {
    const data = {
      customer_name: 'ישראל',
      customer_phone: '050-1234567',
      pickup_location_address: 'כתובת',
      call_status: 'invalid_status',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid priority', () => {
    const data = {
      customer_name: 'ישראל',
      customer_phone: '050-1234567',
      pickup_location_address: 'כתובת',
      priority: 'super_urgent',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid service_type', () => {
    const data = {
      customer_name: 'ישראל',
      customer_phone: '050-1234567',
      pickup_location_address: 'כתובת',
      service_type: 'helicopter',
    };
    const result = callCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('sanitizeCallCreate', () => {
  it('should pass valid data through', () => {
    const data = {
      customer_name: 'ישראל',
      customer_phone: '050-1234567',
      pickup_location_address: 'רחוב הרצל 1, תל אביב',
    };
    const result = sanitizeCallCreate(data);
    expect(result.customer_name).toBe('ישראל');
  });

  it('should throw on invalid data', () => {
    expect(() => sanitizeCallCreate({ customer_name: 'ישראל' })).toThrow('ולידציה');
  });
});
