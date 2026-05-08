/**
 * exploreNatiDB — Direct MySQL connection to Natid database
 * Uses NATID_DB_* secrets for connection.
 * Supports: list_databases, list_tables, describe_table, run_query
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import mysql from 'npm:mysql2@3.9.7/promise';

function getDbConfig() {
  const host = Deno.env.get('NATID_DB_HOST');
  const port = parseInt(Deno.env.get('NATID_DB_PORT') || '3306');
  const user = Deno.env.get('NATID_DB_USER');
  const password = Deno.env.get('NATID_DB_PASSWORD');
  const database = Deno.env.get('NATID_DB_NAME');

  if (!host || !user || !password) {
    throw new Error('Missing NATID_DB_HOST, NATID_DB_USER, or NATID_DB_PASSWORD secrets');
  }

  return {
    host,
    port,
    user,
    password,
    database: database || undefined,
    connectTimeout: 15000,
    waitForConnections: true,
    connectionLimit: 5,
    ssl: { rejectUnauthorized: false },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { action = 'list_tables', table_name, limit = 5, query } = body;

    const dbConfig = getDbConfig();
    console.log(`[DB] Connecting to ${dbConfig.host}:${dbConfig.port} as ${dbConfig.user}, db=${dbConfig.database || 'none'}`);

    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      console.log('[DB] Connected successfully with SSL');
    } catch (e) {
      console.error('[DB] SSL connection failed:', e.message);
      // Try without SSL
      try {
        const { ssl, ...configNoSsl } = dbConfig;
        connection = await mysql.createConnection(configNoSsl);
        console.log('[DB] Connected without SSL');
      } catch (e2) {
        return Response.json({ 
          error: 'Failed to connect to database',
          details: e2.message,
          ssl_error: e.message,
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
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
        const db = dbConfig.database;
        if (!db) {
          // List all databases and tables
          const [dbs] = await connection.query('SHOW DATABASES');
          const databases = dbs.map(r => r.Database).filter(d => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(d));
          const allTables = [];
          for (const dbName of databases) {
            try {
              const [tables] = await connection.query(`SHOW TABLES FROM \`${dbName}\``);
              for (const t of tables) {
                const tableName = Object.values(t)[0];
                let rowCount = 0;
                try {
                  const [countResult] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${dbName}\`.\`${tableName}\` LIMIT 1`);
                  rowCount = countResult[0]?.cnt || 0;
                } catch (_) {}
                allTables.push({ database: dbName, table: tableName, approx_rows: rowCount });
              }
            } catch (e) {
              allTables.push({ database: dbName, error: e.message });
            }
          }
          await connection.end();
          return Response.json({ success: true, databases, tables: allTables, total_tables: allTables.length });
        }

        // List tables in the configured database
        const [tables] = await connection.query(`SHOW TABLES`);
        const allTables = [];
        for (const t of tables) {
          const tableName = Object.values(t)[0];
          let rowCount = 0;
          try {
            const [countResult] = await connection.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
            rowCount = countResult[0]?.cnt || 0;
          } catch (_) {}
          allTables.push({ database: db, table: tableName, approx_rows: rowCount });
        }
        await connection.end();
        return Response.json({ success: true, database: db, tables: allTables, total_tables: allTables.length });
      }

      if (action === 'describe_table' && table_name) {
        const parts = table_name.split('.');
        const fullTable = parts.length === 2 ? `\`${parts[0]}\`.\`${parts[1]}\`` : `\`${table_name}\``;

        const [columns] = await connection.query(`DESCRIBE ${fullTable}`);
        let sample = [];
        try {
          const [rows] = await connection.query(`SELECT * FROM ${fullTable} LIMIT ${parseInt(limit)}`);
          sample = rows;
        } catch (e) {
          sample = [{ error: e.message }];
        }

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