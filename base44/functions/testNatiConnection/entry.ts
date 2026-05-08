/**
 * testNatiConnection — Tests direct MySQL connection to Natid DB
 * No auth required — just a connectivity test.
 */
import mysql from 'npm:mysql2@3.9.7/promise';

Deno.serve(async (req) => {
  const results = {};

  // Test 1: MySQL direct with SSL
  try {
    const config = {
      host: Deno.env.get('NATID_DB_HOST'),
      port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
      user: Deno.env.get('NATID_DB_USER'),
      password: Deno.env.get('NATID_DB_PASSWORD'),
      database: Deno.env.get('NATID_DB_NAME'),
      connectTimeout: 15000,
      ssl: { rejectUnauthorized: false },
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

  // Test 2: MySQL without SSL (fallback)
  if (results.test1_ssl?.status === 'FAILED') {
    try {
      const config = {
        host: Deno.env.get('NATID_DB_HOST'),
        port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
        user: Deno.env.get('NATID_DB_USER'),
        password: Deno.env.get('NATID_DB_PASSWORD'),
        database: Deno.env.get('NATID_DB_NAME'),
        connectTimeout: 15000,
      };

      const connection = await mysql.createConnection(config);
      const [rows] = await connection.query('SELECT 1 as test, NOW() as server_time');
      results.test2_no_ssl = { status: 'OK', data: rows[0] };
      await connection.end();
    } catch (e) {
      results.test2_no_ssl = { status: 'FAILED', error: e.message };
    }
  }

  // Test 3: List tables if connected
  if (results.test1_ssl?.status === 'OK' || results.test2_no_ssl?.status === 'OK') {
    try {
      const useSsl = results.test1_ssl?.status === 'OK';
      const config = {
        host: Deno.env.get('NATID_DB_HOST'),
        port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
        user: Deno.env.get('NATID_DB_USER'),
        password: Deno.env.get('NATID_DB_PASSWORD'),
        database: Deno.env.get('NATID_DB_NAME'),
        connectTimeout: 15000,
        ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
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