/**
 * fetchNatiAppeals — Direct MySQL query to Natid database
 * Admin-only. Supports filters: dep, callStatus, from_date, to_date, q, source (open/closed/all)
 *
 * Connection handling + circuit breaker live in ./_shared/natiDb.ts.
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dir = 'DESC', from_date, to_date, q, source = 'open' } = body;

    const allRows = await withNatiConnection(async (connection) => {
      const table = source === 'closed' ? 'call_closed_appeals' : 'call_open_appeals';
      let sql = `SELECT a.*, s.fullname as supplier_name FROM ${table} a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1`;
      const params = [];

      if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
      if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
      if (from_date) { sql += ' AND a.date_added >= ?'; params.push(from_date); }
      if (to_date) { sql += ' AND a.date_added <= ?'; params.push(to_date); }
      if (q) {
        sql += ' AND (a.requester LIKE ? OR a.id LIKE ? OR a.tel LIKE ? OR a.car_num LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY a.date_added ${dir === 'ASC' ? 'ASC' : 'DESC'}`;

      const [rows] = await connection.query(sql, params);

      // If source is 'all', also query the closed table on the same connection.
      if (source === 'all') {
        let sql2 = `SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1`;
        const params2 = [];
        if (dep !== -1) { sql2 += ' AND a.department_id = ?'; params2.push(dep); }
        if (callStatus !== -1) { sql2 += ' AND a.status = ?'; params2.push(callStatus); }
        if (from_date) { sql2 += ' AND a.date_added >= ?'; params2.push(from_date); }
        if (to_date) { sql2 += ' AND a.date_added <= ?'; params2.push(to_date); }
        if (q) {
          sql2 += ' AND (a.requester LIKE ? OR a.id LIKE ? OR a.tel LIKE ? OR a.car_num LIKE ?)';
          const s2 = `%${q}%`;
          params2.push(s2, s2, s2, s2);
        }
        sql2 += ` ORDER BY a.date_added ${dir === 'ASC' ? 'ASC' : 'DESC'} LIMIT 5000`;
        const [closedRows] = await connection.query(sql2, params2);
        return [...rows, ...closedRows];
      }
      return rows;
    });

    return Response.json({ success: true, total: allRows.length, data: allRows });
  } catch (error) {
    console.error('fetchNatiAppeals error:', error);
    return natiErrorResponse(error);
  }
});