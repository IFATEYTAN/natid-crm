/**
 * checkNatiStatuses — Direct MySQL: analyze status distribution
 * Uses call_open_appeals + call_closed_appeals
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

    // Open appeals status distribution
    const [openStatusRows] = await connection.query(
      'SELECT status, COUNT(*) as cnt FROM call_open_appeals GROUP BY status ORDER BY cnt DESC'
    );

    // Closed appeals status distribution  
    const [closedStatusRows] = await connection.query(
      'SELECT status, COUNT(*) as cnt FROM call_closed_appeals GROUP BY status ORDER BY cnt DESC'
    );

    // Open: has_updated flag
    const [updatedRows] = await connection.query(
      "SELECT SUM(CASE WHEN has_updated = 1 THEN 1 ELSE 0 END) as updated, SUM(CASE WHEN has_updated != 1 OR has_updated IS NULL THEN 1 ELSE 0 END) as not_updated FROM call_open_appeals"
    );

    // Supplier distribution (open)
    const [supplierRows] = await connection.query(
      "SELECT SUM(CASE WHEN supplier_id > 0 THEN 1 ELSE 0 END) as with_supplier, SUM(CASE WHEN supplier_id = 0 OR supplier_id IS NULL THEN 1 ELSE 0 END) as without_supplier FROM call_open_appeals"
    );

    // Totals
    const [openTotal] = await connection.query('SELECT COUNT(*) as total FROM call_open_appeals');
    const [closedTotal] = await connection.query('SELECT COUNT(*) as total FROM call_closed_appeals');

    // Department distribution (open)
    const [deptRows] = await connection.query(
      'SELECT department_id, COUNT(*) as cnt FROM call_open_appeals GROUP BY department_id ORDER BY cnt DESC'
    );

    await connection.end();

    const statusLabels = {
      '0': 'ממתינה לטיפול (0)', '1': 'שובצה לספק (1)', '2': 'הושלמה (2)',
      '3': 'בוטלה (3)', '6': 'מיוחד (6)', '7': 'מיוחד (7)',
    };

    const deptLabels = { 0: 'אחר', 3: 'גרירה', 4: 'ניידת שירות', 5: 'שמשות', 10: 'רכב חליפי' };

    return Response.json({
      open_appeals_total: openTotal[0]?.total || 0,
      closed_appeals_total: closedTotal[0]?.total || 0,
      open_status_breakdown: Object.fromEntries(
        openStatusRows.map(r => [statusLabels[String(r.status)] || `לא מוכר (${r.status})`, r.cnt])
      ),
      closed_status_breakdown: Object.fromEntries(
        closedStatusRows.map(r => [statusLabels[String(r.status)] || `לא מוכר (${r.status})`, r.cnt])
      ),
      department_breakdown: Object.fromEntries(
        deptRows.map(r => [deptLabels[r.department_id] || `מחלקה ${r.department_id}`, r.cnt])
      ),
      has_updated_flag: updatedRows[0] || {},
      supplier_info: supplierRows[0] || {},
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});