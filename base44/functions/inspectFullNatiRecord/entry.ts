/**
 * inspectFullNatiRecord — Direct MySQL: returns full record structure
 * with assigned/unassigned examples and all field names from call_open_appeals
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
      ORDER BY a.date_added DESC LIMIT 100
    `);
    await connection.end();

    if (rows.length === 0) {
      return Response.json({ total_fields: 0, message: 'No records found' });
    }

    const allFields = new Set();
    for (const r of rows) Object.keys(r).forEach(k => allFields.add(k));

    const assigned = rows.find(r => r.supplier_id && r.supplier_id > 0);
    const unassigned = rows.find(r => !r.supplier_id || r.supplier_id === 0);

    return Response.json({
      total_fields: allFields.size,
      all_field_names: [...allFields].sort(),
      assigned_example_full: assigned || 'none found',
      unassigned_example_full: unassigned || 'none found',
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});