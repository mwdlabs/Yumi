import { Router } from 'express';
import { requireAuth } from '../../http/middlewares/authenticate.ts';
import {
  currentMember,
  requireAdmin,
  requireMembership,
} from '../../http/middlewares/family-scope.ts';
import type { Database } from '../../lib/prisma.ts';
import type { InvitationsService } from '../invitations/invitations.service.ts';
import type { RecipesService } from '../recipes/recipes.service.ts';
import type { ShoppingService } from '../shopping/shopping.service.ts';
import type { FamiliesService } from './families.service.ts';

/** Routes /v1/families (derrière `authenticate`). */
export function familiesRouter(
  db: Database,
  families: FamiliesService,
  invitations: InvitationsService,
  recipes: RecipesService,
  shopping: ShoppingService,
): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    res.status(201).json(await families.create(requireAuth(req).userId, req.body));
  });

  // Toutes les routes suivantes exigent d'être membre actif de la famille.
  const family = Router({ mergeParams: true });
  family.use(requireMembership(db));

  family.get('/', async (req, res) => {
    const member = currentMember(req);
    res.json(await families.get(member.familyId, member.userId));
  });

  family.patch('/', async (req, res) => {
    res.json(await families.update(requireAdmin(req), req.body));
  });

  family.post('/members', async (req, res) => {
    res.status(201).json(await families.createManagedMember(requireAdmin(req), req.body));
  });

  family.patch('/members/:memberId', async (req, res) => {
    res.json(await families.updateMember(currentMember(req), req.params.memberId, req.body));
  });

  family.delete('/members/:memberId', async (req, res) => {
    await families.removeMember(currentMember(req), req.params.memberId);
    res.status(204).end();
  });

  family.get('/invitations', async (req, res) => {
    res.json(await invitations.listActive(requireAdmin(req)));
  });

  family.post('/invitations', async (req, res) => {
    res.status(201).json(await invitations.create(requireAdmin(req)));
  });

  family.delete('/invitations/:invitationId', async (req, res) => {
    await invitations.revoke(requireAdmin(req), req.params.invitationId);
    res.status(204).end();
  });

  // Livre de recettes : ouvert à tous les membres actifs.
  family.get('/recipes', async (req, res) => {
    res.json(await recipes.list(currentMember(req)));
  });

  family.post('/recipes', async (req, res) => {
    res.status(201).json(await recipes.create(currentMember(req), req.body));
  });

  family.get('/recipes/:recipeId', async (req, res) => {
    res.json(await recipes.get(currentMember(req), req.params.recipeId));
  });

  family.put('/recipes/:recipeId', async (req, res) => {
    res.json(await recipes.update(currentMember(req), req.params.recipeId, req.body));
  });

  family.delete('/recipes/:recipeId', async (req, res) => {
    await recipes.archive(currentMember(req), req.params.recipeId);
    res.status(204).end();
  });

  family.get('/ingredients', async (req, res) => {
    res.json(await recipes.familyIngredients(currentMember(req)));
  });

  // Liste de courses de la semaine : ouverte à tous les membres actifs.
  family.get('/shopping-list', async (req, res) => {
    res.json(await shopping.getList(currentMember(req), req.query));
  });

  family.post('/shopping-list/items', async (req, res) => {
    res.status(201).json(await shopping.addItem(currentMember(req), req.body));
  });

  family.patch('/shopping-list/items/:itemId', async (req, res) => {
    res.json(await shopping.updateItem(currentMember(req), req.params.itemId, req.body));
  });

  family.delete('/shopping-list/items/:itemId', async (req, res) => {
    await shopping.deleteItem(currentMember(req), req.params.itemId);
    res.status(204).end();
  });

  router.use('/:familyId', family);
  return router;
}
