/**
 * importNatiPricing — Import vendor pricing / agreements (גרר / ניידת = הסכמים)
 * from the Nati MySQL DB into our Base44 entities, so they show up in the
 * existing "ניהול חוזים והסכמי תמחור" screen (src/pages/VendorContracts.jsx):
 *   - VendorContract  → tab "חוזי ספקים"      (per-vendor agreement: rates, SLA…)
 *   - OperationalRate → tab "הסכמי תמחור"     (global tariff rules: night/area…)
 *
 * STATUS: SKELETON. The connection, auth, batching, dedup, dry-run and write
 * paths are complete. The only thing left is the SOURCE→target field MAPPING,
 * which we can only finish once `discoverNatiPricing` tells us the real table
 * and column names. Everything marked `TODO(discovery)` is the part to fill in.
 *
 * Until SOURCE_TABLE is set, the function refuses to query (returns a clear
 * message) so deploying the skeleton can never run a broken/destructive query.
 *
 * Rate-limit safety mirrors syncNatiData: ONE withNatiConnection() call, 150ms
 * between writes, batches of 20, exponential backoff on 429s, guarded by the
 * shared circuit breaker.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { withNatiConnection, natiErrorResponse } from './_shared/natiDb.ts';

// ========== RATE-LIMIT HELPERS (same shape as syncNatiData) ==========

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retryOp<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [500, 1500, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = (e as { message?: string; status?: number })?.message || '';
      const isRateLimit = msg.includes('Rate limit') || msg.includes('429') || (e as { status?: number })?.status === 429;
      if (isRateLimit && attempt < delays.length) {
        console.log(`[IMPORT] retry ${label} #${attempt + 1}, wait ${delays[attempt]}ms`);
        await sleep(delays[attempt]);
      } else {
        throw e;
      }
    }
  }
  throw new Error(`unreachable: ${label}`);
}

const BATCH_SIZE = 20;
const ITEM_DELAY_MS = 150;
const BATCH_DELAY_MS = 1000;

function clean<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out as Partial<T>;
}

// ========== SOURCE CONFIG — fill after discoverNatiPricing ==========
//
// TODO(discovery): set the real Nati table + the SELECT once we see the schema.
// Examples of what we expect to learn:
//   - Are pricing columns ON `suppliers` (e.g. s.price_per_km), or a separate
//     table (e.g. supplier_agreements / supplier_prices)?
//   - How are towing (department 3) vs. mobile-unit (department 4) rates split?
//
// Leave SOURCE_TABLE empty to keep the skeleton inert until we know.
const SOURCE_TABLE = ''; // e.g. 'supplier_agreements' or 'suppliers'
const SOURCE_SELECT = ''; // e.g. 'SELECT * FROM supplier_agreements'

// ========== MAPPERS — fill after discoverNatiPricing ==========
//
// Map one Nati source row → a VendorContract record (tab "חוזי ספקים").
// Field names on the RIGHT are placeholders; replace with real Nati columns.
// VendorContract required fields: vendor_id, vendor_name, contract_type,
// start_date, end_date. contract_type ∈ per_call|monthly|yearly|hourly.
function mapToVendorContract(row: Record<string, unknown>): Record<string, unknown> {
  return clean({
    vendor_id: row.supplier_id != null ? String(row.supplier_id) : '', // TODO(discovery)
    vendor_name: (row.supplier_name as string) || '', // TODO(discovery)
    contract_number: row.agreement_id != null ? String(row.agreement_id) : '', // TODO(discovery)
    contract_type: 'per_call', // TODO(discovery): derive from source
    status: 'active', // TODO(discovery)
    // start_date / end_date are REQUIRED by the entity — must be filled from source:
    start_date: undefined, // TODO(discovery): parseNatiDate(row.start_date)?.slice(0,10)
    end_date: undefined, // TODO(discovery)
    rate_per_call: typeof row.rate_per_call === 'number' ? row.rate_per_call : undefined, // TODO(discovery)
    hourly_rate: typeof row.hourly_rate === 'number' ? row.hourly_rate : undefined, // TODO(discovery)
    monthly_fee: typeof row.monthly_fee === 'number' ? row.monthly_fee : undefined, // TODO(discovery)
    service_types: undefined, // TODO(discovery): ['towing'] / ['mobile_unit'] per department
    notes: 'יובא ממערכת נתי', // provenance marker
  });
}

// Map one Nati source row → an OperationalRate record (tab "הסכמי תמחור").
// Required: name, rate_type, amount. rate_type ∈ base|time_surcharge|
// area_surcharge|toll_road|vehicle_type|service_type.
function mapToOperationalRate(row: Record<string, unknown>): Record<string, unknown> {
  return clean({
    name: (row.rate_name as string) || '', // TODO(discovery)
    rate_type: 'base', // TODO(discovery)
    amount: typeof row.amount === 'number' ? row.amount : undefined, // TODO(discovery)
    is_percentage: false, // TODO(discovery)
    is_active: true,
    condition_label: (row.condition_label as string) || '', // TODO(discovery)
    notes: 'יובא ממערכת נתי',
  });
}

// ========== GENERIC UPSERT (dedup by a stable key) ==========

async function upsertAll(
  sdk: { entities: Record<string, { create: (d: unknown) => Promise<{ id: string }>; update: (id: string, d: unknown) => Promise<unknown> }> },
  entityName: string,
  items: Record<string, unknown>[],
  keyField: string,
  existingLookup: Record<string, string>
) {
  let created = 0, updated = 0, skipped = 0, errors = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    for (const item of batch) {
      try {
        const key = item[keyField] != null ? String(item[keyField]) : '';
        if (!key) { skipped++; continue; }
        const existingId = existingLookup[key];
        if (existingId) {
          await retryOp(() => sdk.entities[entityName].update(existingId, item), `${entityName}.update(${key})`);
          updated++;
        } else {
          const res = await retryOp(() => sdk.entities[entityName].create(item), `${entityName}.create(${key})`);
          existingLookup[key] = res.id;
          created++;
        }
      } catch (e) {
        console.error(`[IMPORT] ${entityName} error:`, (e as { message?: string })?.message);
        errors++;
      }
      await sleep(ITEM_DELAY_MS);
    }
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
  }
  return { created, updated, skipped, errors };
}

// ========== MAIN ==========

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth: admin user OR scheduled automation (same pattern as syncNatiData).
    const automationKey = Deno.env.get('SYNC_AUTOMATION_KEY');
    const isAutomation = (!!automationKey && body.automation_key === automationKey) || !!body.automation;
    if (!isAutomation) {
      let user = null;
      try { user = await base44.auth.me(); } catch (_) { /* no user */ }
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
      }
    }

    // dry_run defaults to TRUE — first run is always a safe preview.
    const {
      dry_run = true,
      import_contracts = true,
      import_rates = false,
      force = false,
    } = body;

    if (!SOURCE_TABLE || !SOURCE_SELECT) {
      return Response.json({
        success: false,
        status: 'NOT_CONFIGURED',
        message:
          'שלד הייבוא מוכן, אך מקור הנתונים בנתי עדיין לא הוגדר. הריצו קודם את discoverNatiPricing, ' +
          'ואז נמלא את SOURCE_TABLE / SOURCE_SELECT והמיפוי (mapToVendorContract / mapToOperationalRate).',
      }, { status: 200 });
    }

    // 1) Read source rows from Nati — single connection.
    console.log('[IMPORT] Connecting to Nati DB...');
    const rows = await withNatiConnection(async (connection) => {
      const [r] = await connection.query(SOURCE_SELECT);
      return r as Record<string, unknown>[];
    }, { force });
    console.log(`[IMPORT] Got ${rows.length} source rows from ${SOURCE_TABLE}`);

    const contractItems = import_contracts ? rows.map(mapToVendorContract) : [];
    const rateItems = import_rates ? rows.map(mapToOperationalRate) : [];

    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        source_table: SOURCE_TABLE,
        total_source_rows: rows.length,
        sample_source_row: rows[0] ?? null,
        sample_contract: contractItems[0] ?? null,
        sample_rate: rateItems[0] ?? null,
      });
    }

    // 2) Write — dedup against what already exists.
    const sdk = base44.asServiceRole;
    const results: Record<string, unknown> = {};

    if (import_contracts) {
      const existing = await sdk.entities.VendorContract.filter({});
      const lookup: Record<string, string> = {};
      for (const c of existing) {
        if (c.contract_number) lookup[String(c.contract_number)] = c.id;
      }
      results.contracts = await upsertAll(sdk, 'VendorContract', contractItems, 'contract_number', lookup);
    }

    if (import_rates) {
      const existing = await sdk.entities.OperationalRate.filter({});
      const lookup: Record<string, string> = {};
      for (const r of existing) {
        if (r.name) lookup[String(r.name)] = r.id;
      }
      results.rates = await upsertAll(sdk, 'OperationalRate', rateItems, 'name', lookup);
    }

    return Response.json({ success: true, source_table: SOURCE_TABLE, total_source_rows: rows.length, ...results });
  } catch (error) {
    console.error('[IMPORT] Fatal error:', error);
    return natiErrorResponse(error);
  }
});
