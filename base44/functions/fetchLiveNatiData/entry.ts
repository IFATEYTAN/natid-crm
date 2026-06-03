/**
 * fetchLiveNatiData — Direct MySQL query to Natid database
 * Uses call_open_appeals (open) or call_closed_appeals (closed) with JOIN to suppliers.
 * 
 * Params:
 *   - action: "appeals_list" | "appeal_details"
 *   - appeal_id: (for appeal_details — searches both tables)
 *   - dep: department_id filter (-1 = all)
 *   - callStatus: status filter (-1 = all)
 *   - include_closed: if true, also include closed appeals
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

    const { action = 'appeals_list', appeal_id, dep = -1, callStatus = -1, include_closed = false } = await req.json();
    const connection = await getConnection();

    try {
      if (action === 'appeal_details' && appeal_id) {
        // Search both open and closed tables
        let [rows] = await connection.query(
          'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE a.id = ? LIMIT 1',
          [appeal_id]
        );
        if (rows.length === 0) {
          [rows] = await connection.query(
            'SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE a.id = ? LIMIT 1',
            [appeal_id]
          );
        }
        await connection.end();
        return Response.json({ success: true, data: rows[0] || null });
      }

      // Default: appeals list from call_open_appeals
      let sql = 'SELECT a.*, s.fullname as supplier_name FROM call_open_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
      const params = [];

      if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
      if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
      sql += ' ORDER BY a.date_added DESC';

      const [rows] = await connection.query(sql, params);

      let closedRows = [];
      if (include_closed) {
        let closedSql = 'SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1';
        const closedParams = [];
        if (dep !== -1) { closedSql += ' AND a.department_id = ?'; closedParams.push(dep); }
        if (callStatus !== -1) { closedSql += ' AND a.status = ?'; closedParams.push(callStatus); }
        closedSql += ' ORDER BY a.date_added DESC LIMIT 1000';
        [closedRows] = await connection.query(closedSql, closedParams);
      }

      await connection.end();

      return Response.json({
        success: true,
        total: rows.length + closedRows.length,
        open_count: rows.length,
        closed_count: closedRows.length,
        data: [...rows, ...closedRows],
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