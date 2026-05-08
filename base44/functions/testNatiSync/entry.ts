/**
 * testNatiSync — Direct MySQL: test mapping from DB records
 * Returns sample mapped Case/Call data without writing to Base44.
 */
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

function mapStatus(s) {
  return { '0': 'new', '1': 'in_progress', '2': 'in_progress', '3': 'in_progress', '4': 'in_progress', '5': 'on_site', '6': 'new' }[String(s)] || 'new';
}

function mapDepartment(d) {
  return { 'גרירה': 'גרירה', 'ניידת': 'ניידת שירות', 'ניידת שירות': 'ניידת שירות', 'שמשות': 'שמשות', 'רכב חליפי': 'רכב חליפי', 'רדיו דיסק': 'רדיו דיסק' }[d] || 'אחר';
}

function mapServiceType(st, dept) {
  if (dept === 'גרירה') return 'towing';
  for (const [k, v] of Object.entries({ 'תקר': 'flat_tire', 'מצבר': 'battery', 'נעילה': 'lockout', 'דלק': 'fuel', 'תאונה': 'accident', 'מכני': 'mechanical' })) {
    if (st && st.includes(k)) return v;
  }
  return 'other';
}

function mapAppeal(a) {
  return {
    case_number: a.appeal_id,
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
    priority: a.vip === '1' || a.vip === 1 ? 'urgent' : 'normal',
    assigned_provider_name: a.supplier_name || '',
    department: mapDepartment(a.department),
    insurance_company: a.agent_name || '',
    package_name: a.package_name || '',
    problem_description: a.problem_desc || a.diagnose || '',
    inspector_name: a.inspector_name || '',
    is_vip: a.vip === '1' || a.vip === 1,
    source_status: a.finish_time && !String(a.finish_time).startsWith('0000') ? 'closed' : 'open',
    dispatcher_name: a.user_name || '',
    case_reference_code: a.sub_num || '',
  };
}

Deno.serve(async (req) => {
  try {
    const connection = await getConnection();
    const [rows] = await connection.query('SELECT * FROM appeals ORDER BY date_added_unix DESC LIMIT 20');
    await connection.end();

    const mapped = rows.map(mapAppeal);

    return Response.json({
      total: rows.length,
      sample: mapped.slice(0, 3),
      departments: [...new Set(rows.map(a => a.department))],
      statuses: [...new Set(rows.map(a => String(a.status)))],
      serve_types: [...new Set(rows.map(a => a.serve_type).filter(Boolean))],
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});