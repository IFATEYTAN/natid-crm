/**
 * Unit tests for the push direction of the Nati sync (CRM -> Nati MySQL):
 * base44/functions/pushNatiUpdates/entry.ts diff layer, plus consistency
 * checks between the two directions (pull-side conflict guards must agree
 * with the push-side status map, or a call can ping-pong between systems).
 *
 * The functions under test are loaded from the real entry.ts sources — see
 * loadNatiFunctionSource.js.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  loadPushMappers,
  loadSyncMappers,
  loadPullStatusGuardTables,
} from './loadNatiFunctionSource';

let p;

beforeAll(() => {
  p = loadPushMappers();
});

describe('toNatiDateTime (CRM ISO/UTC -> naive Jerusalem-local string)', () => {
  it('converts UTC to Jerusalem local time (DST, +3)', () => {
    expect(p.toNatiDateTime('2026-07-15T12:00:00Z')).toBe('2026-07-15 15:00:00');
  });

  it('converts UTC to Jerusalem local time (standard time, +2)', () => {
    expect(p.toNatiDateTime('2026-01-15T12:00:00.000Z')).toBe('2026-01-15 14:00:00');
  });

  it('crosses the date line correctly for late-night UTC times', () => {
    expect(p.toNatiDateTime('2026-07-15T22:30:00Z')).toBe('2026-07-16 01:30:00');
  });

  it('returns null for empty or invalid input', () => {
    expect(p.toNatiDateTime(null)).toBeNull();
    expect(p.toNatiDateTime('')).toBeNull();
    expect(p.toNatiDateTime('not-a-date')).toBeNull();
  });
});

describe('isEmptyNatiDate', () => {
  it('treats null, empty, whitespace and MySQL zero-dates as empty', () => {
    expect(p.isEmptyNatiDate(null)).toBe(true);
    expect(p.isEmptyNatiDate(undefined)).toBe(true);
    expect(p.isEmptyNatiDate('')).toBe(true);
    expect(p.isEmptyNatiDate('   ')).toBe(true);
    expect(p.isEmptyNatiDate('0000-00-00 00:00:00')).toBe(true);
  });

  it('treats real datetimes as non-empty', () => {
    expect(p.isEmptyNatiDate('2026-01-01 10:00:00')).toBe(false);
  });
});

describe('diffCallAgainstNatiRow — status is forward-only', () => {
  // A fully-populated Nati row: nothing is empty, so only status can change.
  const fullRow = {
    status: 1,
    supplier_id: 5,
    supplier_assigned_date: '2026-07-15 09:00:00',
    arrive_expected_time: '2026-07-15 09:40:00',
    arrive_actual_time: '2026-07-15 09:55:00',
    finish_time: '2026-07-15 11:00:00',
    q_notes: 'הערת מוקדן בנתי',
    inspector_approves: 1,
  };

  it('closes an open Nati row when the CRM call completed', () => {
    const { updates, reasons } = p.diffCallAgainstNatiRow(
      { call_status: 'completed' },
      fullRow,
      {}
    );
    expect(updates).toEqual({ status: 2 });
    expect(reasons).toHaveLength(1);
  });

  it('cancels an open Nati row when the CRM call was cancelled', () => {
    const { updates } = p.diffCallAgainstNatiRow({ call_status: 'cancelled' }, fullRow, {});
    expect(updates).toEqual({ status: 3 });
  });

  it('never touches a Nati row that is already closed (2/3/6/7)', () => {
    for (const status of [2, 3, 6, 7]) {
      const { updates } = p.diffCallAgainstNatiRow(
        { call_status: 'completed' },
        { ...fullRow, status },
        {}
      );
      expect(updates).toEqual({});
    }
  });

  it('advances 0 -> 1 when treatment started in the CRM', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'assigning' },
      { ...fullRow, status: 0 },
      {}
    );
    expect(updates).toEqual({ status: 1 });
  });

  it('does not rewrite status 1 when the CRM is also in-treatment', () => {
    const { updates } = p.diffCallAgainstNatiRow({ call_status: 'in_progress' }, fullRow, {});
    expect(updates).toEqual({});
  });

  it("never downgrades: CRM 'waiting' does not reset an in-treatment Nati row", () => {
    const { updates } = p.diffCallAgainstNatiRow({ call_status: 'waiting_treatment' }, fullRow, {});
    expect(updates).toEqual({});
  });

  it('never reopens: CRM open status does not touch a closed Nati row', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress' },
      { ...fullRow, status: 2 },
      {}
    );
    expect(updates).toEqual({});
  });

  it("leaves Nati's finer-grained open statuses (4/5/8/9/10) alone unless closing", () => {
    const inTreatment = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress' },
      { ...fullRow, status: 4 },
      {}
    );
    expect(inTreatment.updates).toEqual({});

    const closing = p.diffCallAgainstNatiRow(
      { call_status: 'completed' },
      { ...fullRow, status: 4 },
      {}
    );
    expect(closing.updates).toEqual({ status: 2 });
  });

  it('ignores CRM statuses that have no Nati mapping', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'some_future_status' },
      { ...fullRow, status: 0 },
      {}
    );
    expect(updates).toEqual({});
  });
});

describe('diffCallAgainstNatiRow — everything else is fill-empty only', () => {
  const emptyRow = {
    status: 1,
    supplier_id: 0,
    supplier_assigned_date: '0000-00-00 00:00:00',
    arrive_expected_time: null,
    arrive_actual_time: null,
    finish_time: null,
    q_notes: '',
    inspector_approves: 0,
  };

  it('fills supplier_id + assignment date when Nati has no supplier', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', assigned_vendor_id: 'v1', assigned_at: '2026-07-15T09:00:00Z' },
      emptyRow,
      { v1: 77 }
    );
    expect(updates.supplier_id).toBe(77);
    expect(updates.supplier_assigned_date).toBe('2026-07-15 12:00:00');
  });

  it("respects a Nati dispatcher's supplier choice (never overwrites)", () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', assigned_vendor_id: 'v1' },
      { ...emptyRow, supplier_id: 12 },
      { v1: 77 }
    );
    expect(updates).not.toHaveProperty('supplier_id');
  });

  it('skips supplier push when the CRM vendor has no Nati supplier number', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', assigned_vendor_id: 'v1' },
      emptyRow,
      {}
    );
    expect(updates).not.toHaveProperty('supplier_id');
  });

  it('fills empty arrival timestamps from the CRM', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      {
        call_status: 'in_progress',
        vendor_arrival_time_estimated: '2026-07-15T06:40:00Z',
        vendor_arrival_time_actual: '2026-07-15T06:55:00Z',
      },
      emptyRow,
      {}
    );
    expect(updates.arrive_expected_time).toBe('2026-07-15 09:40:00');
    expect(updates.arrive_actual_time).toBe('2026-07-15 09:55:00');
  });

  it('does not overwrite arrival timestamps Nati already has', () => {
    const { updates } = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', vendor_arrival_time_estimated: '2026-07-15T06:40:00Z' },
      { ...emptyRow, arrive_expected_time: '2026-07-15 08:00:00' },
      {}
    );
    expect(updates).not.toHaveProperty('arrive_expected_time');
  });

  it('writes finish_time only for closed CRM calls, preferring service_end_time', () => {
    const open = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', service_end_time: '2026-07-15T08:00:00Z' },
      emptyRow,
      {}
    );
    expect(open.updates).not.toHaveProperty('finish_time');

    const closed = p.diffCallAgainstNatiRow(
      {
        call_status: 'completed',
        service_end_time: '2026-07-15T08:00:00Z',
        closed_at: '2026-07-15T09:00:00Z',
      },
      emptyRow,
      {}
    );
    expect(closed.updates.finish_time).toBe('2026-07-15 11:00:00');
  });

  it('fills q_notes only when Nati has none, truncated to the max length', () => {
    const filled = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', operator_notes: 'א'.repeat(p.Q_NOTES_MAX_LEN + 500) },
      emptyRow,
      {}
    );
    expect(filled.updates.q_notes).toHaveLength(p.Q_NOTES_MAX_LEN);

    const kept = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', operator_notes: 'הערה מה-CRM' },
      { ...emptyRow, q_notes: 'הערה קיימת בנתי' },
      {}
    );
    expect(kept.updates).not.toHaveProperty('q_notes');
  });

  it('pushes QC approval only for a manual CRM decision, and only 0 -> 1', () => {
    const manual = p.diffCallAgainstNatiRow(
      {
        call_status: 'in_progress',
        passed_quality_control: true,
        quality_control_source: 'manual',
      },
      emptyRow,
      {}
    );
    expect(manual.updates.inspector_approves).toBe(1);

    const fromNati = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress', passed_quality_control: true, quality_control_source: 'nati' },
      emptyRow,
      {}
    );
    expect(fromNati.updates).not.toHaveProperty('inspector_approves');

    const alreadyApproved = p.diffCallAgainstNatiRow(
      {
        call_status: 'in_progress',
        passed_quality_control: true,
        quality_control_source: 'manual',
      },
      { ...emptyRow, inspector_approves: 1 },
      {}
    );
    expect(alreadyApproved.updates).not.toHaveProperty('inspector_approves');
  });

  it('returns empty updates (a no-op) when CRM and Nati already agree', () => {
    const { updates, reasons } = p.diffCallAgainstNatiRow(
      { call_status: 'in_progress' },
      {
        status: 1,
        supplier_id: 5,
        supplier_assigned_date: '2026-07-15 09:00:00',
        arrive_expected_time: '2026-07-15 09:40:00',
        arrive_actual_time: '2026-07-15 09:55:00',
        finish_time: '2026-07-15 11:00:00',
        q_notes: 'קיים',
        inspector_approves: 1,
      },
      {}
    );
    expect(updates).toEqual({});
    expect(reasons).toEqual([]);
  });
});

describe('pull <-> push direction consistency (bidirectional sync safety)', () => {
  let pull;
  let guards;

  beforeAll(() => {
    pull = loadSyncMappers();
    guards = loadPullStatusGuardTables();
  });

  it('the pull-side bucket map is identical to the push-side status map', () => {
    // If these drift, the pull can flatten a finer-grained local status that
    // the push side considers equivalent — statuses would ping-pong.
    expect(guards.CRM_STATUS_TO_NATI_BUCKET).toEqual(p.CRM_STATUS_TO_NATI);
  });

  it('every Nati status round-trips to its own bucket', () => {
    for (const [natiStatus, crmStatus] of Object.entries(pull.CALL_STATUS_MAP)) {
      const bucket = p.CRM_STATUS_TO_NATI[crmStatus];
      const expected = [6, 7].includes(Number(natiStatus)) ? 2 : Number(natiStatus);
      expect(bucket, `Nati status ${natiStatus} -> ${crmStatus}`).toBe(expected);
    }
  });

  it('closed-status sets agree between directions', () => {
    // Push side: 6/7 are closed variants and must never be reopened.
    expect(p.NATI_CLOSED_STATUSES.has(6)).toBe(true);
    expect(p.NATI_CLOSED_STATUSES.has(7)).toBe(true);
    // Pull side maps those same statuses to terminal CRM statuses.
    expect(pull.CALL_STATUS_MAP[6]).toBe('completed');
    expect(pull.CALL_STATUS_MAP[7]).toBe('completed');
    // Terminal set matches the statuses whose bucket is closed (2/3).
    const terminalFromPush = Object.entries(p.CRM_STATUS_TO_NATI)
      .filter(([, bucket]) => bucket === 2 || bucket === 3)
      .map(([status]) => status)
      .sort();
    expect([...guards.TERMINAL_CRM_STATUSES].sort()).toEqual(terminalFromPush);
  });

  it('Call and Case status maps cover the same Nati statuses', () => {
    expect(Object.keys(pull.CALL_STATUS_MAP).sort()).toEqual(
      Object.keys(pull.CASE_STATUS_MAP).sort()
    );
  });
});
