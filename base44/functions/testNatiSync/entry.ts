/**
 * testNatiSync — Direct MySQL: test mapping from DB records
 * Returns sample mapped Case/Call data without writing to Base44.
 * Uses call_open_appeals table with JOIN to suppliers for supplier name.
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
  if (!config.host || !config.user || !config.password) throw new Error('Missing NATID_DB_* secrets');
  try { return await mysql.createConnection(config); }
  catch (e) { const { ssl, ...noSsl } = config; return await mysql.createConnection(noSsl); }
}

// Department ID → name
const DEPT_MAP = { 0: 'אחר', 3: 'גרירה', 4: 'ניידת שירות', 5: 'שמשות', 10: 'רכב חליפי' };
// Status codes: open 0=waiting, 1=assigned; closed 2=completed, 3=cancelled, 6=special, 7=special
const CASE_STATUS_MAP = { 0: 'new', 1: 'assigned', 2: 'completed', 3: 'cancelled', 6: 'completed', 7: 'completed' };

function mapServiceType(deptId) {
  if (deptId === 3) return 'towing';
  if (deptId === 4) return 'mechanical';
  if (deptId === 5) return 'other';
  if (deptId === 10) return 'other';
  return 'other';
}

function mapAppeal(a) {
  const deptName = DEPT_MAP[a.department_id] || 'אחר';
  return {
    case_number: String(a.id),
    customer_name: a.requester || '',
    caller_phone: a.tel || a.tel1 || '',
    vehicle_number: a.car_num || '',
    vehicle_year: a.car_year || undefined,
    service_type: mapServiceType(a.department_id),
    location_address: a.address || '',
    location_city: a.city || '',
    destination_address: a.grar_address || '',
    destination_city: a.grar_city || '',
    status: CASE_STATUS_MAP[a.status] || 'new',
    assigned_provider_name: a.supplier_name || '',
    department: deptName,
    problem_description: a.diagnose || '',
    internal_notes: a.q_notes || '',
    inspector_name: a.inspector_id ? String(a.inspector_id) : '',
    passed_qa: a.inspector_approves === 1,
    opening_source: a.open_from_api === 1 ? 'app' : 'call_center',
    source_status: a.finish_time ? 'closed' : 'open',
    case_reference_code: a.sub_num ? String(a.sub_num) : '',
    customer_id: a.client_id ? String(a.client_id) : '',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
    }

    const connection = await getConnection();
    const [rows] = await connection.query(`
      SELECT a.*, s.fullname as supplier_name 
      FROM call_open_appeals a 
      LEFT JOIN suppliers s ON a.supplier_id = s.id 
      ORDER BY a.date_added DESC 
      LIMIT 20
    `);
    await connection.end();

    const mapped = rows.map(mapAppeal);

    return Response.json({
      total: rows.length,
      sample: mapped.slice(0, 3),
      raw_sample: rows.length > 0 ? rows[0] : null,
      departments: [...new Set(rows.map(a => `${a.department_id}=${DEPT_MAP[a.department_id] || '?'}`))],
      statuses: [...new Set(rows.map(a => String(a.status)))],
      serve_types: [...new Set(rows.map(a => a.serve_type).filter(Boolean))],
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});