import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  logger.error({ err: err.message, stack: err.stack, path: req.path }, 'Unhandled error');
  const body: { error: string; message?: string } = { error: 'Internal server error' };
  if (config.env !== 'production') {
    body.message = err.message;
  }
  res.status(500).json(body);
}
