/**
 * inspectFullNatiRecord — Direct MySQL: returns full record structure
 * with assigned/unassigned examples and all field names
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

    // Get all records to analyze field structure
    const [rows] = await connection.query('SELECT * FROM appeals ORDER BY date_added_unix DESC LIMIT 100');
    await connection.end();

    if (rows.length === 0) {
      return Response.json({ total_fields: 0, message: 'No records found' });
    }

    // All unique field names
    const allFields = new Set();
    for (const r of rows) {
      Object.keys(r).forEach(k => allFields.add(k));
    }

    // Find assigned and unassigned examples
    const assigned = rows.find(r => r.supplier_name && String(r.supplier_name).trim());
    const unassigned = rows.find(r => !r.supplier_name || !String(r.supplier_name).trim());

    return Response.json({
      total_fields: allFields.size,
      all_field_names: [...allFields].sort(),
      assigned_example_full: assigned || 'none found',
      unassigned_example_full: unassigned || 'none found',
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});