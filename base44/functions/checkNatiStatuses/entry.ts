/**
 * checkNatiStatuses — Direct MySQL: analyze status distribution in appeals
 */
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
    const connection = await getConnection();

    // Count by status
    const [statusRows] = await connection.query(
      'SELECT status, COUNT(*) as cnt FROM appeals GROUP BY status ORDER BY cnt DESC'
    );

    // Count has_updated flag
    const [updatedRows] = await connection.query(
      "SELECT SUM(CASE WHEN has_updated = '1' THEN 1 ELSE 0 END) as updated, SUM(CASE WHEN has_updated != '1' OR has_updated IS NULL THEN 1 ELSE 0 END) as not_updated FROM appeals"
    );

    // Supplier distribution
    const [supplierRows] = await connection.query(
      "SELECT SUM(CASE WHEN supplier_name IS NOT NULL AND TRIM(supplier_name) != '' THEN 1 ELSE 0 END) as with_supplier, SUM(CASE WHEN supplier_name IS NULL OR TRIM(supplier_name) = '' THEN 1 ELSE 0 END) as without_supplier FROM appeals"
    );

    // Sample closed calls (status 5)
    const [closedSamples] = await connection.query(
      'SELECT appeal_id, status, supplier_name, finish_time, arrive_time, claim_total_cost, inspector_approves, inspector_name, wait_time FROM appeals WHERE status = 5 LIMIT 3'
    );

    // Sample cancelled (status 6)
    const [cancelledSamples] = await connection.query(
      'SELECT appeal_id, status, supplier_name, finish_time FROM appeals WHERE status = 6 LIMIT 2'
    );

    // Total count
    const [totalRow] = await connection.query('SELECT COUNT(*) as total FROM appeals');

    await connection.end();

    const statusLabels = {
      '0': 'חדשה/ממתינה (0)', '1': 'בשיבוץ (1)', '2': 'ספק בדרך (2)',
      '3': 'ספק הגיע (3)', '4': 'בטיפול (4)', '5': 'הושלמה (5)', '6': 'בוטלה (6)',
    };

    const statusCounts = {};
    for (const row of statusRows) {
      const label = statusLabels[String(row.status)] || `לא מוכר (${row.status})`;
      statusCounts[label] = row.cnt;
    }

    return Response.json({
      total_records: totalRow[0]?.total || 0,
      status_breakdown: statusCounts,
      has_updated_flag: updatedRows[0] || {},
      supplier_info: supplierRows[0] || {},
      closed_call_examples: closedSamples,
      cancelled_call_examples: cancelledSamples,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});