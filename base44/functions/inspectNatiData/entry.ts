/**
 * inspectNatiData — Direct MySQL: returns first 2 records from call_open_appeals with all fields
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
  // Single connection attempt only (no SSL fallback) to avoid doubling failed
  // connection counts on Nati MySQL, which causes IP blocking.
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
      ORDER BY a.date_added DESC LIMIT 2
    `);
    await connection.end();

    return Response.json({
      success: true,
      total: rows.length,
      fields: rows.length > 0 ? Object.keys(rows[0]) : [],
      sample_records: rows,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});