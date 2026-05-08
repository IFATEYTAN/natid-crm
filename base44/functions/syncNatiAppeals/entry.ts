/**
 * syncNatiAppeals — Direct MySQL sync from Natid DB
 * Full sync: vendors, customers, cases, calls.
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
    throw new Error('Missing NATID_DB_* secrets');
  }
  try {
    return await mysql.createConnection(config);
  } catch (e) {
    const { ssl, ...noSsl } = config;
    return await mysql.createConnection(noSsl);
  }
}

// ========== MAPPINGS ==========

function mapCaseStatus(s) { return { '0': 'new', '1': 'in_progress', '2': 'in_progress', '3': 'in_progress', '4': 'in_progress', '5': 'on_site', '6': 'new' }[String(s)] || 'new'; }
function mapCallStatus(s) { return { '0': 'waiting_treatment', '1': 'in_progress', '2': 'in_storage', '3': 'continued_treatment', '4': 'awaiting_payment', '5': 'vendor_arrived', '6': 'future_service' }[String(s)] || 'waiting_treatment'; }
function mapDepartment(d) { return { 'גרירה': 'גרירה', 'ניידת': 'ניידת שירות', 'ניידת שירות': 'ניידת שירות', 'שמשות': 'שמשות', 'רכב חליפי': 'רכב חליפי', 'רדיו דיסק': 'רדיו דיסק' }[d] || 'אחר'; }
function mapVehicleType(vc) { return { '1': 'private', '2': 'motorcycle', '3': 'truck', '4': 'commercial_light' }[String(vc)] || 'private'; }
function mapArea(a) { return { 'מרכז': 'center', 'שרון': 'sharon', 'צפון': 'north', 'דרום': 'south', 'ירושלים': 'jerusalem', 'שפלה': 'lowlands' }[a] || 'undefined'; }

function mapCaseServiceType(st, dept) {
  if (dept === 'גרירה') return 'towing';
  for (const [k, v] of Object.entries({ 'תקר': 'flat_tire', 'מצבר': 'battery', 'נעילה': 'lockout', 'דלק': 'fuel', 'תאונה': 'accident', 'מכני': 'mechanical' })) {
    if (st && String(st).includes(k)) return v;
  }
  return 'other';
}

function mapCallIssueType(st, dept) {
  if (dept === 'גרירה') return 'stopped_driving';
  for (const [k, v] of Object.entries({ 'תקר': 'flat_tire', 'מצבר': 'dead_battery', 'נעילה': 'locked_keys', 'דלק': 'no_fuel', 'תאונה': 'accident', 'מכני': 'mechanical', 'גלגל': 'stuck_wheel' })) {
    if (st && String(st).includes(k)) return v;
  }
  return 'other';
}

function parseNatiDate(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}`;
  if (s.includes('-') && s.length >= 19) return s.replace(' ', 'T').substring(0, 19);
  return null;
}

function parseFutureDate(d) { if (!d || String(d).startsWith('0000')) return null; return String(d).replace(' ', 'T'); }

function cleanData(obj) {
  const c = {};
  for (const [k, v] of Object.entries(obj)) { if (v !== undefined && v !== null && v !== '') c[k] = v; }
  return c;
}

// ========== ENTITY MAPPERS ==========

function mapAppealToCase(a) {
  const vip = String(a.vip) === '1' || String(a.yashir_top_client) === '1';
  return {
    case_number: String(a.appeal_id),
    customer_name: a.client_name || a.user_name || '',
    caller_name: a.requester || a.user_name || '',
    caller_phone: a.tel || a.intermediary_phone || '',
    vehicle_number: a.car_num || '',
    vehicle_model: a.kod_degem_name || '',
    vehicle_type: mapVehicleType(a.vehicle_class),
    vehicle_model_code: a.car_code || '',
    service_type: mapCaseServiceType(a.serve_type, a.department),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: mapCaseStatus(a.status),
    priority: vip ? 'urgent' : 'normal',
    assigned_provider_name: String(a.supplier_name || '').trim(),
    department: mapDepartment(a.department),
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
    price: a.claim_total_cost ? parseFloat(a.claim_total_cost) : undefined,
    waiting_time_minutes: a.wait_time ? parseInt(a.wait_time) : undefined,
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
    customer_id: a.client_id ? String(a.client_id) : '',
    coverage_details: a.serve_type || '',
    remaining_days: a.days_remain ? parseInt(a.days_remain) : undefined,
    ...(a.arrive_time ? { arrived_at: parseNatiDate(a.arrive_time) || undefined } : {}),
    ...(a.finish_time ? { completed_at: parseNatiDate(a.finish_time) || undefined } : {}),
    ...(a.supplier_assigned_date ? { assigned_at: parseNatiDate(a.supplier_assigned_date) || undefined } : {}),
    ...(parseFutureDate(a.future_service_from) ? { future_service_time: parseFutureDate(a.future_service_from) } : {}),
    ...(a.arrive_expected_time ? { vendor_arrival_time: parseNatiDate(a.arrive_expected_time) || undefined } : {}),
  };
}

function mapAppealToCall(a) {
  const vip = String(a.vip) === '1' || String(a.yashir_top_client) === '1';
  return {
    call_number: String(a.appeal_id),
    call_status: mapCallStatus(a.status),
    call_priority: vip ? 'urgent' : 'normal',
    is_vip: vip,
    service_category: a.department === 'גרירה' ? 'towing' : (String(a.department || '').includes('ניידת') ? 'mobile_unit' : 'other'),
    issue_type: mapCallIssueType(a.serve_type, a.department),
    issue_description: a.problem_desc || a.diagnose || '',
    issue_detail: a.serve_type || '',
    customer_name: a.client_name || a.user_name || '',
    customer_phone: a.tel || a.intermediary_phone || 'לא צוין',
    customer_phone_2: a.intermediary_phone || '',
    customer_id_number: a.client_id ? String(a.client_id) : '',
    customer_email: a.client_email || '',
    insurance_company: a.agent_name || '',
    insurance_agent: a.agent_name || '',
    membership_package: a.package_name || '',
    membership_number: a.sub_num ? String(a.sub_num) : '',
    coverage_details: a.serve_type || '',
    vehicle_plate: a.car_num || '',
    vehicle_model: a.kod_degem_name || '',
    vehicle_type: mapVehicleType(a.vehicle_class),
    vehicle_code: a.car_code || '',
    pickup_location_address: a.address || 'לא צוין',
    pickup_location_city: a.city || '',
    pickup_location_area: mapArea(a.area || ''),
    dropoff_location_address: a.grar_address || '',
    dropoff_location_city: a.grar_city || '',
    dropoff_garage_name: a.grar_address || '',
    assigned_vendor_name: String(a.supplier_name || '').trim(),
    operator_notes: a.q_notes || '',
    vendor_notes: a.supplier_notes || '',
    passed_quality_control: String(a.inspector_approves) === '1',
    quality_controller_name: a.inspector_name || '',
    created_by_source: String(a.open_from_api) === '1' ? 'bot' : 'operator',
    ...(a.supplier_assigned_date ? { assigned_at: parseNatiDate(a.supplier_assigned_date) || undefined } : {}),
    ...(a.arrive_expected_time ? { vendor_arrival_time_estimated: parseNatiDate(a.arrive_expected_time) || undefined } : {}),
    ...(a.arrive_time ? { vendor_arrival_time_actual: parseNatiDate(a.arrive_time) || undefined } : {}),
    ...(a.finish_time ? { service_end_time: parseNatiDate(a.finish_time) || undefined } : {}),
    ...(a.finish_time ? { closed_at: parseNatiDate(a.finish_time) || undefined } : {}),
    ...(a.claim_total_cost && parseFloat(a.claim_total_cost) > 0 ? { total_cost: parseFloat(a.claim_total_cost) } : {}),
    ...(a.wait_time && parseInt(a.wait_time) > 0 ? { time_waiting: parseInt(a.wait_time) } : {}),
    ...(parseFutureDate(a.future_service_from) ? { future_service_date: parseFutureDate(a.future_service_from).split('T')[0] } : {}),
  };
}

function extractUniqueVendors(appeals) {
  const vendors = new Map();
  for (const a of appeals) {
    const name = String(a.supplier_name || '').trim();
    if (name && !vendors.has(name)) {
      vendors.set(name, { vendor_name: name, phone: a.supplier_phone || '', is_active: true, is_available_now: true, availability_status: 'available' });
    }
  }
  return Array.from(vendors.values());
}

function extractUniqueCustomers(appeals) {
  const customers = new Map();
  for (const a of appeals) {
    const name = String(a.client_name || '').trim();
    if (!name) continue;
    const key = a.client_id ? String(a.client_id) : name;
    if (!customers.has(key)) {
      customers.set(key, {
        name, customer_id_external: a.client_id ? String(a.client_id) : '',
        phone: a.tel || '', email: a.client_email || '',
        insurance_company: a.agent_name || '', package_name: a.package_name || '',
        vehicle_number: a.car_num || '', vehicle_model: a.kod_degem_name || '',
        customer_type: a.agent_name ? 'insurance_company' : 'individual', status: 'active',
      });
    }
  }
  return Array.from(customers.values());
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
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

    // Fetch from MySQL
    const connection = await getConnection();
    let sql = 'SELECT * FROM appeals WHERE 1=1';
    const params = [];
    if (dep !== -1) { sql += ' AND department_id = ?'; params.push(dep); }
    if (callStatus !== -1) { sql += ' AND status = ?'; params.push(callStatus); }
    sql += ' ORDER BY date_added_unix DESC';

    const [appeals] = await connection.query(sql, params);
    await connection.end();

    if (isDryRun) {
      return Response.json({
        success: true, mode: 'dry_run',
        total_from_nati: appeals.length,
        unique_vendors: extractUniqueVendors(appeals).length,
        unique_customers: extractUniqueCustomers(appeals).length,
        sample_case: appeals.length > 0 ? cleanData(mapAppealToCase(appeals[0])) : null,
        sample_call: appeals.length > 0 ? cleanData(mapAppealToCall(appeals[0])) : null,
      });
    }

    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 1500;
    const sdk = base44.asServiceRole;

    // Step 1: Vendors
    console.log('[SYNC] Step 1: Syncing vendors...');
    const existingVendors = await sdk.entities.Vendor.filter({});
    const vendorByName = {};
    for (const v of existingVendors) { if (v.vendor_name) vendorByName[v.vendor_name.trim()] = v; }

    const newVendors = extractUniqueVendors(appeals);
    let vendorsCreated = 0;
    for (const vd of newVendors) {
      if (!vendorByName[vd.vendor_name]) {
        const created = await sdk.entities.Vendor.create(vd);
        vendorByName[vd.vendor_name] = created;
        vendorsCreated++;
      }
    }

    // Step 2: Customers
    console.log('[SYNC] Step 2: Syncing customers...');
    const existingCustomers = await sdk.entities.Customer.filter({});
    const customerByExtId = {}, customerByName = {};
    for (const c of existingCustomers) {
      if (c.customer_id_external) customerByExtId[c.customer_id_external] = c;
      if (c.name) customerByName[c.name.trim()] = c;
    }
    let customersCreated = 0;
    for (const cd of extractUniqueCustomers(appeals)) {
      const exists = cd.customer_id_external ? customerByExtId[cd.customer_id_external] : customerByName[cd.name];
      if (!exists) {
        const created = await sdk.entities.Customer.create(cd);
        if (cd.customer_id_external) customerByExtId[cd.customer_id_external] = created;
        customerByName[cd.name] = created;
        customersCreated++;
      }
    }

    // Step 3: Cases
    console.log('[SYNC] Step 3: Syncing cases...');
    const existingCases = await sdk.entities.Case.filter({});
    const caseByNumber = {};
    for (const c of existingCases) { if (c.case_number) caseByNumber[c.case_number] = c; }
    let casesCreated = 0, casesUpdated = 0, casesErrors = 0;

    for (let i = 0; i < appeals.length; i += BATCH_SIZE) {
      for (const appeal of appeals.slice(i, i + BATCH_SIZE)) {
        try {
          const caseData = cleanData(mapAppealToCase(appeal));
          const vendorName = caseData.assigned_provider_name;
          if (vendorName && vendorByName[vendorName]) caseData.assigned_provider_id = vendorByName[vendorName].id;
          const existing = caseByNumber[caseData.case_number];
          if (existing) { await sdk.entities.Case.update(existing.id, caseData); casesUpdated++; }
          else { await sdk.entities.Case.create(caseData); casesCreated++; }
        } catch (e) { casesErrors++; }
      }
      if (i + BATCH_SIZE < appeals.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    // Step 4: Calls
    console.log('[SYNC] Step 4: Syncing calls...');
    const existingCalls = await sdk.entities.Call.filter({});
    const callByNumber = {};
    for (const c of existingCalls) { if (c.call_number) callByNumber[c.call_number] = c; }
    let callsCreated = 0, callsUpdated = 0, callsErrors = 0;

    for (let i = 0; i < appeals.length; i += BATCH_SIZE) {
      for (const appeal of appeals.slice(i, i + BATCH_SIZE)) {
        try {
          const callData = cleanData(mapAppealToCall(appeal));
          const vendorName = callData.assigned_vendor_name;
          if (vendorName && vendorByName[vendorName]) callData.assigned_vendor_id = vendorByName[vendorName].id;
          const existing = callByNumber[callData.call_number];
          if (existing) { await sdk.entities.Call.update(existing.id, callData); callsUpdated++; }
          else { await sdk.entities.Call.create(callData); callsCreated++; }
        } catch (e) { callsErrors++; }
      }
      if (i + BATCH_SIZE < appeals.length) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    return Response.json({
      success: true, total_from_nati: appeals.length,
      vendors: { existing: existingVendors.length, created: vendorsCreated },
      customers: { existing: existingCustomers.length, created: customersCreated },
      cases: { created: casesCreated, updated: casesUpdated, errors: casesErrors },
      calls: { created: callsCreated, updated: callsUpdated, errors: callsErrors },
    });
  } catch (error) {
    console.error('syncNatiAppeals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});