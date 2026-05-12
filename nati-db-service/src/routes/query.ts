import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { getPool } from '../db.js';

export const queryRouter = Router();

const MAX_ROWS = 1000;

// Read-only ad-hoc SELECT runner. Useful for discovery and debugging from the CRM.
// Rejects anything that isn't a single SELECT/SHOW/DESCRIBE statement.
// Patterns that can read/write the filesystem, exfiltrate, or DOS the server.
// Even though the route is restricted to SELECT/SHOW/DESCRIBE, these keywords
// can appear inside an otherwise-valid SELECT (e.g. `SELECT LOAD_FILE(...)`).
const DENYLIST_RE = /\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE|BENCHMARK|SLEEP|GET_LOCK|RELEASE_LOCK|INFORMATION_SCHEMA|MYSQL\.\w+|PERFORMANCE_SCHEMA)\b/i;

queryRouter.post('/query', async (req: Request, res: Response) => {
  const sql = typeof req.body?.sql === 'string' ? req.body.sql.trim() : '';
  const params = Array.isArray(req.body?.params) ? req.body.params : [];

  if (!sql) {
    res.status(400).json({ error: 'Missing "sql" string in body' });
    return;
  }

  // Trailing semicolon is fine; any other semicolon is multi-statement.
  if (sql.replace(/;\s*$/, '').includes(';')) {
    res.status(400).json({ error: 'Multiple statements are not allowed' });
    return;
  }

  const head = sql.replace(/^\s*\(*\s*/, '').slice(0, 10).toUpperCase();
  const isReadOnly =
    head.startsWith('SELECT') || head.startsWith('SHOW') || head.startsWith('DESCRIBE') || head.startsWith('DESC ');
  if (!isReadOnly) {
    res.status(400).json({ error: 'Only SELECT / SHOW / DESCRIBE statements are allowed' });
    return;
  }

  if (DENYLIST_RE.test(sql)) {
    res.status(400).json({ error: 'Query contains restricted keyword' });
    return;
  }

  const pool = await getPool();
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  const truncated = Array.isArray(rows) && rows.length > MAX_ROWS;

  res.json({
    rows: Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : rows,
    row_count: Array.isArray(rows) ? Math.min(rows.length, MAX_ROWS) : 0,
    truncated,
    max_rows: MAX_ROWS,
  });
});
