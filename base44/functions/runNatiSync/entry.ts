/**
 * runNatiSync — Direct MySQL: creates/updates Case entities from Nati DB
 * Simplified version for manual sync runs.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

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

function mapStatus(s) { return { '0': 'new', '1': 'in_progress', '2': 'in_progress', '3': 'in_progress', '4': 'in_progress', '5': 'on_site', '6': 'new' }[String(s)] || 'new'; }
function mapDepartment(d) { return { 'גרירה': 'גרירה', 'ניידת': 'ניידת שירות', 'ניידת שירות': 'ניידת שירות', 'שמשות': 'שמשות', 'רכב חליפי': 'רכב חליפי', 'רדיו דיסק': 'רדיו דיסק' }[d] || 'אחר'; }

function mapServiceType(st, dept) {
  if (dept === 'גרירה') return 'towing';
  for (const [k, v] of Object.entries({ 'תקר': 'flat_tire', 'מצבר': 'battery', 'נעילה': 'lockout', 'דלק': 'fuel', 'תאונה': 'accident', 'מכני': 'mechanical' })) {
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

function mapAppeal(a) {
  const vip = String(a.vip) === '1';
  const mapped = {
    case_number: String(a.appeal_id),
    customer_name: a.client_name || a.user_name || '',
    caller_name: a.requester || a.user_name || '',
    caller_phone: a.tel || '',
    vehicle_number: a.car_num || '',
    vehicle_model: a.kod_degem_name || '',
    service_type: mapServiceType(a.serve_type, a.department),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: mapStatus(a.status),
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
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
  };
  if (a.claim_total_cost && parseFloat(a.claim_total_cost) > 0) mapped.price = parseFloat(a.claim_total_cost);
  if (a.wait_time && parseInt(a.wait_time) > 0) mapped.waiting_time_minutes = parseInt(a.wait_time);
  const arrivedAt = parseNatiDate(a.arrive_time);
  if (arrivedAt) mapped.arrived_at = arrivedAt;
  const completedAt = parseNatiDate(a.finish_time);
  if (completedAt) mapped.completed_at = completedAt;
  const assignedAt = parseNatiDate(a.supplier_assigned_date);
  if (assignedAt) mapped.assigned_at = assignedAt;
  if (a.future_service_from && !String(a.future_service_from).startsWith('0000')) {
    mapped.future_service_time = String(a.future_service_from).replace(' ', 'T');
  }
  const clean = {};
  for (const [k, v] of Object.entries(mapped)) { if (v !== undefined && v !== null && v !== '') clean[k] = v; }
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    // Fetch from MySQL
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT * FROM appeals ORDER BY date_added_unix DESC');
    await connection.end();

    const mapped = rows.map(mapAppeal);

    // Get existing cases
    const existing = await base44.asServiceRole.entities.Case.filter({});
    const existingMap = {};
    for (const c of existing) { if (c.case_number) existingMap[c.case_number] = c.id; }

    let created = 0, updated = 0, errors = 0;
    const errorDetails = [];

    for (const caseData of mapped) {
      try {
        const existingId = existingMap[caseData.case_number];
        if (existingId) {
          await base44.asServiceRole.entities.Case.update(existingId, caseData);
          updated++;
        } else {
          await base44.asServiceRole.entities.Case.create(caseData);
          created++;
        }
      } catch (e) {
        errors++;
        if (errorDetails.length < 5) errorDetails.push({ case_number: caseData.case_number, error: e.message });
      }
    }

    return Response.json({ success: true, total: rows.length, created, updated, errors, errorDetails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});