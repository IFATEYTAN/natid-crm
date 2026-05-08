/**
 * syncNatiAppeals — Direct MySQL sync from call_open_appeals
 * Full sync: vendors, customers, cases, calls.
 * Rate-limit protection: 150ms between items, batches of 20, exponential backoff retry.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

// ========== DB CONNECTION ==========

function getDbConfig() {
  return {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: 15000,
    ssl: { rejectUnauthorized: false },
  };
}

async function getConnection() {
  const config = getDbConfig();
  if (!config.host || !config.user || !config.password) throw new Error('Missing NATID_DB_* secrets');
  try { return await mysql.createConnection(config); }
  catch (e) { const { ssl, ...noSsl } = config; return await mysql.createConnection(noSsl); }
}

// ========== RATE LIMIT HELPERS ==========

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

// ========== MAPPINGS ==========

const DEPT_MAP = { 0: 'אחר', 3: 'גרירה', 4: 'ניידת שירות', 5: 'שמשות', 10: 'רכב חליפי' };
const CASE_STATUS_MAP = { 0: 'new', 1: 'assigned', 2: 'completed', 3: 'cancelled', 6: 'completed', 7: 'completed' };
const CALL_STATUS_MAP = { 0: 'waiting_treatment', 1: 'assigning', 2: 'completed', 3: 'cancelled', 6: 'completed', 7: 'completed' };
const VEHICLE_TYPE_MAP = { 1: 'private', 2: 'motorcycle', 3: 'truck', 4: 'commercial_light' };

function mapServiceType(deptId) {
  if (deptId === 3) return 'towing';
  if (deptId === 4) return 'mechanical';
  return 'other';
}

function mapIssueType(deptId) {
  if (deptId === 3) return 'stopped_driving';
  if (deptId === 4) return 'mechanical';
  return 'other';
}

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.startsWith('0000')) return null;
  if (s instanceof Date || (s.includes('-') && s.length >= 10)) return s.replace(' ', 'T').substring(0, 19);
  return null;
}

function clean(obj) {
  const c = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined && v !== null && v !== '') c[k] = v; }
  return c;
}

// ========== ENTITY MAPPERS ==========

function mapAppealToCase(a) {
  return {
    case_number: String(a.id),
    customer_name: a.requester || '',
    caller_name: a.requester || '',
    caller_phone: a.tel || a.tel1 || '',
    vehicle_number: a.car_num || '',
    vehicle_year: a.car_year || undefined,
    vehicle_type: VEHICLE_TYPE_MAP[a.car_type] || 'private',
    vehicle_model_code: a.car_code ? String(a.car_code) : '',
    service_type: mapServiceType(a.department_id),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: CASE_STATUS_MAP[a.status] || 'new',
    assigned_provider_name: a.supplier_name || '',
    department: DEPT_MAP[a.department_id] || 'אחר',
    problem_description: a.diagnose || '',
    internal_notes: a.q_notes || '',
    passed_qa: a.inspector_approves === 1,
    opening_source: a.open_from_api === 1 ? 'app' : 'call_center',
    source_status: a.finish_time ? 'closed' : 'open',
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
    customer_id: a.client_id ? String(a.client_id) : '',
    ...(parseNatiDate(a.arrive_actual_time) ? { arrived_at: parseNatiDate(a.arrive_actual_time) } : {}),
    ...(parseNatiDate(a.finish_time) ? { completed_at: parseNatiDate(a.finish_time) } : {}),
    ...(parseNatiDate(a.supplier_assigned_date) ? { assigned_at: parseNatiDate(a.supplier_assigned_date) } : {}),
    ...(parseNatiDate(a.arrive_expected_time) ? { vendor_arrival_time: parseNatiDate(a.arrive_expected_time) } : {}),
    ...(parseNatiDate(a.future_service_from) ? { future_service_time: parseNatiDate(a.future_service_from) } : {}),
  };
}

function mapAppealToCall(a) {
  return {
    call_number: String(a.id),
    call_status: CALL_STATUS_MAP[a.status] || 'waiting_treatment',
    call_priority: 'normal',
    service_category: a.department_id === 3 ? 'towing' : (a.department_id === 4 ? 'mobile_unit' : 'other'),
    issue_type: mapIssueType(a.department_id),
    issue_description: a.diagnose || '',
    customer_name: a.requester || '',
    customer_phone: a.tel || a.tel1 || 'לא צוין',
    customer_phone_2: a.tel1 || '',
    customer_id_number: a.client_id ? String(a.client_id) : '',
    membership_number: a.sub_num ? String(a.sub_num) : '',
    vehicle_plate: a.car_num || '',
    vehicle_type: VEHICLE_TYPE_MAP[a.car_type] || 'private',
    vehicle_code: a.car_code ? String(a.car_code) : '',
    pickup_location_address: a.address || 'לא צוין',
    pickup_location_city: a.city || '',
    dropoff_location_address: a.grar_address || '',
    dropoff_location_city: a.grar_city || '',
    dropoff_garage_name: a.garage || '',
    dropoff_garage_phone: a.garage_tel || '',
    storage_location_address: a.store_address || '',
    storage_location_city: a.store_city || '',
    assigned_vendor_name: a.supplier_name || '',
    operator_notes: a.q_notes || '',
    passed_quality_control: a.inspector_approves === 1,
    created_by_source: a.open_from_api === 1 ? 'bot' : 'operator',
    customer_response_code: a.car_pin || '',
    key_location: a.key_location || '',
    early_notification_minutes: a.reminder ? parseInt(a.reminder) : 30,
    ...(parseNatiDate(a.supplier_assigned_date) ? { assigned_at: parseNatiDate(a.supplier_assigned_date) } : {}),
    ...(parseNatiDate(a.arrive_expected_time) ? { vendor_arrival_time_estimated: parseNatiDate(a.arrive_expected_time) } : {}),
    ...(parseNatiDate(a.arrive_actual_time) ? { vendor_arrival_time_actual: parseNatiDate(a.arrive_actual_time) } : {}),
    ...(parseNatiDate(a.finish_time) ? { service_end_time: parseNatiDate(a.finish_time), closed_at: parseNatiDate(a.finish_time) } : {}),
    ...(a.num_of_km && a.num_of_km > 0 ? { estimated_distance_km: a.num_of_km } : {}),
    ...(parseNatiDate(a.future_service_from) ? { future_service_date: parseNatiDate(a.future_service_from).split('T')[0] } : {}),
  };
}

function extractUniqueVendors(appeals) {
  const vendors = new Map();
  for (const a of appeals) {
    const name = String(a.supplier_name || '').trim();
    if (name && !vendors.has(name)) {
      vendors.set(name, { vendor_name: name, vendor_number: a.supplier_id || undefined, is_active: true, is_available_now: true, availability_status: 'available' });
    }
  }
  return Array.from(vendors.values());
}

function extractUniqueCustomers(appeals) {
  const customers = new Map();
  for (const a of appeals) {
    const name = String(a.requester || '').trim();
    if (!name) continue;
    const key = a.client_id ? String(a.client_id) : name;
    if (!customers.has(key)) {
      customers.set(key, {
        name, customer_id_external: a.client_id ? String(a.client_id) : '',
        phone: a.tel || a.tel1 || '',
        vehicle_number: a.car_num || '',
        customer_type: 'individual', status: 'active',
      });
    }
  }
  return Array.from(customers.values());
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dryRun = false, dry_run = false } = body;
    const isDryRun = dryRun || dry_run;

    const connection = await getConnection();
    let sql = 'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
    const params = [];
    if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
    if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
    sql += ' ORDER BY a.date_added DESC';

    const [appeals] = await connection.query(sql, params);
    await connection.end();

    if (isDryRun) {
      return Response.json({
        success: true, mode: 'dry_run',
        total_from_nati: appeals.length,
        unique_vendors: extractUniqueVendors(appeals).length,
        unique_customers: extractUniqueCustomers(appeals).length,
        sample_case: appeals.length > 0 ? clean(mapAppealToCase(appeals[0])) : null,
        sample_call: appeals.length > 0 ? clean(mapAppealToCall(appeals[0])) : null,
      });
    }

    const sdk = base44.asServiceRole;

    // Step 1: Vendors
    console.log('[SYNC] Step 1: Syncing vendors...');
    const existingVendors = await sdk.entities.Vendor.filter({});
    const vendorByName = {};
    for (const v of existingVendors) { if (v.vendor_name) vendorByName[v.vendor_name.trim()] = v; }
    const newVendors = extractUniqueVendors(appeals);
    let vendorsCreated = 0, vendorsSkipped = 0;
    for (const vd of newVendors) {
      if (vendorByName[vd.vendor_name]) { vendorsSkipped++; continue; }
      try {
        const created = await retryOp(() => sdk.entities.Vendor.create(vd), `Vendor.create(${vd.vendor_name})`);
        vendorByName[vd.vendor_name] = created;
        vendorsCreated++;
        await sleep(ITEM_DELAY_MS);
      } catch (e) { console.error('[SYNC] Vendor error:', e.message); }
    }

    // Step 2: Customers
    console.log('[SYNC] Step 2: Syncing customers...');
    const existingCustomers = await sdk.entities.Customer.filter({});
    const customerByExtId = {}, customerByName = {};
    for (const c of existingCustomers) {
      if (c.customer_id_external) customerByExtId[c.customer_id_external] = c;
      if (c.name) customerByName[c.name.trim()] = c;
    }
    let customersCreated = 0, customersSkipped = 0;
    for (const cd of extractUniqueCustomers(appeals)) {
      const exists = cd.customer_id_external ? customerByExtId[cd.customer_id_external] : customerByName[cd.name];
      if (exists) { customersSkipped++; continue; }
      try {
        const created = await retryOp(() => sdk.entities.Customer.create(cd), `Customer.create(${cd.name})`);
        if (cd.customer_id_external) customerByExtId[cd.customer_id_external] = created;
        customerByName[cd.name] = created;
        customersCreated++;
        await sleep(ITEM_DELAY_MS);
      } catch (e) { console.error('[SYNC] Customer error:', e.message); }
    }

    // Step 3: Cases
    console.log('[SYNC] Step 3: Syncing cases...');
    const existingCases = await sdk.entities.Case.filter({});
    const caseByNumber = {};
    for (const c of existingCases) { if (c.case_number) caseByNumber[c.case_number] = c; }
    let casesCreated = 0, casesUpdated = 0, casesSkipped = 0, casesErrors = 0;

    for (let i = 0; i < appeals.length; i += BATCH_SIZE) {
      const batch = appeals.slice(i, i + BATCH_SIZE);
      console.log(`[SYNC] Cases batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(appeals.length / BATCH_SIZE)}`);
      for (const appeal of batch) {
        try {
          const caseData = clean(mapAppealToCase(appeal));
          const vendorName = caseData.assigned_provider_name;
          if (vendorName && vendorByName[vendorName]) caseData.assigned_provider_id = vendorByName[vendorName].id;
          const existing = caseByNumber[caseData.case_number];
          if (existing) {
            await retryOp(() => sdk.entities.Case.update(existing.id, caseData), `Case.update(${caseData.case_number})`);
            casesUpdated++;
          } else {
            await retryOp(() => sdk.entities.Case.create(caseData), `Case.create(${caseData.case_number})`);
            casesCreated++;
          }
        } catch (e) { casesErrors++; console.error('[SYNC] Case error:', e.message); }
        await sleep(ITEM_DELAY_MS);
      }
      if (i + BATCH_SIZE < appeals.length) await sleep(BATCH_DELAY_MS);
    }

    // Step 4: Calls
    console.log('[SYNC] Step 4: Syncing calls...');
    const existingCalls = await sdk.entities.Call.filter({});
    const callByNumber = {};
    for (const c of existingCalls) { if (c.call_number) callByNumber[c.call_number] = c; }
    let callsCreated = 0, callsUpdated = 0, callsSkipped = 0, callsErrors = 0;

    for (let i = 0; i < appeals.length; i += BATCH_SIZE) {
      const batch = appeals.slice(i, i + BATCH_SIZE);
      console.log(`[SYNC] Calls batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(appeals.length / BATCH_SIZE)}`);
      for (const appeal of batch) {
        try {
          const callData = clean(mapAppealToCall(appeal));
          const vendorName = callData.assigned_vendor_name;
          if (vendorName && vendorByName[vendorName]) callData.assigned_vendor_id = vendorByName[vendorName].id;
          const existing = callByNumber[callData.call_number];
          if (existing) {
            await retryOp(() => sdk.entities.Call.update(existing.id, callData), `Call.update(${callData.call_number})`);
            callsUpdated++;
          } else {
            await retryOp(() => sdk.entities.Call.create(callData), `Call.create(${callData.call_number})`);
            callsCreated++;
          }
        } catch (e) { callsErrors++; console.error('[SYNC] Call error:', e.message); }
        await sleep(ITEM_DELAY_MS);
      }
      if (i + BATCH_SIZE < appeals.length) await sleep(BATCH_DELAY_MS);
    }

    const duration = Date.now() - startTime;
    return Response.json({
      success: true, total_from_nati: appeals.length, duration_ms: duration,
      vendors: { existing: existingVendors.length, created: vendorsCreated, skipped: vendorsSkipped },
      customers: { existing: existingCustomers.length, created: customersCreated, skipped: customersSkipped },
      cases: { created: casesCreated, updated: casesUpdated, skipped: casesSkipped, errors: casesErrors },
      calls: { created: callsCreated, updated: callsUpdated, skipped: callsSkipped, errors: callsErrors },
    });
  } catch (error) {
    console.error('syncNatiAppeals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});