/**
 * fetchLiveNatiData — Direct MySQL query to Natid database
 * Replaces the old Nati REST API calls with direct DB access.
 * 
 * Params:
 *   - action: "appeals_list" | "appeal_details"
 *   - appeal_id: (for appeal_details)
 *   - dep: department filter (-1 = all)
 *   - callStatus: status filter (-1 = all)
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
    throw new Error('Missing NATID_DB_HOST, NATID_DB_USER, or NATID_DB_PASSWORD');
  }
  try {
    return await mysql.createConnection(config);
  } catch (e) {
    // Retry without SSL
    const { ssl, ...noSsl } = config;
    return await mysql.createConnection(noSsl);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action = 'appeals_list', appeal_id, dep = -1, callStatus = -1 } = await req.json();

    const connection = await getConnection();

    try {
      if (action === 'appeal_details' && appeal_id) {
        const [rows] = await connection.query('SELECT * FROM appeals WHERE appeal_id = ? LIMIT 1', [appeal_id]);
        await connection.end();
        return Response.json({ success: true, data: rows[0] || null });
      }

      // Default: appeals list
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
      sql += ' ORDER BY date_added_unix DESC';

      const [rows] = await connection.query(sql, params);
      await connection.end();

      return Response.json({
        success: true,
        total: rows.length,
        data: rows,
        fetched_at: new Date().toISOString(),
      });
    } catch (dbErr) {
      try { await connection.end(); } catch (_) {}
      return Response.json({ error: 'DB query failed', details: dbErr.message }, { status: 500 });
    }
  } catch (error) {
    console.error('fetchLiveNatiData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});