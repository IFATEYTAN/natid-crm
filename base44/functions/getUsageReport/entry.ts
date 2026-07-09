import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const ISRAEL_TZ = 'Asia/Jerusalem';

// created_date is stored/queried in UTC; splitting the raw ISO string
// (slice(0,10)/slice(11,16)) is wrong by 2-3 hours and can show the wrong
// calendar day near midnight. Format in Israel local time instead.
function splitLocalDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/**
 * QA audit Group C (#109) — usage report with 17+ columns, one row per call
 * regardless of how many vendors touched it (built directly off Call, which
 * is already one row per call — vendor legs live in CallAssignmentAttempt,
 * so counting them doesn't multiply report rows).
 *
 * POST { from?: ISO date, to?: ISO date } — defaults to the last 30 days.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const appRole = await resolveAppRole(base44, user);
    if (!['admin', 'operator'].includes(appRole)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const to = body?.to ? new Date(body.to) : new Date();
    const from = body?.from
      ? new Date(body.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [allCalls, allAttempts, allTokens] = await Promise.all([
      base44.asServiceRole.entities.Call.list('-created_date', 20000),
      base44.asServiceRole.entities.CallAssignmentAttempt.list('-created_date', 20000),
      base44.asServiceRole.entities.FeedbackToken.list('-created_date', 20000),
    ]);

    const calls = allCalls.filter((c) => {
      if (!c.created_date) return false;
      const d = new Date(c.created_date);
      return d >= from && d <= to;
    });

    const attemptsByCall = new Map();
    for (const attempt of allAttempts) {
      if (!attempt.call_id) continue;
      if (!attemptsByCall.has(attempt.call_id)) attemptsByCall.set(attempt.call_id, []);
      attemptsByCall.get(attempt.call_id).push(attempt);
    }

    const tokensByCall = new Map();
    for (const token of allTokens) {
      if (!token.call_id) continue;
      if (!tokensByCall.has(token.call_id)) tokensByCall.set(token.call_id, []);
      tokensByCall.get(token.call_id).push(token);
    }

    const rows = calls.map((call) => {
      const attempts = attemptsByCall.get(call.id) || [];
      const vendorCount = new Set(attempts.map((a) => a.vendor_id).filter(Boolean)).size;
      const satisfaction = computeCallSatisfaction(tokensByCall.get(call.id) || []);

      // Requirement ב': for a call opened as a future/scheduled service, the
      // arrival-duration clock starts from the scheduled time, not creation.
      // Requirement ג': if the call was reactivated (D-09 "reactivateCall"),
      // that overrides everything as the most recent reset point.
      let baselineTime = call.created_date;
      if (call.call_status === 'future_service' && call.future_service_date) {
        const timePart = (call.future_service_time_range || '').match(/\d{2}:\d{2}/)?.[0] || '00:00';
        baselineTime = `${call.future_service_date}T${timePart}:00`;
      }
      if (call.reactivated_at) baselineTime = call.reactivated_at;

      let arrivalDurationMinutes = null;
      if (call.vendor_arrival_time_actual && baselineTime) {
        const diffMs = new Date(call.vendor_arrival_time_actual).getTime() - new Date(baselineTime).getTime();
        if (diffMs >= 0) arrivalDurationMinutes = Math.round(diffMs / 60000);
      }

      const isStorage =
        call.call_status === 'in_storage' ||
        call.closing_status === 'tow_to_storage' ||
        !!call.storage_location_city;

      return {
        call_id: call.id,
        distance_km: call.actual_distance_km ?? call.estimated_distance_km ?? null,
        destination: [call.dropoff_garage_name, call.dropoff_location_city].filter(Boolean).join(', ') || null,
        source: [call.pickup_location_address, call.pickup_location_city].filter(Boolean).join(', ') || null,
        policy_number: null, // not synced into the system yet
        insurance_company: call.insurance_company || null,
        vehicle_plate: call.vehicle_plate || null,
        arrival_duration_minutes: arrivalDurationMinutes,
        arrival_time: call.vendor_arrival_time_actual || null,
        dropoff_arrival_time: call.service_end_time || null,
        service_type: call.service_category || call.dispatch_type || null,
        reported_issue: call.issue_description || call.issue_type || null,
        vendor_count: vendorCount,
        report_date: call.created_date ? splitLocalDateTime(call.created_date).date : null,
        report_time: call.created_date ? splitLocalDateTime(call.created_date).time : null,
        status: call.call_status,
        taken_by: call.created_by || null,
        call_number: call.call_number || null,
        customer_name: call.customer_name || null,
        customer_phone: call.customer_phone || null,
        overnight_storage: isStorage
          ? [call.storage_location_city].filter(Boolean).join(', ') || 'כן'
          : null,
        satisfaction_status: satisfaction.status,
      };
    });

    return Response.json({ success: true, rows, count: rows.length });
  } catch (error) {
    console.error('getUsageReport error:', error);
    return Response.json({ error: 'Failed to build usage report' }, { status: 500 });
  }
});

// ===== Inline app-role resolution (kept per-file: a NEW _shared module cannot be
// registered on this platform - its standalone deploy fails ISOLATE_INTERNAL_FAILURE and
// importers then fail with Module not found; see docs/LESSONS_LEARNED.md 2026-07-09) =====
const APP_ROLE_MAP: Record<string, string> = {
  admin: 'admin',
  operator: 'operator',
  agent: 'agent',
  vendor: 'vendor',
  manager: 'operator',
  מנהל: 'admin',
  'מנהל מערכת': 'admin',
  מוקדן: 'operator',
  מתפעל: 'operator',
  'מנהל תפעול': 'operator',
  טכנאי: 'agent',
  'נציג שטח': 'agent',
  ספק: 'vendor',
  'ספק שירות': 'vendor',
  Vendor: 'vendor',
  'Vendor ': 'vendor',
};

// deno-lint-ignore no-explicit-any
async function resolveAppRole(base44: any, user: any): Promise<string | null> {
  if (!user) return null;
  if (user.role === 'admin') return 'admin';
  if (user.role === 'vendor' || user.role === 'ספק') return 'vendor';
  if (APP_ROLE_MAP[user.role]) return APP_ROLE_MAP[user.role];
  try {
    let perms = await base44.asServiceRole.entities.UserPermission.filter({ user_id: user.id });
    if (!perms.length && user.email) {
      perms = await base44.asServiceRole.entities.UserPermission.filter({
        user_email: user.email,
      });
    }
    const mapped = APP_ROLE_MAP[perms[0]?.role_name];
    if (mapped) return mapped;
  } catch (_) {
    // Permission lookup failed - fall through to the frontend-matching default.
  }
  return 'operator';
}
// ===== End inline app-role resolution ===== (redeploy)

// ===== Inline _shared/satisfaction (kept per-file: shared-module bundling is broken
// platform-wide for new deployments - see docs/LESSONS_LEARNED.md 2026-07-09) =====
/**
 * Shared customer-satisfaction aggregation logic.
 *
 * A call can be surveyed more than once (FeedbackToken rows accumulate: each
 * unexpired-unused token is reused on resend, but once one expires unused,
 * the next survey send creates a fresh row) — so a call's FeedbackToken
 * history is effectively its list of survey "attempts". QA audit ask
 * (Group E): the final result must ignore "no answer" attempts and use the
 * last real (green/yellow/red) answer; only report "no answer" when every
 * attempt was unanswered.
 */

type SatisfactionColor = 'green' | 'yellow' | 'red';
type SatisfactionStatus = SatisfactionColor | 'no_answer' | 'pending' | 'not_sent';

interface FeedbackTokenLike {
  is_used?: boolean;
  expires_at?: string;
  rating?: number;
  used_at?: string;
}

interface CallSatisfactionResult {
  status: SatisfactionStatus;
  color: SatisfactionColor | null;
  rating: number | null;
  answered_at: string | null;
}

function ratingToColor(rating: number): SatisfactionColor {
  if (rating >= 4) return 'green';
  if (rating === 3) return 'yellow';
  return 'red';
}

/**
 * Reduce a call's FeedbackToken rows to a single final satisfaction result.
 * Ignores "no answer" (expired, never used) attempts unless every attempt
 * was a no-answer.
 */
function computeCallSatisfaction(tokens: FeedbackTokenLike[]): CallSatisfactionResult {
  if (!tokens || tokens.length === 0) {
    return { status: 'not_sent', color: null, rating: null, answered_at: null };
  }

  const now = Date.now();
  const answered = tokens
    .filter((t) => t.is_used && typeof t.rating === 'number')
    .sort((a, b) => new Date(b.used_at || 0).getTime() - new Date(a.used_at || 0).getTime());

  if (answered.length > 0) {
    const last = answered[0];
    const color = ratingToColor(last.rating as number);
    return {
      status: color,
      color,
      rating: last.rating as number,
      answered_at: last.used_at || null,
    };
  }

  const stillPending = tokens.some((t) => !t.is_used && new Date(t.expires_at || 0).getTime() > now);
  if (stillPending) {
    return { status: 'pending', color: null, rating: null, answered_at: null };
  }

  // Every attempt was sent, expired, and never answered.
  return { status: 'no_answer', color: null, rating: null, answered_at: null };
}
// ===== End inline _shared/satisfaction =====
