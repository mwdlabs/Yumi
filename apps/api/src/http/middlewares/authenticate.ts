import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { TokenService } from '../../modules/auth/token.service.ts';
import type { Database } from '../../lib/prisma.ts';
import { AppError } from '../errors.ts';

/** Identité de l'appelant, disponible après le middleware `authenticate`. */
export interface AuthContext {
  userId: string;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Vérifie le jeton d'accès (Bearer) et que sa session n'a pas été révoquée :
 * une déconnexion prend donc effet immédiatement, sans attendre l'expiration du JWT.
 */
export function authenticate(tokens: TokenService, db: Database): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthenticated();

    const claims = await tokens.verifyAccessToken(header.slice('Bearer '.length));
    if (!claims) throw AppError.unauthenticated('Jeton invalide ou expiré.');

    const session = await db.session.findUnique({
      where: { id: claims.sessionId },
      select: { userId: true, revokedAt: true, expiresAt: true },
    });
    if (
      !session ||
      session.userId !== claims.userId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw AppError.unauthenticated('Session expirée.');
    }

    req.auth = claims;
    next();
  };
}

/** Retourne l'identité de l'appelant ; à utiliser derrière `authenticate`. */
export function requireAuth(req: Request): AuthContext {
  if (!req.auth) throw AppError.unauthenticated();
  return req.auth;
}
