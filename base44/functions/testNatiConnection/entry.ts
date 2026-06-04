/**
 * testNatiConnection — Tests direct MySQL connection to Natid DB
 * Admin only. Returns connection diagnostics + sample table list.
 * No SSL — Nati RDS rejects our cert chain, and every failed SSL probe
 * increments max_connect_errors. Connect plaintext directly.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  }

  const config = {
    host: Deno.env.get('NATID_DB_HOST'),
    port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
    user: Deno.env.get('NATID_DB_USER'),
    password: Deno.env.get('NATID_DB_PASSWORD'),
    database: Deno.env.get('NATID_DB_NAME'),
    connectTimeout: 5000,
  };

  const results = {
    config: {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      has_password: !!config.password,
    },
  };

  try {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SELECT 1 as test, NOW() as server_time');
    results.connection = { status: 'OK', data: rows[0] };
    const [tables] = await connection.query('SHOW TABLES');
    results.tables = { status: 'OK', count: tables.length, tables: tables.map(t => Object.values(t)[0]).slice(0, 20) };
    await connection.end();
  } catch (e) {
    results.connection = { status: 'FAILED', error: e.message };
  }

  return Response.json(results, { status: 200 });
});
