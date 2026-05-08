/**
 * checkNatiFields — Direct MySQL: extract specific field values from first 5 records
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
    const [rows] = await connection.query('SELECT * FROM appeals ORDER BY date_added_unix DESC LIMIT 5');
    await connection.end();

    if (rows.length === 0) {
      return Response.json({ message: 'No records found' });
    }

    const fieldsToCheck = [
      'appeal_id', 'tel', 'tel1', 'tel2', 'intermediary_phone',
      'supplier_name', 'supplier_phone', 'supplier_mobile', 'supplier_tel',
      'city', 'grar_city', 'area', 'tow_area', 'pickup_area',
      'from_location', 'to_location',
      'client_name', 'client_email', 'client_id',
      'car_num', 'car_code', 'kod_degem_name',
      'mispar_shilda', 'car_pin', 'key_location',
      'status', 'department', 'serve_type',
    ];

    const summary = rows.map(r => {
      const extracted = {};
      for (const f of fieldsToCheck) {
        extracted[f] = r[f] !== undefined ? r[f] : '❌ NOT IN DB';
      }
      return extracted;
    });

    const actualFields = Object.keys(rows[0]);
    const missingFields = fieldsToCheck.filter(f => rows[0][f] === undefined);

    return Response.json({
      total_records_sampled: rows.length,
      total_fields: actualFields.length,
      missing_fields_we_wanted: missingFields.length > 0 ? missingFields : 'הכל קיים',
      sample_data: summary,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});