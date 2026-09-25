import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Member } from '../../generated/prisma/client.ts';
import type { Database } from '../../lib/prisma.ts';
import { AppError } from '../errors.ts';
import { requireAuth } from './authenticate.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Membre actif de l'appelant dans la famille ciblée par l'URL. */
      member?: Member;
    }
  }
}

/**
 * Garde d'isolation entre familles : charge le membre actif de l'appelant dans
 * la famille `:familyId`. Une famille dont l'appelant n'est pas membre répond
 * 404 (et non 403) pour ne pas révéler son existence.
 *
 * Les services reçoivent ensuite ce membre et ne filtrent QUE par son familyId,
 * jamais par un identifiant de famille venant du corps de la requête.
 */
export function requireMembership(db: Database): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { userId } = requireAuth(req);
    const familyId = req.params.familyId;
    if (typeof familyId !== 'string') throw AppError.notFound();

    const member = await db.member.findFirst({ where: { familyId, userId, active: true } });
    if (!member) throw AppError.notFound('Famille introuvable.');

    req.member = member;
    next();
  };
}

/** Retourne le membre de l'appelant ; à utiliser derrière `requireMembership`. */
export function currentMember(req: Request): Member {
  if (!req.member) throw AppError.notFound('Famille introuvable.');
  return req.member;
}

/** Retourne le membre de l'appelant s'il est admin, sinon 403. */
export function requireAdmin(req: Request): Member {
  const member = currentMember(req);
  if (member.role !== 'ADMIN') throw AppError.forbidden('Action réservée aux admins.');
  return member;
}
