/**
 * testNatiConnection — Tests direct MySQL connection to Natid DB
 * Admin only. Returns connection diagnostics + sample table list.
 *
 * Uses a SINGLE connection (via ./_shared/natiDb.ts) for both the ping and the
 * table list — every extra connection is one more chance to trip Nati's
 * max_connect_errors block. The shared circuit breaker also means that if we are
 * already in a cooldown, we report it instead of adding another failed connect.
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
// ===== End inline Nati DB layer =====

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  }

  const results: Record<string, unknown> = {
    config: {
      host: Deno.env.get('NATID_DB_HOST'),
      port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
      user: Deno.env.get('NATID_DB_USER'),
      database: Deno.env.get('NATID_DB_NAME'),
      has_password: !!Deno.env.get('NATID_DB_PASSWORD'),
    },
  };

  try {
    const data = await withNatiConnection(async (connection) => {
      const [ping] = await connection.query('SELECT 1 as test, NOW() as server_time');
      const [tables] = await connection.query('SHOW TABLES');
      return { ping: ping[0], tables: tables.map((t) => Object.values(t)[0]) };
    });
    results.test1_ssl = { status: 'OK', data: data.ping };
    results.test3_tables = { status: 'OK', tables: data.tables };
  } catch (e) {
    if (e instanceof NatiBlockedError) {
      results.test1_ssl = {
        status: 'COOLDOWN',
        error: e.message,
        retry_after_seconds: e.retryAfterSec,
        reason: e.reason,
      };
    } else {
      results.test1_ssl = { status: 'FAILED', error: (e as { message?: string })?.message };
    }
  }

  return Response.json(results, { status: 200 });
});