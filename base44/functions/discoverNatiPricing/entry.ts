/**
 * discoverNatiPricing — One-shot schema discovery for vendor pricing / agreements
 * in the Nati MySQL DB. Admin only, read-only.
 *
 * Connection goes through the shared _shared/natiDb circuit breaker (NOT a raw
 * inline connection). Nati's RDS blocks any IP that accumulates too many failed
 * connects, and the single biggest source of those failures was negotiating TLS
 * against the Amazon RDS CA the Deno runtime doesn't trust. The shared layer uses
 * ONE correct TLS config (rejectUnauthorized:false) and a Deno-KV circuit breaker,
 * so this function can never re-trigger the block the way an inline multi-variant
 * SSL loop did. ONE connection per run.
 *
 * IMPORTANT: do NOT reintroduce a raw mysql.createConnection here. If the Base44
 * builder regenerates this file, re-apply this withNatiConnection wiring.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import mysql from 'npm:mysql2@3.9.7/promise';

// ===== Inline Nati DB layer (kept per-file: an earlier shared _shared/natiDb
// import failed to deploy. Circuit state below lives in Deno KV, so it is
// shared + persistent across all Nati functions and warm/cold starts — unlike
// a plain in-memory variable, which let each function keep hammering Nati
// independently even while a sibling function was already cooling down) =====
const NATI_CONNECT_TIMEOUT_MS = 20_000;
const NATI_FAIL_THRESHOLD = 3;
const NATI_GENERIC_COOLDOWN_MS = 2 * 60_000;
const NATI_BLOCKED_COOLDOWN_MS = 10 * 60_000;
const NATI_CIRCUIT_KV_KEY = ['nati_circuit'];

async function getNatiCircuit() {
  const kv = await Deno.openKv();
  const entry = await kv.get(NATI_CIRCUIT_KV_KEY);
  return entry.value || { blockedUntil: 0, failures: 0, reason: '' };
}

async function setNatiCircuit(circuit) {
  const kv = await Deno.openKv();
  await kv.set(NATI_CIRCUIT_KV_KEY, circuit);
}

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
  const natiCircuit = await getNatiCircuit();
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
      await setNatiCircuit({ blockedUntil: now + NATI_BLOCKED_COOLDOWN_MS, failures: natiCircuit.failures + 1, reason: 'host_blocked' });
      throw new NatiBlockedError(
        'נתי חסמו זמנית את הכתובת שלנו (Host is blocked). צריך שמנהל ה-DB בצד של נתי יריץ FLUSH HOSTS. עד אז עוצרים את הניסיונות ל-10 דקות כדי לא להחמיר.',
        Math.ceil(NATI_BLOCKED_COOLDOWN_MS / 1000),
        'host_blocked'
      );
    }
    const failures = natiCircuit.failures + 1;
    await setNatiCircuit({
      blockedUntil: failures >= NATI_FAIL_THRESHOLD ? now + NATI_GENERIC_COOLDOWN_MS : 0,
      failures,
      reason: failures >= NATI_FAIL_THRESHOLD ? 'connect_failures' : '',
    });
    throw err;
  }

  try {
    await setNatiCircuit({ blockedUntil: 0, failures: 0, reason: '' });
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

const PRICING_HINTS = [
  'price', 'pricing', 'rate', 'tariff', 'cost', 'fee', 'payment', 'invoice',
  'agreement', 'contract', 'hesken', 'heskem', 'taarif', 'mehir',
  'supplier', 'kablan', 'vendor', 'grar', 'towing', 'tow', 'niydet', 'sla',
];

function looksLikePricing(name) {
  const lower = String(name).toLowerCase();
  return PRICING_HINTS.some((h) => lower.includes(h));
}

const IDENT_RE = /^[A-Za-z0-9_$]+$/;
const MAX_TABLES_DESCRIBED = 20;
const SAMPLE_LIMIT = 3;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  }

  if (!Deno.env.get('NATID_DB_HOST')) {
    return Response.json({ success: false, error: 'Missing NATID_DB_* secrets' }, { status: 500 });
  }

  // compact=true → return columns as "name:type" strings and limit/skip samples,
  // so a full table fits inside the response-size limit.
  const compact = body?.compact === true;
  const withSample = body?.with_sample !== false;
  // Keep all_tables out of the default response (200+ names bloat the payload).
  const includeAll = body?.include_all_tables === true;
  // force=true lets an admin who just ran FLUSH HOSTS bypass the breaker cooldown.
  const force = body?.force === true;

  try {
    const result = await withNatiConnection(async (connection) => {
      const [tableRows] = await connection.query('SHOW TABLES');
      const allTables = tableRows
        .map((r) => String(Object.values(r)[0]))
        .filter((t) => IDENT_RE.test(t));

      // If specific tables are requested, describe only those (keeps the response
      // small enough to read in full). Otherwise auto-detect pricing-like tables.
      const requested = Array.isArray(body?.tables)
        ? body.tables.filter((t) => IDENT_RE.test(t))
        : null;
      const candidates = requested && requested.length
        ? requested.slice(0, MAX_TABLES_DESCRIBED)
        : Array.from(
            new Set(
              allTables.filter((t) => looksLikePricing(t) || t.toLowerCase() === 'suppliers')
            )
          ).slice(0, MAX_TABLES_DESCRIBED);

      const details = [];
      for (const table of candidates) {
        try {
          const [columns] = await connection.query(`DESCRIBE \`${table}\``);

          let totalRows = null;
          try {
            const [countRows] = await connection.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
            totalRows = Number(countRows[0]?.cnt ?? 0);
          } catch (_) { /* count may fail; leave null */ }

          let sample = [];
          if (withSample) {
            try {
              const [sampleRows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT ${SAMPLE_LIMIT}`);
              sample = sampleRows;
            } catch (_) { /* sample is best-effort */ }
          }

          details.push({
            table,
            total_rows: totalRows,
            columns: compact ? columns.map((c) => `${c.Field}:${c.Type}`) : columns,
            pricing_like_columns: columns.map((c) => c.Field).filter((f) => looksLikePricing(f)),
            sample: compact ? sample.slice(0, 1) : sample,
          });
        } catch (e) {
          details.push({
            table,
            total_rows: null,
            columns: [],
            pricing_like_columns: [],
            sample: [],
            error: e?.message || 'DESCRIBE failed',
          });
        }
      }

      return {
        success: true,
        total_tables: allTables.length,
        ...(includeAll ? { all_tables: allTables } : {}),
        candidate_tables: candidates,
        details,
      };
    }, { force });

    return Response.json(result, { status: 200 });
  } catch (e) {
    return natiErrorResponse(e);
  }
});