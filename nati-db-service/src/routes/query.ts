import { Router, Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import { getPool } from '../db.js';

export const queryRouter = Router();

const MAX_ROWS = 1000;

// Read-only ad-hoc SELECT runner. Useful for discovery and debugging from the CRM.
// Rejects anything that isn't a single SELECT/SHOW/DESCRIBE statement.
queryRouter.post('/query', async (req: Request, res: Response) => {
  const sql = typeof req.body?.sql === 'string' ? req.body.sql.trim() : '';
  const params = Array.isArray(req.body?.params) ? req.body.params : [];

  if (!sql) {
    res.status(400).json({ error: 'Missing "sql" string in body' });
    return;
  }

  if (sql.includes(';') && !sql.replace(/;\s*$/, '').match(/;/)) {
    // Trailing semicolon is fine; multiple statements are not.
  } else if ((sql.match(/;/g) || []).length > 1) {
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
