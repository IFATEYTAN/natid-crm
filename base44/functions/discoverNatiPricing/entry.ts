/**
 * discoverNatiPricing — One-shot schema discovery for vendor pricing / agreements
 * in the Nati MySQL DB. Admin only, read-only.
 *
 * Purpose: answer "does Nati's original DB hold supplier pricing / tariffs
 * (גרר / ניידת = הסכמים), and in what shape?" so we can decide how to import it
 * into our VendorContract / OperationalRate entities.
 *
 * Why a dedicated function (vs. ad-hoc queries from a dev box): the Nati RDS only
 * accepts connections from the allow-listed static proxy IP, and the DB secrets
 * are injected into the Base44 runtime — neither is available outside Production.
 * So discovery has to run here, from the function runtime.
 *
 * Rate-limit safety: ALL queries run inside a SINGLE withNatiConnection() call, so
 * we open exactly one connection. The shared circuit breaker still guards us if
 * Nati has already blocked the IP (we report a cooldown instead of piling on more
 * failed connects).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { withNatiConnection, NatiBlockedError } from './_shared/natiDb.ts';

// Table/column name fragments that hint at pricing or agreements. Hebrew systems
// often transliterate, so we cover both English and common Hebrew romanizations.
const PRICING_HINTS = [
  'price', 'pricing', 'rate', 'tariff', 'cost', 'fee', 'payment', 'invoice',
  'agreement', 'contract', 'hesken', 'heskem', 'taarif', 'tariff', 'mehir',
  'supplier', 'kablan', 'vendor', 'grar', 'towing', 'tow', 'niydet', 'sla',
];

function looksLikePricing(name: string): boolean {
  const lower = String(name).toLowerCase();
  return PRICING_HINTS.some((h) => lower.includes(h));
}

// Defensive: only ever interpolate identifiers that come back from SHOW TABLES,
// and even then re-validate before using them in DESCRIBE / SELECT.
const IDENT_RE = /^[A-Za-z0-9_$]+$/;

const MAX_TABLES_DESCRIBED = 15; // cap heavy work on a single connection
const SAMPLE_LIMIT = 3;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  }

  try {
    const report = await withNatiConnection(async (connection) => {
      // 1) All tables in the DB.
      const [tableRows] = await connection.query('SHOW TABLES');
      const allTables = (tableRows as Record<string, unknown>[])
        .map((r) => String(Object.values(r)[0]))
        .filter((t) => IDENT_RE.test(t));

      // 2) Candidate tables: anything that smells like pricing/agreements, plus
      //    `suppliers` explicitly (pricing is often stored as columns on it).
      const candidates = Array.from(
        new Set(
          allTables
            .filter((t) => looksLikePricing(t) || t.toLowerCase() === 'suppliers')
        )
      ).slice(0, MAX_TABLES_DESCRIBED);

      // 3) For each candidate: column structure + a tiny sample so we can see the
      //    actual fields (e.g. price_per_km, base_rate, night_surcharge...).
      const details: Array<{
        table: string;
        total_rows: number | null;
        columns: Array<{ Field: string; Type: string; Null: string; Key: string; Default: unknown }>;
        pricing_like_columns: string[];
        sample: unknown[];
        error?: string;
      }> = [];

      for (const table of candidates) {
        try {
          const [columns] = await connection.query(`DESCRIBE \`${table}\``);
          const cols = columns as Array<{ Field: string; Type: string; Null: string; Key: string; Default: unknown }>;

          let totalRows: number | null = null;
          try {
            const [countRows] = await connection.query(`SELECT COUNT(*) AS cnt FROM \`${table}\``);
            totalRows = Number((countRows as Record<string, unknown>[])[0]?.cnt ?? 0);
          } catch (_) { /* count may fail on some tables; leave null */ }

          let sample: unknown[] = [];
          try {
            const [sampleRows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT ${SAMPLE_LIMIT}`);
            sample = sampleRows as unknown[];
          } catch (_) { /* sample is best-effort */ }

          details.push({
            table,
            total_rows: totalRows,
            columns: cols,
            pricing_like_columns: cols.map((c) => c.Field).filter((f) => looksLikePricing(f)),
            sample,
          });
        } catch (e) {
          details.push({
            table,
            total_rows: null,
            columns: [],
            pricing_like_columns: [],
            sample: [],
            error: (e as { message?: string })?.message || 'DESCRIBE failed',
          });
        }
      }

      return {
        total_tables: allTables.length,
        all_tables: allTables,
        candidate_tables: candidates,
        details,
      };
    });

    return Response.json({ success: true, ...report }, { status: 200 });
  } catch (e) {
    if (e instanceof NatiBlockedError) {
      return Response.json({
        success: false,
        status: 'COOLDOWN',
        error: e.message,
        retry_after_seconds: e.retryAfterSec,
        reason: e.reason,
      }, { status: 503, headers: { 'Retry-After': String(e.retryAfterSec) } });
    }
    return Response.json({
      success: false,
      error: (e as { message?: string })?.message || 'discovery failed',
    }, { status: 500 });
  }
});
