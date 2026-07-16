/**
 * Unit tests for the pull direction of the Nati sync (Nati MySQL -> CRM):
 * base44/functions/syncNatiData/entry.ts mapping layer.
 *
 * The functions under test are loaded from the real entry.ts source — see
 * loadNatiFunctionSource.js.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { loadSyncMappers } from './loadNatiFunctionSource';

let m;

beforeAll(() => {
  m = loadSyncMappers();
});

describe('parseNatiDate (naive Jerusalem-local datetime -> ISO with offset)', () => {
  it('returns null for empty / missing values', () => {
    expect(m.parseNatiDate(null)).toBeNull();
    expect(m.parseNatiDate(undefined)).toBeNull();
    expect(m.parseNatiDate('')).toBeNull();
  });

  it('returns null for MySQL zero-dates', () => {
    expect(m.parseNatiDate('0000-00-00 00:00:00')).toBeNull();
    expect(m.parseNatiDate('0000-00-00')).toBeNull();
  });

  it('returns null for malformed values', () => {
    expect(m.parseNatiDate('נתי')).toBeNull();
    expect(m.parseNatiDate('2026-07')).toBeNull();
  });

  it('appends +03:00 during Israel DST months (Apr-Oct)', () => {
    expect(m.parseNatiDate('2026-07-15 14:30:00')).toBe('2026-07-15T14:30:00+03:00');
    expect(m.parseNatiDate('2026-04-01 00:00:00')).toBe('2026-04-01T00:00:00+03:00');
    expect(m.parseNatiDate('2026-10-31 23:59:59')).toBe('2026-10-31T23:59:59+03:00');
  });

  it('appends +02:00 during Israel standard-time months (Nov-Mar)', () => {
    expect(m.parseNatiDate('2026-01-15 08:00:00')).toBe('2026-01-15T08:00:00+02:00');
    expect(m.parseNatiDate('2026-03-31 12:00:00')).toBe('2026-03-31T12:00:00+02:00');
    expect(m.parseNatiDate('2026-11-01 12:00:00')).toBe('2026-11-01T12:00:00+02:00');
  });

  it('accepts date-only strings (10 chars) and still tags the Jerusalem offset', () => {
    const parsed = m.parseNatiDate('2026-07-15');
    expect(parsed).not.toBeNull();
    expect(parsed).toContain('2026-07-15');
    expect(parsed).toContain('+03:00');
  });
});

describe('clean (payload sanitizer)', () => {
  it('strips undefined, null and empty-string values', () => {
    expect(m.clean({ a: undefined, b: null, c: '', d: 'x' })).toEqual({ d: 'x' });
  });

  it('keeps falsy-but-meaningful values (0, false)', () => {
    expect(m.clean({ zero: 0, no: false })).toEqual({ zero: 0, no: false });
  });
});

describe('mapToCall (Nati appeal -> CRM Call)', () => {
  const minimalAppeal = { id: 12345, status: 0, department_id: 3 };

  it('maps a minimal towing appeal with required placeholders', () => {
    const call = m.mapToCall(minimalAppeal);
    expect(call.call_number).toBe('12345');
    expect(call.call_status).toBe('waiting_treatment');
    expect(call.service_category).toBe('towing');
    expect(call.issue_type).toBe('stopped_driving');
    // customer_name is REQUIRED on the Call schema — placeholder must survive clean()
    expect(call.customer_name).toBe('לא צוין');
    expect(call.customer_phone).toBe('לא צוין');
    expect(call.pickup_location_address).toBe('לא צוין');
    expect(call.vehicle_type).toBe('private');
    expect(call.created_by_source).toBe('operator');
  });

  it('uses the placeholder customer name for whitespace-only requester too', () => {
    expect(m.mapToCall({ ...minimalAppeal, requester: '   ' }).customer_name).toBe('לא צוין');
    expect(m.mapToCall({ ...minimalAppeal, requester: ' דנה כהן ' }).customer_name).toBe('דנה כהן');
  });

  it('maps every known Nati status, defaulting unknowns to waiting_treatment', () => {
    const statusOf = (status) => m.mapToCall({ ...minimalAppeal, status }).call_status;
    expect(statusOf(0)).toBe('waiting_treatment');
    expect(statusOf(1)).toBe('assigning');
    expect(statusOf(2)).toBe('completed');
    expect(statusOf(3)).toBe('cancelled');
    expect(statusOf(6)).toBe('completed');
    expect(statusOf(7)).toBe('completed');
    expect(statusOf(99)).toBe('waiting_treatment');
  });

  it('maps department to service_category and issue_type', () => {
    const dep = (department_id) => m.mapToCall({ ...minimalAppeal, department_id });
    expect(dep(3).service_category).toBe('towing');
    expect(dep(4).service_category).toBe('mobile_unit');
    expect(dep(4).issue_type).toBe('mechanical');
    expect(dep(5).service_category).toBe('other');
    expect(dep(5).issue_type).toBe('other');
  });

  it('falls back through phone fields: tel -> tel1 -> placeholder', () => {
    expect(
      m.mapToCall({ ...minimalAppeal, tel: '03-1111111', tel1: '050-2222222' }).customer_phone
    ).toBe('03-1111111');
    expect(m.mapToCall({ ...minimalAppeal, tel: '', tel1: '050-2222222' }).customer_phone).toBe(
      '050-2222222'
    );
    expect(m.mapToCall({ ...minimalAppeal }).customer_phone).toBe('לא צוין');
  });

  it('maps QC approval from inspector_approves with nati as the source', () => {
    expect(m.mapToCall({ ...minimalAppeal, inspector_approves: 1 }).passed_quality_control).toBe(
      true
    );
    expect(m.mapToCall({ ...minimalAppeal, inspector_approves: 0 }).passed_quality_control).toBe(
      false
    );
    expect(m.mapToCall(minimalAppeal).quality_control_source).toBe('nati');
  });

  it('marks API-opened appeals as bot-created', () => {
    expect(m.mapToCall({ ...minimalAppeal, open_from_api: 1 }).created_by_source).toBe('bot');
    expect(m.mapToCall({ ...minimalAppeal, open_from_api: 0 }).created_by_source).toBe('operator');
  });

  it('sets SLA deadlines 30 minutes after opening for OPEN appeals only', () => {
    const open = m.mapToCall({ ...minimalAppeal, date_added: '2026-07-15 10:00:00' });
    // 10:00 Jerusalem summer time == 07:00 UTC; +30 minutes
    expect(open.sla_deadline).toBe('2026-07-15T07:30:00.000Z');
    expect(open.sla_response_deadline).toBe('2026-07-15T07:30:00.000Z');

    const closed = m.mapToCall({
      ...minimalAppeal,
      status: 2,
      date_added: '2026-07-15 10:00:00',
      finish_time: '2026-07-15 12:00:00',
    });
    expect(closed.sla_deadline).toBeUndefined();
    expect(closed.sla_response_deadline).toBeUndefined();
  });

  it('maps finish_time to both service_end_time and closed_at', () => {
    const call = m.mapToCall({ ...minimalAppeal, status: 2, finish_time: '2026-07-10 18:45:00' });
    expect(call.service_end_time).toBe('2026-07-10T18:45:00+03:00');
    expect(call.closed_at).toBe('2026-07-10T18:45:00+03:00');
  });

  it('maps vendor assignment timestamps when present', () => {
    const call = m.mapToCall({
      ...minimalAppeal,
      supplier_name: 'מוסך הצפון',
      supplier_assigned_date: '2026-07-15 09:00:00',
      arrive_expected_time: '2026-07-15 09:40:00',
      arrive_actual_time: '2026-07-15 09:55:00',
    });
    expect(call.assigned_vendor_name).toBe('מוסך הצפון');
    expect(call.assigned_at).toBe('2026-07-15T09:00:00+03:00');
    expect(call.vendor_arrival_time_estimated).toBe('2026-07-15T09:40:00+03:00');
    expect(call.vendor_arrival_time_actual).toBe('2026-07-15T09:55:00+03:00');
  });

  it('builds future-service date and HH:MM-HH:MM range', () => {
    const call = m.mapToCall({
      ...minimalAppeal,
      future_service_from: '2026-08-01 09:00:00',
      future_service_to: '2026-08-01 12:30:00',
    });
    expect(call.future_service_date).toBe('2026-08-01');
    expect(call.future_service_time_range).toBe('09:00-12:30');
  });

  it('keeps positive distances only', () => {
    expect(m.mapToCall({ ...minimalAppeal, num_of_km: 17 }).estimated_distance_km).toBe(17);
    expect(m.mapToCall({ ...minimalAppeal, num_of_km: 0 }).estimated_distance_km).toBeUndefined();
  });

  it('strips empty optional fields via clean()', () => {
    const call = m.mapToCall(minimalAppeal);
    expect(call).not.toHaveProperty('vehicle_plate');
    expect(call).not.toHaveProperty('dropoff_location_address');
    expect(call).not.toHaveProperty('issue_description');
  });
});

describe('mapToCase (Nati appeal -> CRM Case)', () => {
  const appeal = { id: 777, status: 1, department_id: 4, requester: ' דנה כהן ' };

  it('maps core fields including Hebrew department name', () => {
    const c = m.mapToCase(appeal);
    expect(c.case_number).toBe('777');
    expect(c.customer_name).toBe('דנה כהן');
    expect(c.status).toBe('assigned');
    expect(c.service_type).toBe('mechanical');
    expect(c.department).toBe('ניידת שירות');
    expect(c.vehicle_type).toBe('private');
    expect(c.opening_source).toBe('call_center');
  });

  it('derives source_status from finish_time', () => {
    expect(m.mapToCase(appeal).source_status).toBe('open');
    expect(m.mapToCase({ ...appeal, finish_time: '2026-07-10 18:45:00' }).source_status).toBe(
      'closed'
    );
  });

  it('maps all Nati case statuses, defaulting unknowns to new', () => {
    const statusOf = (status) => m.mapToCase({ ...appeal, status }).status;
    expect(statusOf(0)).toBe('new');
    expect(statusOf(1)).toBe('assigned');
    expect(statusOf(2)).toBe('completed');
    expect(statusOf(3)).toBe('cancelled');
    expect(statusOf(6)).toBe('completed');
    expect(statusOf(7)).toBe('completed');
    expect(statusOf(42)).toBe('new');
  });
});

describe('extractVendors (dedup by supplier name)', () => {
  it('dedupes suppliers appearing on multiple appeals', () => {
    const vendors = m.extractVendors([
      { supplier_name: 'מוסך הצפון', supplier_id: 5 },
      { supplier_name: 'מוסך הצפון', supplier_id: 5 },
      { supplier_name: 'גרר דרום', supplier_id: 9 },
    ]);
    expect(vendors).toHaveLength(2);
    expect(vendors[0]).toMatchObject({
      vendor_name: 'מוסך הצפון',
      vendor_number: 5,
      is_active: true,
    });
  });

  it('skips appeals without a supplier', () => {
    expect(m.extractVendors([{ supplier_name: '' }, { supplier_name: null }, {}])).toHaveLength(0);
  });

  it('trims supplier names before deduping', () => {
    const vendors = m.extractVendors([
      { supplier_name: ' מוסך הצפון ' },
      { supplier_name: 'מוסך הצפון' },
    ]);
    expect(vendors).toHaveLength(1);
    expect(vendors[0].vendor_name).toBe('מוסך הצפון');
  });
});

describe('extractCustomers (dedup by external client id, fallback to name)', () => {
  it('dedupes by client_id even when names differ', () => {
    const customers = m.extractCustomers([
      { requester: 'דנה כהן', client_id: 100, tel: '050-1111111' },
      { requester: 'דנה כהן-לוי', client_id: 100 },
    ]);
    expect(customers).toHaveLength(1);
    expect(customers[0]).toMatchObject({
      name: 'דנה כהן',
      customer_id_external: '100',
      phone: '050-1111111',
    });
  });

  it('falls back to name as the dedup key when there is no client_id', () => {
    const customers = m.extractCustomers([
      { requester: 'יוסי לוי' },
      { requester: 'יוסי לוי' },
      { requester: 'רות אלון' },
    ]);
    expect(customers).toHaveLength(2);
  });

  it('skips appeals without a requester name', () => {
    expect(m.extractCustomers([{ requester: '' }, { requester: '   ' }, {}])).toHaveLength(0);
  });

  it('parses subscription_sequence defensively', () => {
    expect(m.extractCustomers([{ requester: 'א', sub_num: '42' }])[0].subscription_sequence).toBe(
      42
    );
    expect(m.extractCustomers([{ requester: 'ב', sub_num: 'abc' }])[0].subscription_sequence).toBe(
      0
    );
    expect(m.extractCustomers([{ requester: 'ג' }])[0].subscription_sequence).toBe(0);
  });
});
