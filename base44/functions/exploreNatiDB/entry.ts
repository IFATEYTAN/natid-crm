import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'list_tables', table_name, limit = 5, query } = body;

    const host = Deno.env.get('NATI_DB_HOSTNAME');
    const port = parseInt(Deno.env.get('NATI_DB_PORT') || '3306');
    const dbUser = Deno.env.get('NATI_DB_USERNAME');
    const password = Deno.env.get('NATI_DB_PASSWORD');

    if (!host || !dbUser || !password) {
      return Response.json({ error: 'Missing database credentials' }, { status: 500 });
    }

    console.log(`[DB] Connecting to ${host}:${port} as ${dbUser}`);

    let connection;
    try {
      connection = await mysql.createConnection({
        host,
        port,
        user: dbUser,
        password,
        connectTimeout: 15000,
        ssl: { rejectUnauthorized: false },
      });
    } catch (e) {
      console.error('[DB] SSL connection failed:', e.message);
      // Try without SSL
      try {
        connection = await mysql.createConnection({
          host,
          port,
          user: dbUser,
          password,
          connectTimeout: 15000,
        });
      } catch (e2) {
        return Response.json({ 
          error: 'Failed to connect to database',
          details: e2.message,
          ssl_error: e.message,
          host: host,
          port: port
        }, { status: 502 });
      }
    }

    try {
      if (action === 'list_databases') {
        const [rows] = await connection.query('SHOW DATABASES');
        await connection.end();
        return Response.json({ success: true, databases: rows.map(r => r.Database) });
      }

      if (action === 'list_tables') {
        // First get available databases
        const [dbs] = await connection.query('SHOW DATABASES');
        const databases = dbs.map(r => r.Database).filter(d => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(d));

        const allTables = [];
        for (const db of databases) {
          try {
            const [tables] = await connection.query(`SHOW TABLES FROM \`${db}\``);
            for (const t of tables) {
              const tableName = Object.values(t)[0];
              // Get approx row count
              let rowCount = 0;
              try {
                const [countResult] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${db}\`.\`${tableName}\` LIMIT 1`);
                rowCount = countResult[0]?.cnt || 0;
              } catch (_) {
                // Some tables might not be accessible
              }
              allTables.push({ database: db, table: tableName, approx_rows: rowCount });
            }
          } catch (e) {
            allTables.push({ database: db, error: e.message });
          }
        }

        await connection.end();
        return Response.json({ success: true, databases, tables: allTables, total_tables: allTables.length });
      }

      if (action === 'describe_table' && table_name) {
        // table_name can be "db.table" or just "table"
        const parts = table_name.split('.');
        const fullTable = parts.length === 2 ? `\`${parts[0]}\`.\`${parts[1]}\`` : `\`${table_name}\``;

        // Get columns
        const [columns] = await connection.query(`DESCRIBE ${fullTable}`);

        // Get sample data
        let sample = [];
        try {
          const [rows] = await connection.query(`SELECT * FROM ${fullTable} LIMIT ${parseInt(limit)}`);
          sample = rows;
        } catch (e) {
          sample = [{ error: e.message }];
        }

        // Get row count
        let rowCount = 0;
        try {
          const [countResult] = await connection.query(`SELECT COUNT(*) as cnt FROM ${fullTable}`);
          rowCount = countResult[0]?.cnt || 0;
        } catch (_) {}

        await connection.end();
        return Response.json({
          success: true,
          table: table_name,
          total_rows: rowCount,
          columns,
          sample_data: sample,
        });
      }

      if (action === 'run_query' && query) {
        if (!query.trim().toUpperCase().startsWith('SELECT')) {
          await connection.end();
          return Response.json({ error: 'Only SELECT queries allowed' }, { status: 400 });
        }
        const [rows] = await connection.query(query);
        await connection.end();
        return Response.json({ success: true, rows: rows.length, data: rows.slice(0, 100) });
      }

      await connection.end();
      return Response.json({ error: 'Unknown action. Use: list_databases, list_tables, describe_table, run_query' }, { status: 400 });

    } catch (dbError) {
      try { await connection.end(); } catch (_) {}
      return Response.json({ error: 'Database query failed', details: dbError.message }, { status: 500 });
    }

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});