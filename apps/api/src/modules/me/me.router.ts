import { Router } from 'express';
import { requireAuth } from '../../http/middlewares/authenticate.ts';
import type { Database } from '../../lib/prisma.ts';
import { getMe } from './me.service.ts';

export function meRouter(db: Database): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await getMe(db, requireAuth(req).userId));
  });

  return router;
}
