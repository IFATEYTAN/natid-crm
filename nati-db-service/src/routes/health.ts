import { Router, Request, Response } from 'express';
import { ping } from '../db.js';
import { logger } from '../logger.js';

export const healthRouter = Router();

// Lightweight liveness probe - no DB call. Useful for load balancers / Docker healthcheck.
healthRouter.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'nati-db-service', uptime_sec: Math.floor(process.uptime()) });
});

// Readiness probe - verifies the DB is reachable.
healthRouter.get('/health/db', async (_req: Request, res: Response) => {
  try {
    const result = await ping();
    res.json(result);
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'DB health check failed');
    res.status(503).json({ ok: false, error: (err as Error).message });
  }
});
