import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { config } from './config.js';
import { logger } from './logger.js';
import { closePool, getPool } from './db.js';
import { requireApiKey } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';
import { schemaRouter } from './routes/schema.js';
import { queryRouter } from './routes/query.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(express.json({ limit: '64kb' }));
app.use(pinoHttp({ logger }));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.allowedOrigins.length === 0) return cb(null, true);
      if (config.allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin not allowed: ${origin}`));
    },
    credentials: false,
  })
);

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Public liveness endpoint - no auth, so DO health checks work without leaking the key.
app.use(healthRouter);

// Everything below requires the shared API key.
app.use(requireApiKey);
app.use(schemaRouter);
app.use(queryRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

async function start(): Promise<void> {
  // Warm the pool eagerly so we fail fast on bad credentials / network.
  await getPool();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'nati-db-service listening');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(() => logger.info('HTTP server closed'));
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((err) => {
  logger.fatal({ err: (err as Error).message }, 'Failed to start');
  process.exit(1);
});
