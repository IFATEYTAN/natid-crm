/**
 * checkNatiFields — Direct MySQL: extract specific field values from call_open_appeals
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
    connectTimeout: 5000,
  };
}

async function getConnection() {
  const config = getDbConfig();
  if (!config.host || !config.user || !config.password) throw new Error("Missing NATID_DB_* secrets");
  return await mysql.createConnection(config);
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
      ORDER BY a.date_added DESC LIMIT 5
    `);
    await connection.end();

    if (rows.length === 0) {
      return Response.json({ message: 'No records found' });
    }

    const fieldsToCheck = [
      'id', 'tel', 'tel1', 'supplier_id', 'supplier_name',
      'city', 'grar_city', 'area', 'address', 'grar_address',
      'requester', 'client_id', 'passport',
      'car_num', 'car_code', 'car_type', 'car_year', 'car_pin', 'key_location',
      'status', 'department_id', 'serve_type', 'initial_serve_type',
      'date_added', 'arrive_expected_time', 'arrive_actual_time',
      'supplier_choice_time', 'finish_time', 'supplier_assigned_date',
      'diagnose', 'q_notes', 'finish_note',
      'inspected', 'inspector_id', 'inspector_approves',
      'open_from_api', 'has_updated',
    ];

    const summary = rows.map(r => {
      const extracted = {};
      for (const f of fieldsToCheck) {
        extracted[f] = r[f] !== undefined ? r[f] : '❌ NOT IN DB';
      }
      return extracted;
    });

    const actualFields = Object.keys(rows[0]);
    const missingFields = fieldsToCheck.filter(f => rows[0][f] === undefined);

    return Response.json({
      total_records_sampled: rows.length,
      total_fields: actualFields.length,
      missing_fields_we_wanted: missingFields.length > 0 ? missingFields : 'הכל קיים',
      sample_data: summary,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});