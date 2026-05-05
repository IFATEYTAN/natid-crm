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

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
