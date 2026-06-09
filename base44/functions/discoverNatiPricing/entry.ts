/**
 * discoverNatiPricing — One-shot schema discovery for vendor pricing / agreements
 * in the Nati MySQL DB. Admin only, read-only.
 *
 * Self-contained (no local imports): inlines a single guarded MySQL connection.
 * TLS is negotiated but CA verification is relaxed (channel still encrypted;
 * access is locked down by RDS IP allow-listing). Opens exactly ONE connection.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import mysql from 'npm:mysql2@3.9.7/promise';

const CONNECT_TIMEOUT_MS = 20_000;

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

async function connectNati() {
  const base = {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: CONNECT_TIMEOUT_MS,
  };
  // Try a few SSL strategies; Nati RDS uses an Amazon CA the runtime may not trust.
  const sslVariants = [
    { ssl: { rejectUnauthorized: false } },
    { ssl: {} },
    {},
  ];
  let lastErr;
  for (const variant of sslVariants) {
    try {
      return await mysql.createConnection({ ...base, ...variant });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

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

  let connection;
  try {
    connection = await connectNati();

    const [tableRows] = await connection.query('SHOW TABLES');
    const allTables = tableRows
      .map((r) => String(Object.values(r)[0]))
      .filter((t) => IDENT_RE.test(t));

    // If specific tables are requested, describe only those (keeps the response
    // small enough to read in full). Otherwise auto-detect pricing-like tables.
    const requested = Array.isArray(body?.tables) ? body.tables.filter((t) => IDENT_RE.test(t)) : null;
    const candidates = requested && requested.length
      ? requested.slice(0, MAX_TABLES_DESCRIBED)
      : Array.from(
          new Set(
            allTables.filter((t) => looksLikePricing(t) || t.toLowerCase() === 'suppliers')
          )
        ).slice(0, MAX_TABLES_DESCRIBED);

    const details = [];

    // compact=true → return columns as "name:type" strings and limit/skip samples,
    // so a full table fits inside the response-size limit.
    const compact = body?.compact === true;
    const withSample = body?.with_sample !== false;

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
          columns: compact
            ? columns.map((c) => `${c.Field}:${c.Type}`)
            : columns,
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

    // Keep all_tables out of the default response (224 names bloat the payload and
    // push candidate_tables/details past the log truncation limit). Pass
    // include_all_tables: true to get them back.
    const includeAll = body?.include_all_tables === true;
    return Response.json({
      success: true,
      total_tables: allTables.length,
      ...(includeAll ? { all_tables: allTables } : {}),
      candidate_tables: candidates,
      details,
    }, { status: 200 });
  } catch (e) {
    return Response.json({
      success: false,
      error: e?.message || 'discovery failed',
    }, { status: 500 });
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
});