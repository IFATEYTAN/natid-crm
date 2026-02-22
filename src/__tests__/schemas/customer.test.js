import { describe, it, expect } from 'vitest';
import { customerCreateSchema, sanitizeCustomerCreate } from '@/lib/schemas/customer';

describe('customerCreateSchema', () => {
  it('should accept valid minimal customer data', () => {
    const data = {
      name: 'חברת הראל',
      phone: '03-1234567',
    };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept valid full customer data', () => {
    const data = {
      name: 'חברת הראל',
      customer_type: 'insurance_company',
      contact_person: 'דוד כהן',
      phone: '03-1234567',
      email: 'david@harel.co.il',
      address: 'רחוב אבא הלל 3',
      city: 'רמת גן',
      contract_type: 'monthly',
      sla_response_minutes: 15,
      sla_arrival_minutes: 45,
      monthly_budget: 50000,
      status: 'active',
    };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should REJECT unknown fields', () => {
    const data = {
      name: 'חברת הראל',
      phone: '03-1234567',
      invalid_field: 'value',
    };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE name', () => {
    const data = { phone: '03-1234567' };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should REQUIRE phone', () => {
    const data = { name: 'חברת הראל' };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid customer_type', () => {
    const data = {
      name: 'חברת הראל',
      phone: '03-1234567',
      customer_type: 'invalid_type',
    };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject invalid contract_type', () => {
    const data = {
      name: 'חברת הראל',
      phone: '03-1234567',
      contract_type: 'weekly',
    };
    const result = customerCreateSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('sanitizeCustomerCreate', () => {
  it('should pass valid data through', () => {
    const data = {
      name: 'חברת הראל',
      phone: '03-1234567',
      status: 'active',
    };
    const result = sanitizeCustomerCreate(data);
    expect(result.name).toBe('חברת הראל');
  });

  it('should throw on unknown fields', () => {
    expect(() =>
      sanitizeCustomerCreate({
        name: 'חברת הראל',
        phone: '03-1234567',
        bogus_field: 'nope',
      })
    ).toThrow('ולידציה');
  });
});
