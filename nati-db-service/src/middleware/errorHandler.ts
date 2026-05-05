import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  logger.error({ err: err.message, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error', message: err.message });
}
