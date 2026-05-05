import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function asNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`Environment variable ${name} must be a number, got: ${raw}`);
  }
  return n;
}

function asBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  port: asNumber('PORT', 8080),
  logLevel: optional('LOG_LEVEL', 'info'),

  serviceApiKey: required('SERVICE_API_KEY'),

  allowedOrigins: optional('ALLOWED_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  db: {
    host: required('NATI_DB_HOST'),
    port: asNumber('NATI_DB_PORT', 3306),
    user: required('NATI_DB_USER'),
    password: required('NATI_DB_PASSWORD'),
    database: optional('NATI_DB_NAME', ''),
    ssl: asBool('NATI_DB_SSL', true),
    poolLimit: asNumber('DB_POOL_LIMIT', 5),
    connectTimeout: asNumber('DB_CONNECT_TIMEOUT_MS', 15000),
  },

  rateLimit: {
    windowMs: asNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    max: asNumber('RATE_LIMIT_MAX', 120),
  },
} as const;
