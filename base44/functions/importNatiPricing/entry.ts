/**
 * importNatiPricing — Import vendor towing pricing from the Nati MySQL DB into
 * our VendorContract entity, so rates show up in "ניהול חוזים והסכמי תמחור"
 * (src/pages/VendorContracts.jsx, tab "חוזי ספקים").
 *
 * Source: supplier_distance_price_list (per supplier_id) JOIN suppliers (name/type).
 *
 * Self-contained (no local imports): inlines a single guarded MySQL connection,
 * mirroring discoverNatiPricing. TLS negotiated, CA verification relaxed (channel
 * still encrypted; access locked down by RDS IP allow-listing). ONE connection.
 *
 * dry_run defaults to TRUE — first run is always a safe preview.
 * Auth: admin user OR scheduled automation (SYNC_AUTOMATION_KEY).
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import mysql from 'npm:mysql2@3.9.7/promise';

const CONNECT_TIMEOUT_MS = 20_000;
const BATCH_SIZE = 20;
const ITEM_DELAY_MS = 150;
const BATCH_DELAY_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retryOp(fn, label) {
  const delays = [500, 1500, 4000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e?.message || '';
      const isRateLimit = msg.includes('Rate limit') || msg.includes('429') || e?.status === 429;
      if (isRateLimit && attempt < delays.length) {
        await sleep(delays[attempt]);
      } else {
        throw e;
      }
    }
  }
  throw new Error(`unreachable: ${label}`);
}

function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

function num(v) {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function dateStr(v) {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return undefined;
  // Nati uses 1899-11-30 (or year < 1970) as an "empty" date — treat as missing.
  if (d.getUTCFullYear() < 1970) return undefined;
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

async function connectNati() {
  const base = {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: CONNECT_TIMEOUT_MS,
  };
  const sslVariants = [{ ssl: { rejectUnauthorized: false } }, { ssl: {} }, {}];
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

const SOURCE_SELECT = `
  SELECT
    p.supplier_id,
    s.fullname              AS supplier_name,
    s.type                  AS supplier_type,
    p.default_distance_km,
    p.default_distance_price,
    p.double_distance_price,
    p.extra_km_price,
    p.double_extra_km_price,
    p.futile_km_price,
    p.double_futile_km_price,
    p.regular_extra,
    p.commercial_extra,
    p.evening_extra,
    p.commercial_evening_extra,
    p.night_extra,
    p.commercial_night_extra,
    p.holiday_extra,
    p.commercial_holiday_extra,
    p.truck_extra,
    p.palestina_extra,
    p.commercial_palestina_extra,
    p.road6,
    p.from_d,
    p.to_d
  FROM supplier_distance_price_list p
  LEFT JOIN suppliers s ON s.id = p.supplier_id
`;

// One Nati row → VendorContract (tab "חוזי ספקים").
// Required: vendor_id, vendor_name, contract_type, start_date, end_date.
function mapToVendorContract(row) {
  return clean({
    vendor_id: row.supplier_id != null ? String(row.supplier_id) : '',
    vendor_name: row.supplier_name || `ספק ${row.supplier_id}`,
    contract_number: `NATI-${row.supplier_id}`,
    contract_type: 'per_call',
    status: 'active',
    start_date: dateStr(row.from_d) || '2020-01-01',
    end_date: dateStr(row.to_d) || '2099-12-31',
    rate_per_call: num(row.default_distance_price),
    special_terms: buildTerms(row),
    notes: 'יובא ממערכת נתי',
  });
}

// Pack the detailed distance/surcharge fields into special_terms (no dedicated
// VendorContract columns exist for them) so nothing from Nati is lost.
function buildTerms(row) {
  const parts = [];
  const add = (label, v, suffix = '') => {
    const n = num(v);
    if (n != null && n !== 0) parts.push(`${label}: ${n}${suffix}`);
  };
  add(`ק"מ בסיס`, row.default_distance_km, ' ק"מ');
  add('מחיר בסיס', row.default_distance_price, ' ₪');
  add(`דאבל ג'נט`, row.double_distance_price, ' ₪');
  add(`ק"מ נוסף`, row.extra_km_price, ' ₪');
  add(`ק"מ נוסף דאבל`, row.double_extra_km_price, ' ₪');
  add(`ק"מ סרק`, row.futile_km_price, ' ₪');
  add(`ק"מ סרק דאבל`, row.double_futile_km_price, ' ₪');
  add('תוספת ערב', row.evening_extra, '%');
  add('תוספת לילה', row.night_extra, '%');
  add('תוספת חג', row.holiday_extra, '%');
  add('תוספת מסחרי', row.commercial_extra, '%');
  add('תוספת משאית', row.truck_extra, '%');
  add('תוספת שטחים', row.palestina_extra, '%');
  add('כביש 6', row.road6, ' ₪');
  return parts.join(' | ');
}

async function upsertAll(sdk, entityName, items, keyField, existingLookup) {
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
        console.error(`[IMPORT] ${entityName} error:`, e?.message);
        errors++;
      }
      await sleep(ITEM_DELAY_MS);
    }
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
  }
  return { created, updated, skipped, errors };
}

Deno.serve(async (req) => {
  let connection;
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const automationKey = Deno.env.get('SYNC_AUTOMATION_KEY');
    const isAutomation = (!!automationKey && body.automation_key === automationKey) || !!body.automation;
    if (!isAutomation) {
      let user = null;
      try { user = await base44.auth.me(); } catch (_) { /* no user */ }
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
      }
    }

    const { dry_run = true } = body;

    if (!Deno.env.get('NATID_DB_HOST')) {
      return Response.json({ success: false, error: 'Missing NATID_DB_* secrets' }, { status: 500 });
    }

    connection = await connectNati();
    const [rows] = await connection.query(SOURCE_SELECT);
    console.log(`[IMPORT] Got ${rows.length} pricing rows from Nati`);

    const contractItems = rows.map(mapToVendorContract);

    if (dry_run) {
      return Response.json({
        success: true,
        mode: 'dry_run',
        source_table: 'supplier_distance_price_list',
        total_source_rows: rows.length,
        sample_source_row: rows[0] ?? null,
        sample_contract: contractItems[0] ?? null,
      });
    }

    const sdk = base44.asServiceRole;
    const existing = await sdk.entities.VendorContract.filter({});
    const lookup = {};
    for (const c of existing) {
      if (c.contract_number) lookup[String(c.contract_number)] = c.id;
    }
    const contracts = await upsertAll(sdk, 'VendorContract', contractItems, 'contract_number', lookup);

    return Response.json({
      success: true,
      source_table: 'supplier_distance_price_list',
      total_source_rows: rows.length,
      contracts,
    });
  } catch (error) {
    console.error('[IMPORT] Fatal error:', error);
    return Response.json({ success: false, error: error?.message || 'import failed' }, { status: 500 });
  } finally {
    if (connection) await connection.end().catch(() => {});
  }
});