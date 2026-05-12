import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { config } from '../config.js';
import { getPool } from '../db.js';

export const schemaRouter = Router();

const SYSTEM_DBS = new Set(['information_schema', 'mysql', 'performance_schema', 'sys']);

const IDENT_RE = /^[A-Za-z0-9_$]+$/;
function assertIdent(name: string, label: string): void {
  if (!IDENT_RE.test(name)) {
    throw new HttpError(400, `Invalid ${label}: must match ${IDENT_RE}`);
  }
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

schemaRouter.get('/schema/databases', async (_req: Request, res: Response) => {
  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>('SHOW DATABASES');
  const databases = rows.map((r) => r.Database as string).filter((d) => !SYSTEM_DBS.has(d));
  res.json({ databases });
});

schemaRouter.get('/schema/tables', async (req: Request, res: Response) => {
  const pool = await getPool();
  const targetDb = (req.query.database as string | undefined)?.trim();

  let databases: string[];
  if (targetDb) {
    assertIdent(targetDb, 'database');
    databases = [targetDb];
  } else {
    const [dbRows] = await pool.query<RowDataPacket[]>('SHOW DATABASES');
    databases = dbRows.map((r) => r.Database as string).filter((d) => !SYSTEM_DBS.has(d));
  }

  const tables: Array<{ database: string; table: string; approx_rows: number }> = [];
  for (const db of databases) {
    const [tRows] = await pool.query<RowDataPacket[]>(`SHOW TABLES FROM \`${db}\``);
    for (const row of tRows) {
      const tableName = Object.values(row)[0] as string;
      let approxRows = 0;
      try {
        const [countRows] = await pool.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS cnt FROM \`${db}\`.\`${tableName}\``
        );
        approxRows = Number(countRows[0]?.cnt ?? 0);
      } catch {
        // Some tables may not be readable with current creds - report 0.
      }
      tables.push({ database: db, table: tableName, approx_rows: approxRows });
    }
  }

  res.json({ databases, tables, total_tables: tables.length });
});

schemaRouter.get('/schema/:table', async (req: Request, res: Response) => {
  const pool = await getPool();
  const raw = req.params.table;
  const limit = Math.max(1, Math.min(100, Math.floor(Number(req.query.sample_limit ?? 5) || 5)));

  const parts = raw.split('.');
  if (parts.length > 2) throw new HttpError(400, 'Use db.table or table');
  parts.forEach((p) => assertIdent(p, 'identifier'));
  if (parts.length === 2 && SYSTEM_DBS.has(parts[0])) {
    throw new HttpError(403, 'Access to system databases is not permitted');
  }
  const fq = parts.length === 2 ? `\`${parts[0]}\`.\`${parts[1]}\`` : `\`${parts[0]}\``;

  const [columns] = await pool.query<RowDataPacket[]>(`DESCRIBE ${fq}`);
  const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS cnt FROM ${fq}`);
  const [sample] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${fq} LIMIT ${limit}`);

  res.json({
    table: raw,
    total_rows: Number(countRows[0]?.cnt ?? 0),
    columns,
    sample,
  });
});

// Centralized error mapping for this router.
schemaRouter.use((err: Error, _req: Request, res: Response, _next: import('express').NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const body: { error: string; message?: string } = { error: 'Schema query failed' };
  if (config.env !== 'production') body.message = err.message;
  res.status(500).json(body);
});
