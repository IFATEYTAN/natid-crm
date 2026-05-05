import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.logLevel,
  redact: {
    paths: ['req.headers.authorization', 'req.headers["x-api-key"]', '*.password', '*.NATI_DB_PASSWORD'],
    censor: '[REDACTED]',
  },
});
