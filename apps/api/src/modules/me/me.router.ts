import { Router } from 'express';
import type { TFunction } from 'i18next';
import { requireAuth } from '../../http/middlewares/authenticate.ts';
import type { Database } from '../../lib/prisma.ts';
import { deleteAccount } from './account-deletion.ts';
import { getMe } from './me.service.ts';

export function meRouter(db: Database, t: TFunction): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await getMe(db, requireAuth(req).userId));
  });

  router.delete('/', async (req, res) => {
    await deleteAccount(db, t, requireAuth(req).userId);
    res.status(204).end();
  });

  return router;
}
