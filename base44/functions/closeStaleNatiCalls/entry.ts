/**
 * closeStaleNatiCalls — Direct MySQL: Close calls/cases that are open locally
 * but no longer appear in call_open_appeals.
 * Rate-limit protection: 150ms between items, batches of 20, exponential backoff retry.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

// ===== Inline Nati DB layer (shared _shared/natiDb module fails platform deployment — logic inlined) =====
const NATI_CONNECT_TIMEOUT_MS = 20_000;
const NATI_FAIL_THRESHOLD = 3;
const NATI_GENERIC_COOLDOWN_MS = 2 * 60_000;
const NATI_BLOCKED_COOLDOWN_MS = 10 * 60_000;
let natiCircuit = { blockedUntil: 0, failures: 0, reason: '' };

class NatiBlockedError extends Error {
  retryAfterSec: number;
  reason: string;
  constructor(message: string, retryAfterSec: number, reason: string) {
    super(message);
    this.name = 'NatiBlockedError';
    this.retryAfterSec = retryAfterSec;
    this.reason = reason;
  }
}

function isHostBlockedError(err) {
  const e = err || {};
  return e.code === 'ER_HOST_IS_BLOCKED' || e.errno === 1129 ||
    /blocked because of many connection errors/i.test(String(e.message || ''));
}

async function withNatiConnection(fn, opts = {}) {
  const config = {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: NATI_CONNECT_TIMEOUT_MS,
    // RDS presents an Amazon-RDS-CA cert Deno doesn't trust; still TLS-encrypted.
    ssl: { rejectUnauthorized: false },
  };
  if (!config.host || !config.user || !config.password) throw new Error('Missing NATID_DB_* secrets');

  const now = Date.now();
  if (!opts.force && natiCircuit.blockedUntil > now) {
    const retryAfterSec = Math.ceil((natiCircuit.blockedUntil - now) / 1000);
    const base = natiCircuit.reason === 'host_blocked'
      ? 'נתי חסמו זמנית את הכתובת שלנו (Host is blocked) — צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS.'
      : 'החיבור לנתי מושהה זמנית בגלל כשלי חיבור חוזרים.';
    throw new NatiBlockedError(`${base} כדי לא להחמיר את החסימה, ננסה שוב בעוד ${retryAfterSec} שניות.`, retryAfterSec, natiCircuit.reason || 'cooldown');
  }

  let connection;
  try {
    connection = await mysql.createConnection(config);
  } catch (err) {
    if (isHostBlockedError(err)) {
      natiCircuit = { blockedUntil: now + NATI_BLOCKED_COOLDOWN_MS, failures: natiCircuit.failures + 1, reason: 'host_blocked' };
      throw new NatiBlockedError(
        'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS. עד אז עוצרים את הניסיונות ל-10 דקות כדי לא להחמיר.',
        Math.ceil(NATI_BLOCKED_COOLDOWN_MS / 1000),
        'host_blocked'
      );
    }
    const failures = natiCircuit.failures + 1;
    natiCircuit = {
      blockedUntil: failures >= NATI_FAIL_THRESHOLD ? now + NATI_GENERIC_COOLDOWN_MS : 0,
      failures,
      reason: failures >= NATI_FAIL_THRESHOLD ? 'connect_failures' : '',
    };
    throw err;
  }

  try {
    natiCircuit = { blockedUntil: 0, failures: 0, reason: '' };
    return await fn(connection);
  } finally {
    await connection.end().catch(() => {});
  }
}

function natiErrorResponse(err) {
  if (err instanceof NatiBlockedError) {
    return Response.json(
      { error: err.message, reason: err.reason, retry_after_seconds: err.retryAfterSec },
      { status: 503, headers: { 'Retry-After': String(err.retryAfterSec) } }
    );
  }
  if (isHostBlockedError(err)) {
    return Response.json(
      { error: 'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך FLUSH HOSTS בצד של נתי.', reason: 'host_blocked' },
      { status: 503 }
    );
  }
  const message = (err && err.message) || 'שגיאה לא ידועה';
  return Response.json({ error: message }, { status: 500 });
}
// ===== End inline Nati DB layer =====

const OPEN_CALL_STATUSES = [
  'waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute',
  'in_progress', 'vendor_arrived', 'future_service', 'in_followup',
  'in_storage', 'continued_treatment', 'awaiting_payment'
];
const OPEN_CASE_STATUSES = ['new', 'assigned', 'en_route', 'on_site', 'in_progress'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retryOp(fn, label) {
  const delays = [500, 1500, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const isRateLimit = e.message?.includes('Rate limit') || e.message?.includes('429') || e.status === 429;
      if (isRateLimit && attempt < delays.length) {
        console.log(`[RETRY] ${label} attempt ${attempt + 1}, waiting ${delays[attempt]}ms`);
        await sleep(delays[attempt]);
      } else {
        throw e;
      }
    }
  }
}

const BATCH_SIZE = 20;
const ITEM_DELAY_MS = 150;
const BATCH_DELAY_MS = 1000;

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { limit = 30, dry_run = false, force = false } = body;

    console.log('[CLOSE] Fetching open appeal IDs from Nati DB...');
    const natiRows = await withNatiConnection(async (connection) => {
      const [rows] = await connection.query('SELECT id FROM call_open_appeals');
      return rows;
    }, { force });

    const natiOpenIds = new Set(natiRows.map(r => String(r.id)));
    console.log(`[CLOSE] Nati has ${natiOpenIds.size} open appeals`);

    // Safety: refuse to auto-close everything if Nati returned suspiciously few rows.
    // A transient DB hiccup or schema change must not cascade into closing every open
    // local call. Admin can override with { force: true }.
    const MIN_NATI_OPEN_THRESHOLD = 10;
    if (!force && natiOpenIds.size < MIN_NATI_OPEN_THRESHOLD) {
      return Response.json({
        error: 'מספר הקריאות הפתוחות מנתי נמוך באופן חשוד - הסגירה האוטומטית בוטלה',
        nati_open_count: natiOpenIds.size,
        threshold: MIN_NATI_OPEN_THRESHOLD,
        hint: 'להפעיל מחדש עם force=true רק אם הספירה הנמוכה תקינה',
      }, { status: 409 });
    }

    const sdk = base44.asServiceRole;
    const [existingCalls, existingCases] = await Promise.all([
      sdk.entities.Call.filter({}),
      sdk.entities.Case.filter({}),
    ]);

    const staleCalls = existingCalls.filter(c =>
      c.call_number && OPEN_CALL_STATUSES.includes(c.call_status) && !natiOpenIds.has(c.call_number)
    );
    const staleCases = existingCases.filter(c =>
      c.case_number && OPEN_CASE_STATUSES.includes(c.status) && !natiOpenIds.has(c.case_number)
    );

    console.log(`[CLOSE] Found ${staleCalls.length} stale calls, ${staleCases.length} stale cases`);

    if (dry_run) {
      return Response.json({
        success: true, mode: 'dry_run',
        nati_open_count: natiOpenIds.size,
        stale_calls: staleCalls.length,
        stale_cases: staleCases.length,
        sample_stale_calls: staleCalls.slice(0, 5).map(c => ({
          id: c.id, call_number: c.call_number, status: c.call_status, customer: c.customer_name
        })),
        sample_stale_cases: staleCases.slice(0, 5).map(c => ({
          id: c.id, case_number: c.case_number, status: c.status, customer: c.customer_name
        })),
      });
    }

    const callsToClose = staleCalls.slice(0, limit);
    const casesToClose = staleCases.slice(0, limit);
    let callsClosed = 0, casesClosed = 0, errors = 0;
    const now = new Date().toISOString();

    // Close stale calls in batches
    for (let i = 0; i < callsToClose.length; i += BATCH_SIZE) {
      const batch = callsToClose.slice(i, i + BATCH_SIZE);
      for (const call of batch) {
        try {
          await retryOp(() => sdk.entities.Call.update(call.id, {
            call_status: 'completed', closed_at: now,
            operator_notes: (call.operator_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
          }), `Call.close(${call.call_number})`);
          callsClosed++;
        } catch (e) {
          console.error(`[CLOSE] Call ${call.call_number} error:`, e.message);
          errors++;
        }
        await sleep(ITEM_DELAY_MS);
      }
      if (i + BATCH_SIZE < callsToClose.length) await sleep(BATCH_DELAY_MS);
    }

    // Close stale cases in batches
    for (let i = 0; i < casesToClose.length; i += BATCH_SIZE) {
      const batch = casesToClose.slice(i, i + BATCH_SIZE);
      for (const cs of batch) {
        try {
          await retryOp(() => sdk.entities.Case.update(cs.id, {
            status: 'completed', completed_at: now, source_status: 'closed',
            internal_notes: (cs.internal_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
          }), `Case.close(${cs.case_number})`);
          casesClosed++;
        } catch (e) {
          console.error(`[CLOSE] Case ${cs.case_number} error:`, e.message);
          errors++;
        }
        await sleep(ITEM_DELAY_MS);
      }
      if (i + BATCH_SIZE < casesToClose.length) await sleep(BATCH_DELAY_MS);
    }

    const duration = Date.now() - startTime;
    return Response.json({
      success: true,
      nati_open_count: natiOpenIds.size,
      stale_calls_total: staleCalls.length,
      stale_cases_total: staleCases.length,
      calls_closed: callsClosed, cases_closed: casesClosed,
      remaining_stale_calls: staleCalls.length - callsClosed,
      remaining_stale_cases: staleCases.length - casesClosed,
      errors, duration_ms: duration,
    });
  } catch (error) {
    console.error('[CLOSE] Fatal error:', error);
    return natiErrorResponse(error);
  }
});