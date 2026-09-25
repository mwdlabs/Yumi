import { rateLimit, type Store } from 'express-rate-limit';
import { ApiErrorCode, type ApiErrorBody } from '@yumi/shared';

/**
 * Fabrique de store pour les limiteurs. En production, Redis, afin que la limite
 * soit partagée entre toutes les instances de l'API ; `undefined` = mémoire locale.
 */
export type RateLimitStoreFactory = (prefix: string) => Store | undefined;

/** Limiteur par adresse IP, avec réponse au format d'erreur standard. */
export function ipRateLimit(options: {
  name: string;
  windowMs: number;
  limit: number;
  storeFactory?: RateLimitStoreFactory;
}) {
  const store = options.storeFactory?.(`rl:${options.name}:`);
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: options.name,
    ...(store ? { store } : {}),
    handler: (_req, res, _next, opts) => {
      const retryAfter = Math.ceil(opts.windowMs / 1000);
      const body: ApiErrorBody = {
        error: { code: ApiErrorCode.RATE_LIMITED, message: 'Trop de requêtes.', retryAfter },
      };
      res.status(429).json(body);
    },
  });
}
