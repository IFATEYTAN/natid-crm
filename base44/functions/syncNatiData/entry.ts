/**
 * syncNatiData — Optimized sync from Nati MySQL DB (direct connection)
 * 
 * Replaces REST API with direct MySQL queries.
 * Processes max 30 appeals per run (avoids timeout).
 * Uses NATID_DB_* secrets for connection.
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
  if (!config.host || !config.user || !config.password) {
    throw new Error('Missing NATID_DB_HOST, NATID_DB_USER, or NATID_DB_PASSWORD');
  }
  try {
    return await mysql.createConnection(config);
  } catch (e) {
    const { ssl, ...noSsl } = config;
    return await mysql.createConnection(noSsl);
  }
}

// ========== STATUS / FIELD MAPPINGS ==========

const CASE_STATUS_MAP = {
  '0': 'new', '1': 'in_progress', '2': 'in_progress', '3': 'in_progress',
  '4': 'in_progress', '5': 'on_site', '6': 'new',
};

const CALL_STATUS_MAP = {
  '0': 'waiting_treatment', '1': 'in_progress', '2': 'in_storage',
  '3': 'continued_treatment', '4': 'awaiting_payment', '5': 'vendor_arrived', '6': 'future_service',
};

const DEPT_MAP = {
  'גרירה': 'גרירה', 'ניידת': 'ניידת שירות', 'ניידת שירות': 'ניידת שירות',
  'שמשות': 'שמשות', 'רכב חליפי': 'רכב חליפי', 'רדיו דיסק': 'רדיו דיסק',
};

const AREA_MAP = {
  'מרכז': 'center', 'שרון': 'sharon', 'צפון': 'north',
  'דרום': 'south', 'ירושלים': 'jerusalem', 'שפלה': 'lowlands',
};

const VEHICLE_TYPE_MAP = { '1': 'private', '2': 'motorcycle', '3': 'truck', '4': 'commercial_light' };

const ISSUE_TYPE_KEYWORDS = {
  'תקר': 'flat_tire', 'מצבר': 'dead_battery', 'נעילה': 'locked_keys',
  'דלק': 'no_fuel', 'תאונה': 'accident', 'מכני': 'mechanical', 'גלגל': 'stuck_wheel',
};

const SERVICE_TYPE_KEYWORDS = {
  'תקר': 'flat_tire', 'מצבר': 'battery', 'נעילה': 'lockout',
  'דלק': 'fuel', 'תאונה': 'accident', 'מכני': 'mechanical',
};

// ========== HELPERS ==========

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}`;
  // Handle ISO/MySQL datetime format
  if (s.includes('-') && s.length >= 19) return s.replace(' ', 'T').substring(0, 19);
  return null;
}

function matchKeyword(text, map) {
  if (!text) return null;
  for (const [key, val] of Object.entries(map)) {
    if (String(text).includes(key)) return val;
  }
  return null;
}

function clean(obj) {
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') result[k] = v;
  }
  return result;
}

function parseCoords(location) {
  if (!location) return null;
  if (typeof location === 'object') {
    const lat = parseFloat(location.lat || location.latitude);
    const lon = parseFloat(location.lng || location.lon || location.longitude);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) return { lat, lon };
    return null;
  }
  if (typeof location === 'string') {
    const parts = location.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] !== 0) {
      return { lat: parts[0], lon: parts[1] };
    }
  }
  return null;
}

// ========== MAPPERS ==========

function mapToCall(a) {
  const vip = String(a.vip) === '1' || String(a.yashir_top_client) === '1';
  const data = {
    call_number: String(a.appeal_id),
    call_status: CALL_STATUS_MAP[String(a.status)] || 'waiting_treatment',
    call_priority: vip ? 'urgent' : 'normal',
    is_vip: vip,
    service_category: a.department === 'גרירה' ? 'towing' : (String(a.department || '').includes('ניידת') ? 'mobile_unit' : 'other'),
    issue_type: a.department === 'גרירה' ? 'stopped_driving' : (matchKeyword(a.serve_type, ISSUE_TYPE_KEYWORDS) || 'other'),
    issue_description: a.problem_desc || a.diagnose || '',
    issue_detail: a.serve_type || '',
    customer_name: a.client_name || a.user_name || '',
    customer_phone: a.tel || a.tel1 || 'לא צוין',
    customer_phone_2: a.tel1 || '',
    customer_id_number: a.client_id ? String(a.client_id) : '',
    customer_email: a.client_email || '',
    insurance_company: a.agent_name || '',
    insurance_agent: a.agent_name || '',
    membership_package: a.package_name || '',
    membership_number: a.sub_num ? String(a.sub_num) : '',
    coverage_details: a.serve_type || '',
    vehicle_plate: a.car_num || '',
    vehicle_model: a.kod_degem_name || a.car_type_name || '',
    vehicle_type: VEHICLE_TYPE_MAP[String(a.car_type)] || VEHICLE_TYPE_MAP[String(a.vehicle_class)] || 'private',
    vehicle_code: a.car_code || a.mispar_shilda || '',
    pickup_location_address: a.address || 'לא צוין',
    pickup_location_city: a.city || '',
    pickup_location_area: AREA_MAP[a.area] || 'undefined',
    dropoff_location_address: a.grar_address || '',
    dropoff_location_city: a.grar_city || '',
    dropoff_garage_name: a.grar_address || '',
    storage_location_address: a.store_address || '',
    storage_location_city: a.store_city || '',
    assigned_vendor_name: String(a.supplier_name || '').trim(),
    operator_notes: a.q_notes || '',
    vendor_notes: a.supplier_notes || '',
    passed_quality_control: String(a.inspector_approves) === '1',
    quality_controller_name: a.inspector_name || '',
    created_by_source: String(a.open_from_api) === '1' ? 'bot' : 'operator',
    customer_response_code: a.car_pin || '',
    key_location: a.key_location || '',
    early_notification_minutes: a.reminder ? parseInt(a.reminder) : 30,
    operation_instructions: a.continue_id && String(a.continue_id) !== '0' ? `קריאת המשך מ-${a.continue_id}` : '',
  };

  const fromCoords = parseCoords(a.from_location);
  if (fromCoords) {
    data.pickup_location_lat = fromCoords.lat;
    data.pickup_location_lon = fromCoords.lon;
  }

  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) data.assigned_at = assignedAt;
  if (a.supplier_choice_time && parseInt(a.supplier_choice_time) > 0) {
    data.time_to_vendor_assignment = Math.round(parseInt(a.supplier_choice_time) / 60);
  }
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) data.vendor_arrival_time_estimated = etaTime;
  if (a.expected_time && String(a.expected_time) !== '0') {
    const parsedExpected = parseNatiDate(a.expected_time);
    if (parsedExpected) data.estimated_arrival_time = parsedExpected;
  }
  const arriveTime = parseNatiDate(a.arrive_time);
  if (arriveTime) data.vendor_arrival_time_actual = arriveTime;
  const finishTime = parseNatiDate(a.finish_time);
  if (finishTime) { data.service_end_time = finishTime; data.closed_at = finishTime; }
  if (a.claim_total_cost && parseFloat(a.claim_total_cost) > 0) data.total_cost = parseFloat(a.claim_total_cost);
  if (a.wait_time && parseInt(a.wait_time) > 0) data.time_waiting = parseInt(a.wait_time);
  if (a.future_service_from && !String(a.future_service_from).startsWith('0000')) {
    data.future_service_date = String(a.future_service_from).split(' ')[0] || String(a.future_service_from).split('T')[0];
    if (a.future_service_to && !String(a.future_service_to).startsWith('0000')) {
      const fromTime = String(a.future_service_from).split(' ')[1] || '';
      const toTime = String(a.future_service_to).split(' ')[1] || '';
      if (fromTime && toTime) data.future_service_time_range = `${fromTime.substring(0,5)}-${toTime.substring(0,5)}`;
    }
  }
  return clean(data);
}

function mapToCase(a) {
  const vip = String(a.vip) === '1' || String(a.yashir_top_client) === '1';
  const data = {
    case_number: String(a.appeal_id),
    customer_name: a.client_name || a.user_name || '',
    caller_name: a.requester || a.user_name || '',
    caller_phone: a.tel || a.tel1 || a.intermediary_phone || '',
    vehicle_number: a.car_num || '',
    vehicle_model: a.kod_degem_name || a.car_type_name || '',
    vehicle_type: VEHICLE_TYPE_MAP[String(a.car_type)] || VEHICLE_TYPE_MAP[String(a.vehicle_class)] || 'private',
    vehicle_model_code: a.car_code || a.mispar_shilda || '',
    fuel_type: a.fuel_type || '',
    service_type: a.department === 'גרירה' ? 'towing' : (matchKeyword(a.serve_type, SERVICE_TYPE_KEYWORDS) || 'other'),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: CASE_STATUS_MAP[String(a.status)] || 'new',
    priority: vip ? 'urgent' : 'normal',
    assigned_provider_name: String(a.supplier_name || '').trim(),
    department: DEPT_MAP[a.department] || 'אחר',
    insurance_company: a.agent_name || '',
    package_name: a.package_name || '',
    problem_description: a.problem_desc || a.diagnose || '',
    internal_notes: a.q_notes || '',
    inspector_name: a.inspector_name || '',
    passed_qa: String(a.inspector_approves) === '1',
    is_vip: vip,
    opening_source: String(a.open_from_api) === '1' ? 'app' : 'call_center',
    source_status: a.finish_time && !String(a.finish_time).startsWith('0000') ? 'closed' : 'open',
    dispatcher_name: a.user_name || '',
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
    customer_id: a.client_id ? String(a.client_id) : '',
    coverage_details: a.serve_type || '',
    early_alert_minutes: a.reminder ? parseInt(a.reminder) : 30,
    early_alert_sent: String(a.reminder_canceled) === '1',
    is_special_customer: String(a.yashir_top_client) === '1',
  };

  const fromCoords = parseCoords(a.from_location);
  if (fromCoords) {
    data.location_lat = fromCoords.lat;
    data.location_lng = fromCoords.lon;
  }
  if (a.claim_total_cost && parseFloat(a.claim_total_cost) > 0) data.price = parseFloat(a.claim_total_cost);
  if (a.wait_time && parseInt(a.wait_time) > 0) data.waiting_time_minutes = parseInt(a.wait_time);
  if (a.days_remain) data.remaining_days = parseInt(a.days_remain);
  const arrivedAt = parseNatiDate(a.arrive_time);
  if (arrivedAt) data.arrived_at = arrivedAt;
  const completedAt = parseNatiDate(a.finish_time);
  if (completedAt) data.completed_at = completedAt;
  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) data.assigned_at = assignedAt;
  const etaTime = parseNatiDate(a.arrive_expected_time);
  if (etaTime) data.vendor_arrival_time = etaTime;
  if (a.future_service_from && !String(a.future_service_from).startsWith('0000')) {
    data.future_service_time = String(a.future_service_from).replace(' ', 'T');
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
        phone: a.intermediary_phone || '',
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
    const name = String(a.client_name || '').trim();
    if (!name) continue;
    const key = a.client_id ? String(a.client_id) : name;
    if (!map.has(key)) {
      map.set(key, clean({
        name,
        customer_id_external: a.client_id ? String(a.client_id) : '',
        phone: a.tel || a.tel1 || '',
        email: a.client_email || '',
        insurance_company: a.agent_name || '',
        package_name: a.package_name || '',
        vehicle_number: a.car_num || '',
        vehicle_model: a.kod_degem_name || a.car_type_name || '',
        customer_type: a.agent_name ? 'insurance_company' : 'individual',
        is_vip: String(a.vip) === '1' || String(a.yashir_top_client) === '1',
        is_special_customer: String(a.yashir_top_client) === '1',
        subscription_sequence: a.sub_num ? parseInt(a.sub_num) || 0 : 0,
        status: 'active',
      }));
    }
  }
  return Array.from(map.values());
}

// ========== BULK SYNC HELPER ==========

async function syncEntity(sdk, entityName, items, keyField, existingLookup, linkFn) {
  let created = 0, updated = 0, errors = 0;
  const BATCH = 2;

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    for (const item of batch) {
      try {
        if (linkFn) linkFn(item);
        const key = item[keyField];
        const existingId = key ? existingLookup[key] : null;
        if (existingId) {
          await sdk.entities[entityName].update(existingId, item);
          updated++;
        } else {
          const result = await sdk.entities[entityName].create(item);
          if (key) existingLookup[key] = result.id;
          created++;
        }
      } catch (e) {
        console.error(`[SYNC] ${entityName} error:`, e.message);
        errors++;
      }
    }
    if (i + BATCH < items.length) await new Promise(r => setTimeout(r, 1500));
  }
  return { created, updated, errors };
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
    const {
      dep = -1,
      callStatus = -1,
      dry_run = false,
      sync_calls = true,
      sync_cases = true,
      sync_vendors = true,
      sync_customers = true,
      close_missing = false,
    } = body;

    // Fetch appeals from MySQL
    console.log('[SYNC] Connecting to Nati DB...');
    const connection = await getConnection();

    let sql = 'SELECT * FROM appeals WHERE 1=1';
    const params = [];
    if (dep !== -1) { sql += ' AND department_id = ?'; params.push(dep); }
    if (callStatus !== -1) { sql += ' AND status = ?'; params.push(callStatus); }
    sql += ' ORDER BY date_added_unix DESC';

    const [allAppeals] = await connection.query(sql, params);
    await connection.end();

    console.log(`[SYNC] Got ${allAppeals.length} appeals from Nati DB`);

    // Prioritize updated records, limit per run
    const MAX_PER_RUN = 30;
    const sorted = [...allAppeals].sort((a, b) => {
      if (String(a.has_updated) === '1' && String(b.has_updated) !== '1') return -1;
      if (String(b.has_updated) === '1' && String(a.has_updated) !== '1') return 1;
      return (parseInt(b.date_added_unix) || 0) - (parseInt(a.date_added_unix) || 0);
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

    // Pre-load all lookups
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
          const created = await sdk.entities.Vendor.create(vd);
          vendorLookup[vd.vendor_name] = created.id;
          vendorsCreated++;
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
          const created = await sdk.entities.Customer.create(cd);
          if (cd.customer_id_external) custByExtId[cd.customer_id_external] = created.id;
          custByName[cd.name] = created.id;
          customersCreated++;
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
      const natiOpenIds = new Set(allAppeals.filter(a => String(a.status) !== '5').map(a => String(a.appeal_id)));
      const OPEN_CALL_STATUSES = ['waiting_treatment', 'awaiting_assignment', 'assigning', 'vendor_enroute', 'in_progress', 'vendor_arrived', 'future_service', 'in_followup', 'in_storage', 'continued_treatment', 'awaiting_payment'];
      const OPEN_CASE_STATUSES = ['new', 'assigned', 'en_route', 'on_site', 'in_progress'];
      let callsClosed = 0, casesClosed = 0;

      if (sync_calls) {
        const openLocalCalls = existingCalls.filter(c =>
          c.call_number && OPEN_CALL_STATUSES.includes(c.call_status) && !natiOpenIds.has(c.call_number)
        );
        for (const call of openLocalCalls.slice(0, 10)) {
          try {
            await sdk.entities.Call.update(call.id, {
              call_status: 'completed', closed_at: new Date().toISOString(),
              operator_notes: (call.operator_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
            });
            callsClosed++;
          } catch (e) { console.error('[SYNC] Call close error:', e.message); }
        }
      }
      if (sync_cases) {
        const openLocalCases = existingCases.filter(c =>
          c.case_number && OPEN_CASE_STATUSES.includes(c.status) && !natiOpenIds.has(c.case_number)
        );
        for (const cs of openLocalCases.slice(0, 10)) {
          try {
            await sdk.entities.Case.update(cs.id, {
              status: 'completed', completed_at: new Date().toISOString(), source_status: 'closed',
              internal_notes: (cs.internal_notes || '') + '\n[אוטומטי] נסגר - לא נמצא ברשימת הפתוחות של נתי'
            });
            casesClosed++;
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