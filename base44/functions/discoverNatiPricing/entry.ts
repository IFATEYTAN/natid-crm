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
import { withNatiConnection, natiErrorResponse } from './_shared/natiDb.ts';

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
