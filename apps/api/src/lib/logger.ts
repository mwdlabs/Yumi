import { pino, type Logger } from 'pino';
import type { Env } from '../config/env.ts';

export type { Logger };

/**
 * Logger JSON structuré. Les en-têtes sensibles sont masqués ; les corps de
 * requête ne sont jamais journalisés (courriels, codes).
 */
export function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger {
  return pino({
    level: env.LOG_LEVEL,
    redact: ['req.headers.authorization', 'req.headers.cookie'],
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  });
}
