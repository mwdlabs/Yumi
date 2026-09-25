import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { TFunction } from 'i18next';
import type { Env } from './config/env.ts';
import { createErrorHandler, notFoundHandler } from './http/errors.ts';
import { authenticate } from './http/middlewares/authenticate.ts';
import type { RateLimitStoreFactory } from './http/middlewares/rate-limit.ts';
import { systemClock, type Clock } from './lib/clock.ts';
import type { Logger } from './lib/logger.ts';
import type { Database } from './lib/prisma.ts';
import type { Mailer } from './mail/mailer.ts';
import { authRouter } from './modules/auth/auth.router.ts';
import { AuthService } from './modules/auth/auth.service.ts';
import { TokenService } from './modules/auth/token.service.ts';
import { familiesRouter } from './modules/families/families.router.ts';
import { FamiliesService } from './modules/families/families.service.ts';
import { invitationsRouter } from './modules/invitations/invitations.router.ts';
import { InvitationsService } from './modules/invitations/invitations.service.ts';
import { meRouter } from './modules/me/me.router.ts';

/** Dépendances externes de l'application, injectées pour pouvoir les remplacer en test. */
export interface AppDeps {
  env: Env;
  db: Database;
  mailer: Mailer;
  logger: Logger;
  t: TFunction;
  clock?: Clock;
  rateLimitStoreFactory?: RateLimitStoreFactory;
}

export function createApp(deps: AppDeps): Express {
  const { env, db, logger } = deps;
  const clock = deps.clock ?? systemClock;
  const tokens = new TokenService(env);
  const auth = new AuthService({ env, db, mailer: deps.mailer, tokens, t: deps.t, clock });
  const families = new FamiliesService(db);
  const invitations = new InvitationsService({ env, db, clock, families });

  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));
  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== 'test' }));

  app.get('/health', async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });

  const v1 = express.Router();
  v1.use('/auth', authRouter(auth, deps.rateLimitStoreFactory));
  const requireUser = authenticate(tokens, db);
  v1.use('/me', requireUser, meRouter(db));
  v1.use('/families', requireUser, familiesRouter(db, families, invitations));
  v1.use('/invitations', requireUser, invitationsRouter(invitations, deps.rateLimitStoreFactory));
  app.use('/v1', v1);

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
