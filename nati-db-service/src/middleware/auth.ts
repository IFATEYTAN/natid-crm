import { timingSafeEqual } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const provided =
    (req.headers['x-api-key'] as string | undefined) ??
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice('Bearer '.length)
      : undefined);

  if (!provided) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  if (!safeCompare(provided, config.serviceApiKey)) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
}

// Constant-time compare regardless of input length, so we don't leak the
// secret's length via timing.
function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    // Still run a constant-time compare against `aBuf` so the work done
    // is the same regardless of length mismatch.
    timingSafeEqual(aBuf, Buffer.alloc(aBuf.length));
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
