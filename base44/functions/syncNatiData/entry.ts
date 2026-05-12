/**
 * syncNatiData — Optimized sync from Nati MySQL DB (direct connection)
 * Uses call_open_appeals with JOIN to suppliers for vendor names.
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

// ========== HELPERS ==========

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.startsWith('0000')) return null;
  if (s instanceof Date || (s.includes('-') && s.length >= 10)) return s.replace(' ', 'T').substring(0, 19);
  return null;
}

function clean(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') result[k] = v;
  }
  return result;
}

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

// ========== MAPPERS ==========

function mapToCall(a) {
  const data = {
    call_number: String(a.id),
    call_status: CALL_STATUS_MAP[a.status] || 'waiting_treatment',
    call_priority: 'normal',
    service_category: a.department_id === 3 ? 'towing' : (a.department_id === 4 ? 'mobile_unit' : 'other'),
    issue_type: mapIssueType(a.department_id),
    issue_description: a.diagnose || '',
    issue_detail: String(a.serve_type || ''),
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
    operation_instructions: a.continue_id && a.continue_id !== 0 ? `קריאת המשך מ-${a.continue_id}` : '',
  };

  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) data.assigned_at = assignedAt;
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) data.vendor_arrival_time_estimated = etaTime;
  const arriveTime = parseNatiDate(a.arrive_actual_time);
  if (arriveTime) data.vendor_arrival_time_actual = arriveTime;
  const finishTime = parseNatiDate(a.finish_time);
  if (finishTime) { data.service_end_time = finishTime; data.closed_at = finishTime; }
  if (a.num_of_km && a.num_of_km > 0) data.estimated_distance_km = a.num_of_km;
  if (a.future_service_from) {
    const fs = parseNatiDate(a.future_service_from);
    if (fs) {
      data.future_service_date = fs.split('T')[0];
      if (a.future_service_to) {
        const fst = parseNatiDate(a.future_service_to);
        if (fst) {
          const fromTime = fs.split('T')[1] || '';
          const toTime = fst.split('T')[1] || '';
          if (fromTime && toTime) data.future_service_time_range = `${fromTime.substring(0,5)}-${toTime.substring(0,5)}`;
        }
      }
    }
  }
  return clean(data);
}

function mapToCase(a) {
  const data = {
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
    early_alert_minutes: a.reminder ? parseInt(a.reminder) : 30,
    early_alert_sent: a.reminder_canceled === 1,
  };

  if (a.num_of_km && a.num_of_km > 0) data.distance_km = a.num_of_km;
  const arrivedAt = parseNatiDate(a.arrive_actual_time);
  if (arrivedAt) data.arrived_at = arrivedAt;
  const completedAt = parseNatiDate(a.finish_time);
  if (completedAt) data.completed_at = completedAt;
  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) data.assigned_at = assignedAt;
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) data.vendor_arrival_time = etaTime;
  if (a.future_service_from) {
    const fs = parseNatiDate(a.future_service_from);
    if (fs) data.future_service_time = fs;
  }
  return clean(data);
}

function extractVendors(appeals) {
  const map = new Map();
  for (const a of appeals) {
    const name = String(a.supplier_name || '').trim();
    if (name && !map.has(name)) {
      map.set(name, clean({
        vendor_name: name,
        vendor_number: a.supplier_id || undefined,
        is_active: true,
        is_available_now: true,
        availability_status: 'available',
      }));
    }
  }
  return Array.from(map.values());
}

function extractCustomers(appeals) {
  const map = new Map();
  for (const a of appeals) {
    const name = String(a.requester || '').trim();
    if (!name) continue;
    const key = a.client_id ? String(a.client_id) : name;
    if (!map.has(key)) {
      map.set(key, clean({
        name,
        customer_id_external: a.client_id ? String(a.client_id) : '',
        phone: a.tel || a.tel1 || '',
        vehicle_number: a.car_num || '',
        subscription_sequence: a.sub_num ? parseInt(a.sub_num) || 0 : 0,
        customer_type: 'individual',
        status: 'active',
      }));
    }
  }
  return Array.from(map.values());
}

// ========== BULK SYNC HELPER ==========

async function syncEntity(sdk, entityName, items, keyField, existingLookup, linkFn) {
  let created = 0, updated = 0, skipped = 0, errors = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    console.log(`[SYNC] ${entityName} batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)}`);

    for (const item of batch) {
      try {
        if (linkFn) linkFn(item);
        const key = item[keyField];
        const existingId = key ? existingLookup[key] : null;
        if (existingId) {
          await retryOp(() => sdk.entities[entityName].update(existingId, item), `${entityName}.update(${key})`);
          updated++;
        } else {
          const result = await retryOp(() => sdk.entities[entityName].create(item), `${entityName}.create(${key})`);
          if (key) existingLookup[key] = result.id;
          created++;
        }
      } catch (e) {
        console.error(`[SYNC] ${entityName} error:`, e.message);
        errors++;
      }
      await sleep(ITEM_DELAY_MS);
    }
    if (i + BATCH_SIZE < items.length) await sleep(BATCH_DELAY_MS);
  }
  return { created, updated, skipped, errors };
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  const startTime = Date.now();

  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      dep = -1, callStatus = -1, dry_run = false,
      sync_calls = true, sync_cases = true,
      sync_vendors = true, sync_customers = true,
      close_missing = false,
    } = body;

    console.log('[SYNC] Connecting to Nati DB...');
    const connection = await getConnection();

    let sql = 'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
    const params = [];
    if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
    if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
    sql += ' ORDER BY a.date_added DESC';

    const [allAppeals] = await connection.query(sql, params);
    await connection.end();

    console.log(`[SYNC] Got ${allAppeals.length} open appeals from Nati DB`);

    const MAX_PER_RUN = 30;
    const sorted = [...allAppeals].sort((a, b) => {
      if (a.has_updated === 1 && b.has_updated !== 1) return -1;
      if (b.has_updated === 1 && a.has_updated !== 1) return 1;
      return new Date(b.date_added || 0) - new Date(a.date_added || 0);
    });
    const appeals = sorted.slice(0, MAX_PER_RUN);
    console.log(`[SYNC] Processing ${appeals.length} of ${allAppeals.length} (prioritized updated/recent)`);

    if (dry_run) {
      return Response.json({
        success: true, mode: 'dry_run',
        total_from_nati: allAppeals.length,
        appeals_count: appeals.length,
        sample_call: appeals.length > 0 ? mapToCall(appeals[0]) : null,
        sample_case: appeals.length > 0 ? mapToCase(appeals[0]) : null,
        vendors_found: extractVendors(appeals).length,
        customers_found: extractCustomers(appeals).length,
      });
    }

    const sdk = base44.asServiceRole;
    const results = {};

    console.log('[SYNC] Loading existing records...');
    const [existingVendors, existingCustomers, existingCalls, existingCases] = await Promise.all([
      sync_vendors ? sdk.entities.Vendor.filter({}) : [],
      sync_customers ? sdk.entities.Customer.filter({}) : [],
      sync_calls ? sdk.entities.Call.filter({}) : [],
      sync_cases ? sdk.entities.Case.filter({}) : [],
    ]);

    const vendorLookup = {};
    for (const v of existingVendors) { if (v.vendor_name) vendorLookup[v.vendor_name.trim()] = v.id; }
    const custByExtId = {}, custByName = {};
    for (const c of existingCustomers) {
      if (c.customer_id_external) custByExtId[c.customer_id_external] = c.id;
      if (c.name) custByName[c.name.trim()] = c.id;
    }
    const callLookup = {};
    for (const c of existingCalls) { if (c.call_number) callLookup[c.call_number] = c.id; }
    const caseLookup = {};
    for (const c of existingCases) { if (c.case_number) caseLookup[c.case_number] = c.id; }

    // VENDORS
    if (sync_vendors) {
      console.log('[SYNC] Syncing vendors...');
      const vendorData = extractVendors(appeals);
      let vendorsCreated = 0, vendorsSkipped = 0;
      for (const vd of vendorData) {
        if (vendorLookup[vd.vendor_name]) { vendorsSkipped++; continue; }
        try {
          const created = await retryOp(() => sdk.entities.Vendor.create(vd), `Vendor.create(${vd.vendor_name})`);
          vendorLookup[vd.vendor_name] = created.id;
          vendorsCreated++;
          await sleep(ITEM_DELAY_MS);
        } catch (e) { console.error('[SYNC] Vendor create error:', e.message); }
      }
      results.vendors = { existing: existingVendors.length, created: vendorsCreated, skipped: vendorsSkipped };
    }

    // CUSTOMERS
    if (sync_customers) {
      console.log('[SYNC] Syncing customers...');
      const custData = extractCustomers(appeals);
      let customersCreated = 0, customersSkipped = 0;
      for (const cd of custData) {
        const existsId = cd.customer_id_external ? custByExtId[cd.customer_id_external] : custByName[cd.name];
        if (existsId) { customersSkipped++; continue; }
        try {
          const created = await retryOp(() => sdk.entities.Customer.create(cd), `Customer.create(${cd.name})`);
          if (cd.customer_id_external) custByExtId[cd.customer_id_external] = created.id;
          custByName[cd.name] = created.id;
          customersCreated++;
          await sleep(ITEM_DELAY_MS);
        } catch (e) { console.error('[SYNC] Customer create error:', e.message); }
      }
      results.customers = { existing: existingCustomers.length, created: customersCreated, skipped: customersSkipped };
    }

    // CALLS
    if (sync_calls) {
      console.log('[SYNC] Syncing calls...');
      const callItems = appeals.map(mapToCall);
      results.calls = await syncEntity(sdk, 'Call', callItems, 'call_number', callLookup, (item) => {
        if (item.assigned_vendor_name && vendorLookup[item.assigned_vendor_name]) {
          item.assigned_vendor_id = vendorLookup[item.assigned_vendor_name];
        }
      });
    }

    // CASES
    if (sync_cases) {
      console.log('[SYNC] Syncing cases...');
      const caseItems = appeals.map(mapToCase);
      results.cases = await syncEntity(sdk, 'Case', caseItems, 'case_number', caseLookup, (item) => {
        if (item.assigned_provider_name && vendorLookup[item.assigned_provider_name]) {
          item.assigned_provider_id = vendorLookup[item.assigned_provider_name];
        }
      });
    }

    // AUTO-CLOSE
    if (close_missing) {
      console.log('[SYNC] Checking for calls/cases to auto-close...');
      const natiOpenIds = new Set(allAppeals.map(a => String(a.id)));
      const OPEN_CALL_STATUSES = ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress', 'vendor_arrived', 'future_service', 'in_followup', 'in_storage', 'continued_treatment', 'awaiting_payment'];
      const OPEN_CASE_STATUSES = ['new', 'assigned', 'en_route', 'on_site', 'in_progress'];
      let callsClosed = 0, casesClosed = 0;

      if (sync_calls) {
        const openLocalCalls = existingCalls.filter(c =>
          c.call_number && OPEN_CALL_STATUSES.includes(c.call_status) && !natiOpenIds.has(c.call_number)
        );
        for (const call of openLocalCalls.slice(0, 10)) {
          try {
            await retryOp(() => sdk.entities.Call.update(call.id, {
              call_status: 'completed', closed_at: new Date().toISOString(),
              operator_notes: (call.operator_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
            }), `Call.close(${call.call_number})`);
            callsClosed++;
            await sleep(ITEM_DELAY_MS);
          } catch (e) { console.error('[SYNC] Call close error:', e.message); }
        }
      }
      if (sync_cases) {
        const openLocalCases = existingCases.filter(c =>
          c.case_number && OPEN_CASE_STATUSES.includes(c.status) && !natiOpenIds.has(c.case_number)
        );
        for (const cs of openLocalCases.slice(0, 10)) {
          try {
            await retryOp(() => sdk.entities.Case.update(cs.id, {
              status: 'completed', completed_at: new Date().toISOString(), source_status: 'closed',
              internal_notes: (cs.internal_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
            }), `Case.close(${cs.case_number})`);
            casesClosed++;
            await sleep(ITEM_DELAY_MS);
          } catch (e) { console.error('[SYNC] Case close error:', e.message); }
        }
      }
      results.auto_closed = { calls_closed: callsClosed, cases_closed: casesClosed };
    }

    const duration = Date.now() - startTime;
    console.log(`[SYNC] Done in ${duration}ms`);

    return Response.json({
      success: true,
      total_from_nati: allAppeals.length,
      processed_appeals: appeals.length,
      duration_ms: duration,
      ...results,
    });
  } catch (error) {
    console.error('[SYNC] Fatal error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});