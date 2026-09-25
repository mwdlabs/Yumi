import type { FamilyDto, RecipeDto } from '@yumi/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock } = ctx;

let parent: string;
let familyId: string;
const recipesPath = () => `/v1/families/${familyId}/recipes`;

const yassa = {
  name: 'Yassa poulet',
  servings: 6,
  ingredients: [
    { name: 'Cuisses de poulet', quantity: 2, unit: 'KG' },
    { name: 'Oignon', quantity: 8, unit: 'UNIT' },
    { name: 'Moutarde', quantity: 3, unit: 'TBSP' },
    { name: 'Sel', quantity: null, unit: null },
  ],
};

async function createFamily(auth: string, name = 'Famille Diouf'): Promise<FamilyDto> {
  const res = await request(ctx.app)
    .post('/v1/families')
    .set('Authorization', auth)
    .send({
      family: {
        name,
        timezone: 'America/Toronto',
        weekStartsOn: 1,
        deadlineWeekday: 7,
        deadlineTime: '18:00',
      },
      profile: { displayName: 'Papa', avatarColor: 'honey' },
    })
    .expect(201);
  return res.body as FamilyDto;
}

async function createRecipe(body: object = yassa, auth = parent): Promise<RecipeDto> {
  const res = await request(ctx.app)
    .post(recipesPath())
    .set('Authorization', auth)
    .send(body)
    .expect(201);
  return res.body as RecipeDto;
}

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  parent = await loginAs(ctx, 'papa@exemple.ca');
  familyId = (await createFamily(parent)).id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe('recettes', () => {
  it("crée une recette avec ses ingrédients, dans l'ordre saisi", async () => {
    const recipe = await createRecipe();
    expect(recipe).toMatchObject({ name: 'Yassa poulet', servings: 6 });
    expect(recipe.createdBy.displayName).toBe('Papa');
    expect(recipe.ingredients.map((i) => [i.name, i.quantity, i.unit])).toEqual([
      ['Cuisses de poulet', 2, 'KG'],
      ['Oignon', 8, 'UNIT'],
      ['Moutarde', 3, 'TBSP'],
      ['Sel', null, null],
    ]);

    const list = await request(ctx.app).get(recipesPath()).set('Authorization', parent).expect(200);
    expect(list.body).toEqual([
      expect.objectContaining({ id: recipe.id, name: 'Yassa poulet', ingredientCount: 4 }),
    ]);
  });

  it('conserve les quantités décimales', async () => {
    const recipe = await createRecipe({
      name: 'Mafé',
      ingredients: [{ name: 'Riz blanc', quantity: 0.75, unit: 'KG' }],
    });
    expect(recipe.ingredients[0]?.quantity).toBe(0.75);
  });

  it('refuse un doublon de nom (casse et accents ignorés)', async () => {
    await createRecipe({ name: 'Thiéboudienne', ingredients: [] });
    const res = await request(ctx.app)
      .post(recipesPath())
      .set('Authorization', parent)
      .send({ name: '  thieboudienne ', ingredients: [] })
      .expect(409);
    expect(res.body.error.code).toBe('RECIPE_NAME_TAKEN');
  });

  it('remplace la recette et ses ingrédients à la modification', async () => {
    const recipe = await createRecipe();
    const res = await request(ctx.app)
      .put(`${recipesPath()}/${recipe.id}`)
      .set('Authorization', parent)
      .send({
        name: 'Yassa poulet de mamie',
        servings: 8,
        ingredients: [{ name: 'Citron', quantity: 5, unit: 'UNIT' }],
      })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Yassa poulet de mamie', servings: 8 });
    expect(res.body.ingredients).toHaveLength(1);
    expect(await db.recipeIngredient.count()).toBe(1);
  });

  it('garde son propre nom lors d’une modification', async () => {
    const recipe = await createRecipe();
    await request(ctx.app)
      .put(`${recipesPath()}/${recipe.id}`)
      .set('Authorization', parent)
      .send({ ...yassa, servings: 4 })
      .expect(200);
  });

  it('archive une recette : elle disparaît de la liste et son nom se libère', async () => {
    const recipe = await createRecipe();
    await request(ctx.app)
      .delete(`${recipesPath()}/${recipe.id}`)
      .set('Authorization', parent)
      .expect(204);
    const list = await request(ctx.app).get(recipesPath()).set('Authorization', parent).expect(200);
    expect(list.body).toEqual([]);
    await request(ctx.app)
      .get(`${recipesPath()}/${recipe.id}`)
      .set('Authorization', parent)
      .expect(404);
    await createRecipe();
  });

  it('valide les ingrédients', async () => {
    const res = await request(ctx.app)
      .post(recipesPath())
      .set('Authorization', parent)
      .send({ name: 'X', ingredients: [{ name: 'Riz', quantity: 1, unit: null }] })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('est partagée avec toute la famille', async () => {
    const recipe = await createRecipe();
    const invite = await request(ctx.app)
      .post(`/v1/families/${familyId}/invitations`)
      .set('Authorization', parent)
      .expect(201);
    const maman = await loginAs(ctx, 'maman@exemple.ca');
    await request(ctx.app)
      .post('/v1/invitations/join')
      .set('Authorization', maman)
      .send({ code: invite.body.code, profile: { displayName: 'Maman', avatarColor: 'plum' } })
      .expect(201);

    await request(ctx.app)
      .put(`${recipesPath()}/${recipe.id}`)
      .set('Authorization', maman)
      .send({ ...yassa, servings: 10 })
      .expect(200);
  });

  it('est invisible et intouchable pour une autre famille', async () => {
    const recipe = await createRecipe();
    const voisin = await loginAs(ctx, 'voisin@exemple.ca');
    const autre = await createFamily(voisin, 'Famille Voisine');

    await request(ctx.app).get(recipesPath()).set('Authorization', voisin).expect(404);
    // Même via sa propre famille, la recette d'une autre famille est introuvable.
    const own = `/v1/families/${autre.id}/recipes/${recipe.id}`;
    await request(ctx.app).get(own).set('Authorization', voisin).expect(404);
    await request(ctx.app).put(own).set('Authorization', voisin).send(yassa).expect(404);
    await request(ctx.app).delete(own).set('Authorization', voisin).expect(404);
    expect((await db.recipe.findUniqueOrThrow({ where: { id: recipe.id } })).archivedAt).toBeNull();
  });
});

describe('ingrédients de la famille', () => {
  it('regroupe les ingrédients utilisés (pluriels et casse confondus), par fréquence', async () => {
    await createRecipe();
    await createRecipe({
      name: 'Thiou',
      ingredients: [
        { name: 'oignons', quantity: 3, unit: 'UNIT' },
        { name: 'Carotte', quantity: 3, unit: 'UNIT' },
      ],
    });

    const res = await request(ctx.app)
      .get(`/v1/families/${familyId}/ingredients`)
      .set('Authorization', parent)
      .expect(200);
    expect(res.body[0]).toMatchObject({ recipeCount: 2, unit: 'UNIT' });
    expect(res.body[0].name.toLowerCase()).toMatch(/^oignons?$/);
    expect(res.body).toHaveLength(5);
  });
});
