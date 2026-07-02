/**
 * fetchLiveNatiData — Direct MySQL query to Natid database
 * Uses call_open_appeals (open) or call_closed_appeals (closed) with JOIN to suppliers.
 *
 * Params:
 *   - action: "appeals_list" | "appeal_details"
 *   - appeal_id: (for appeal_details — searches both tables)
 *   - dep: department_id filter (-1 = all)
 *   - callStatus: status filter (-1 = all)
 *   - include_closed: if true, also include closed appeals
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
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
    }

    const { action = 'appeals_list', appeal_id, dep = -1, callStatus = -1, include_closed = false } = await req.json();

    const result = await withNatiConnection(async (connection) => {
      if (action === 'appeal_details' && appeal_id) {
        // Search both open and closed tables
        let [rows] = await connection.query(
          'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE a.id = ? LIMIT 1',
          [appeal_id]
        );
        if (rows.length === 0) {
          [rows] = await connection.query(
            'SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE a.id = ? LIMIT 1',
            [appeal_id]
          );
        }
        return { success: true, data: rows[0] || null };
      }

      // Default: appeals list from call_open_appeals
      let sql = 'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
      const params = [];
      if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
      if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
      sql += ' ORDER BY a.date_added DESC';

      const [rows] = await connection.query(sql, params);

      let closedRows = [];
      if (include_closed) {
        let closedSql = 'SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
        const closedParams = [];
        if (dep !== -1) { closedSql += ' AND a.department_id = ?'; closedParams.push(dep); }
        if (callStatus !== -1) { closedSql += ' AND a.status = ?'; closedParams.push(callStatus); }
        closedSql += ' ORDER BY a.date_added DESC LIMIT 1000';
        [closedRows] = await connection.query(closedSql, closedParams);
      }

      return {
        success: true,
        total: rows.length + closedRows.length,
        open_count: rows.length,
        closed_count: closedRows.length,
        data: [...rows, ...closedRows],
        fetched_at: new Date().toISOString(),
      };
    });

    return Response.json(result);
  } catch (error) {
    console.error('fetchLiveNatiData error:', error);
    return natiErrorResponse(error);
  }
});