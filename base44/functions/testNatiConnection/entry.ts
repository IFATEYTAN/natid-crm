/**
 * testNatiConnection — Tests direct MySQL connection to Natid DB
 * Admin only. Returns connection diagnostics + sample table list.
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

  const results = {};

  // Test 1: MySQL direct with SSL
  try {
    const config = {
      host: Deno.env.get('NATID_DB_HOST'),
      port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
      user: Deno.env.get('NATID_DB_USER'),
      password: Deno.env.get('NATID_DB_PASSWORD'),
      database: Deno.env.get('NATID_DB_NAME'),
      connectTimeout: 5000,
    };

    results.config = {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      has_password: !!config.password,
    };

    const connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SELECT 1 as test, NOW() as server_time');
    results.test1_ssl = { status: 'OK', data: rows[0] };
    await connection.end();
  } catch (e) {
    results.test1_ssl = { status: 'FAILED', error: e.message };
  }

  // Note: we intentionally do NOT attempt a second no-SSL connection on failure.
  // Each failed attempt increments Nati MySQL's connection-error counter and
  // contributes to the "Host is blocked" issue. One attempt is enough to diagnose.

  // Test 3: List tables if connected
  if (results.test1_ssl?.status === 'OK') {
    try {
      const config = {
        host: Deno.env.get('NATID_DB_HOST'),
        port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
        user: Deno.env.get('NATID_DB_USER'),
        password: Deno.env.get('NATID_DB_PASSWORD'),
        database: Deno.env.get('NATID_DB_NAME'),
        connectTimeout: 5000,
      };

      const connection = await mysql.createConnection(config);
      const [tables] = await connection.query('SHOW TABLES');
      results.test3_tables = {
        status: 'OK',
        tables: tables.map(t => Object.values(t)[0]),
      };
      await connection.end();
    } catch (e) {
      results.test3_tables = { status: 'FAILED', error: e.message };
    }
  }

  return Response.json(results, { status: 200 });
});