/**
 * fetchNatiAppeals — Direct MySQL query to Natid database
 * Admin-only. Supports filters: dep, callStatus, from_date, to_date, q (free text search)
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dir = 'DESC', from_date, to_date, q } = body;

    const connection = await getConnection();

    try {
      let sql = 'SELECT * FROM appeals WHERE 1=1';
      const params = [];

      if (dep !== -1) {
        sql += ' AND department_id = ?';
        params.push(dep);
      }
      if (callStatus !== -1) {
        sql += ' AND status = ?';
        params.push(callStatus);
      }
      if (from_date) {
        sql += ' AND date_added >= ?';
        params.push(from_date);
      }
      if (to_date) {
        sql += ' AND date_added <= ?';
        params.push(to_date);
      }
      if (q) {
        sql += ' AND (client_name LIKE ? OR appeal_id LIKE ? OR tel LIKE ? OR car_num LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY date_added_unix ${dir === 'ASC' ? 'ASC' : 'DESC'}`;

      const [rows] = await connection.query(sql, params);
      await connection.end();

      return Response.json({ success: true, total: rows.length, data: rows });
    } catch (dbErr) {
      try { await connection.end(); } catch (_) {}
      return Response.json({ error: 'DB query failed', details: dbErr.message }, { status: 500 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});