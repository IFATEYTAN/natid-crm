import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { config } from './config.js';
import { logger } from './logger.js';

let pool: Pool | null = null;

function buildPoolOptions(useSsl: boolean): PoolOptions {
  return {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database || undefined,
    connectionLimit: config.db.poolLimit,
    connectTimeout: config.db.connectTimeout,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    namedPlaceholders: true,
    dateStrings: true,
  };
}

async function tryCreatePool(): Promise<Pool> {
  // RDS usually requires SSL; fall back to plain TCP only if SSL handshake fails.
  try {
    const p = mysql.createPool(buildPoolOptions(config.db.ssl));
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    logger.info({ ssl: config.db.ssl }, 'MySQL pool ready');
    return p;
  } catch (err) {
    if (!config.db.ssl) throw err;
    logger.warn({ err: (err as Error).message }, 'SSL connection failed, retrying without SSL');
    const p = mysql.createPool(buildPoolOptions(false));
    const conn = await p.getConnection();
    await conn.ping();
    conn.release();
    logger.info({ ssl: false }, 'MySQL pool ready (no SSL)');
    return p;
  }
}

export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = await tryCreatePool();
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function ping(): Promise<{ ok: true; latencyMs: number }> {
  const p = await getPool();
  const start = Date.now();
  const conn = await p.getConnection();
  try {
    await conn.query('SELECT 1');
    return { ok: true, latencyMs: Date.now() - start };
  } finally {
    conn.release();
  }
}
