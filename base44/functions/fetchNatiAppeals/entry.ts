/**
 * fetchNatiAppeals — Direct MySQL query to Natid database
 * Admin-only. Supports filters: dep, callStatus, from_date, to_date, q, source (open/closed/all)
 *
 * Connection handling + circuit breaker live in ./_shared/natiDb.ts.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { withNatiConnection, natiErrorResponse } from './_shared/natiDb.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { dep = -1, callStatus = -1, dir = 'DESC', from_date, to_date, q, source = 'open' } = body;

    const allRows = await withNatiConnection(async (connection) => {
      const table = source === 'closed' ? 'call_closed_appeals' : 'call_open_appeals';
      let sql = `SELECT a.*, s.fullname as supplier_name FROM ${table} a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1`;
      const params = [];

      if (dep !== -1) { sql += ' AND a.department_id = ?'; params.push(dep); }
      if (callStatus !== -1) { sql += ' AND a.status = ?'; params.push(callStatus); }
      if (from_date) { sql += ' AND a.date_added >= ?'; params.push(from_date); }
      if (to_date) { sql += ' AND a.date_added <= ?'; params.push(to_date); }
      if (q) {
        sql += ' AND (a.requester LIKE ? OR a.id LIKE ? OR a.tel LIKE ? OR a.car_num LIKE ?)';
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      sql += ` ORDER BY a.date_added ${dir === 'ASC' ? 'ASC' : 'DESC'}`;

      const [rows] = await connection.query(sql, params);

      // If source is 'all', also query the closed table on the same connection.
      if (source === 'all') {
        let sql2 = `SELECT a.*, s.fullname as supplier_name FROM call_closed_appeals a LEFT JOIN suppliers s ON a.supplier_id = s.id WHERE 1=1`;
        const params2 = [];
        if (dep !== -1) { sql2 += ' AND a.department_id = ?'; params2.push(dep); }
        if (callStatus !== -1) { sql2 += ' AND a.status = ?'; params2.push(callStatus); }
        if (from_date) { sql2 += ' AND a.date_added >= ?'; params2.push(from_date); }
        if (to_date) { sql2 += ' AND a.date_added <= ?'; params2.push(to_date); }
        if (q) {
          sql2 += ' AND (a.requester LIKE ? OR a.id LIKE ? OR a.tel LIKE ? OR a.car_num LIKE ?)';
          const s2 = `%${q}%`;
          params2.push(s2, s2, s2, s2);
        }
        sql2 += ` ORDER BY a.date_added ${dir === 'ASC' ? 'ASC' : 'DESC'} LIMIT 5000`;
        const [closedRows] = await connection.query(sql2, params2);
        return [...rows, ...closedRows];
      }
      return rows;
    });

    return Response.json({ success: true, total: allRows.length, data: allRows });
  } catch (error) {
    console.error('fetchNatiAppeals error:', error);
    return natiErrorResponse(error);
  }
});
