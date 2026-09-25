import { Router } from 'express';
import { requireAuth } from '../../http/middlewares/authenticate.ts';
import { createRateLimit, type RateLimitStoreFactory } from '../../http/middlewares/rate-limit.ts';
import type { InvitationsService } from './invitations.service.ts';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Routes /v1/invitations (derrière `authenticate`). */
export function invitationsRouter(
  invitations: InvitationsService,
  storeFactory?: RateLimitStoreFactory,
): Router {
  const router = Router();

  // Protection contre l'essai systématique des codes (10^6 combinaisons) :
  // limite par utilisateur ET par IP, commune à l'aperçu et à l'adhésion.
  router.use(
    createRateLimit({
      name: 'invite-user',
      windowMs: FIFTEEN_MINUTES,
      limit: 10,
      storeFactory,
      byUser: true,
    }),
    createRateLimit({ name: 'invite-ip', windowMs: FIFTEEN_MINUTES, limit: 30, storeFactory }),
  );

  router.post('/preview', async (req, res) => {
    res.json(await invitations.preview(req.body));
  });

  router.post('/join', async (req, res) => {
    res.status(201).json(await invitations.join(requireAuth(req).userId, req.body));
  });

  return router;
}
