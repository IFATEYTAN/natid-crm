/**
 * debugNatiToken — Now tests BOTH direct MySQL connection AND legacy API
 * Useful for diagnosing connectivity issues.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

const NATI_API_BASE = 'https://api.natid.co.il/api';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const results = {};

    // Test 1: Direct MySQL connection
    try {
      const dbConfig = {
        host: Deno.env.get('NATID_DB_HOST'),
        port: parseInt(Deno.env.get('NATID_DB_PORT') || '3306'),
        user: Deno.env.get('NATID_DB_USER'),
        password: Deno.env.get('NATID_DB_PASSWORD'),
        database: Deno.env.get('NATID_DB_NAME'),
        connectTimeout: 15000,
        ssl: { rejectUnauthorized: false },
      };

      results.db_config = {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database,
        has_password: !!dbConfig.password,
      };

      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.query('SELECT 1 as test');
      await connection.end();
      results.mysql_direct = { status: 'OK', data: rows[0] };
    } catch (e) {
      results.mysql_direct = { status: 'FAILED', error: e.message };
    }

    // Test 2: Legacy API (for comparison)
    try {
      const JWT_TOKEN = (Deno.env.get('NATI_API_JWT_TOKEN') || '').trim();
      const CLIENT_ID = (Deno.env.get('NATI_API_CLIENT_ID') || '').trim().replace(/\s+JWT$/i, '').trim();

      if (JWT_TOKEN && CLIENT_ID) {
        const apiRes = await fetch(`${NATI_API_BASE}/get_appeals_list?dep=-1&callStatus=-1&dir=DESC`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${JWT_TOKEN}`,
            'clientId': CLIENT_ID,
            'Content-Type': 'application/json',
          },
        });
        const text = await apiRes.text();
        results.legacy_api = { status: apiRes.status, body: text.substring(0, 500) };
      } else {
        results.legacy_api = { status: 'SKIPPED', reason: 'No API credentials configured' };
      }
    } catch (e) {
      results.legacy_api = { status: 'FAILED', error: e.message };
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});