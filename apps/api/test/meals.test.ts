import type {
  FamilyDto,
  MealDto,
  RecipeDto,
  ShoppingItemDto,
  ShoppingListDto,
  WeekPlanDto,
} from '@yumi/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock } = ctx;

// Jeudi 24 septembre 2026, 15 h à Toronto : semaine en cours = lundi 21 septembre.
const NOW = new Date('2026-09-24T19:00:00Z');
const MONDAY = '2026-09-21';
const TUESDAY = '2026-09-22';
const NEXT_MONDAY = '2026-09-28';
const LAST_MONDAY = '2026-09-14';

let papa: string;
let family: FamilyDto;
const base = () => `/v1/families/${family.id}`;

const yassa = {
  name: 'Yassa poulet',
  ingredients: [
    { name: 'Cuisses de poulet', quantity: 2, unit: 'KG' },
    { name: 'Oignon', quantity: 8, unit: 'UNIT' },
    { name: 'Riz blanc', quantity: 500, unit: 'G' },
    { name: 'Sel', quantity: null, unit: null },
  ],
};
const mafe = {
  name: 'Mafé',
  ingredients: [
    { name: 'oignons', quantity: 3, unit: 'UNIT' },
    { name: 'Riz blanc', quantity: 1, unit: 'KG' },
    { name: "Pâte d'arachide", quantity: 400, unit: 'G' },
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

async function createRecipe(body: object): Promise<RecipeDto> {
  const res = await request(ctx.app)
    .post(`${base()}/recipes`)
    .set('Authorization', papa)
    .send(body)
    .expect(201);
  return res.body as RecipeDto;
}

async function addMeal(date: string, recipeId: string, cookId?: string): Promise<MealDto> {
  const res = await request(ctx.app)
    .post(`${base()}/meals`)
    .set('Authorization', papa)
    .send({ date, recipeId, ...(cookId ? { cookId } : {}) })
    .expect(201);
  return res.body as MealDto;
}

async function list(date = MONDAY): Promise<ShoppingListDto> {
  const res = await request(ctx.app)
    .get(`${base()}/shopping-list`)
    .query({ date })
    .set('Authorization', papa)
    .expect(200);
  return res.body as ShoppingListDto;
}

async function item(name: string, date = MONDAY): Promise<ShoppingItemDto | undefined> {
  return (await list(date)).items.find((i) => i.name.toLowerCase().startsWith(name.toLowerCase()));
}

async function check(itemId: string, checked = true) {
  await request(ctx.app)
    .patch(`${base()}/shopping-list/items/${itemId}`)
    .set('Authorization', papa)
    .send({ checked })
    .expect(200);
}

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  papa = await loginAs(ctx, 'papa@exemple.ca');
  family = await createFamily(papa);
  vi.spyOn(clock, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('semaine', () => {
  it('présente les 7 jours de la semaine, avec les plats prévus', async () => {
    const recipe = await createRecipe(yassa);
    await addMeal(TUESDAY, recipe.id);

    const res = await request(ctx.app).get(`${base()}/week`).set('Authorization', papa).expect(200);
    const week = res.body as WeekPlanDto;
    expect(week).toMatchObject({ startDate: MONDAY, endDate: '2026-09-27', isCurrentWeek: true });
    expect(week.days.map((d) => d.date)).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
    expect(week.days[1]?.meal).toMatchObject({
      date: TUESDAY,
      recipe: { name: 'Yassa poulet' },
      cook: { displayName: 'Papa', avatarColor: 'honey' },
    });
    expect(week.days.filter((d) => d.meal)).toHaveLength(1);
  });

  it('refuse un deuxième plat le même jour', async () => {
    const a = await createRecipe(yassa);
    const b = await createRecipe(mafe);
    await addMeal(MONDAY, a.id);
    const res = await request(ctx.app)
      .post(`${base()}/meals`)
      .set('Authorization', papa)
      .send({ date: MONDAY, recipeId: b.id })
      .expect(409);
    expect(res.body.error.code).toBe('DAY_TAKEN');
  });
});

describe('les ingrédients du plat arrivent directement dans la liste', () => {
  it('ajoute les ingrédients, avec le plat d’origine', async () => {
    const recipe = await createRecipe(yassa);
    await addMeal(TUESDAY, recipe.id);

    const items = (await list()).items;
    expect(items.map((i) => i.name)).toEqual(['Cuisses de poulet', 'Oignon', 'Riz blanc', 'Sel']);
    expect(items[0]).toMatchObject({
      quantities: [{ amount: 2, unit: 'KG' }],
      manual: null,
      fromRecipes: [{ recipeName: 'Yassa poulet', date: TUESDAY }],
      category: 'meat',
      checked: false,
    });
    expect(items[3]?.quantities).toEqual([{ amount: null, unit: null }]);
  });

  it('fusionne les ingrédients communs à plusieurs plats (pluriel et unités)', async () => {
    const a = await createRecipe(yassa);
    const b = await createRecipe(mafe);
    await addMeal(MONDAY, a.id);
    await addMeal(TUESDAY, b.id);

    const oignon = await item('oignon');
    expect(oignon?.quantities).toEqual([{ amount: 11, unit: 'UNIT' }]);
    expect(oignon?.fromRecipes.map((r) => r.recipeName)).toEqual(['Yassa poulet', 'Mafé']);
    // 500 g + 1 kg = 1,5 kg
    expect((await item('riz'))?.quantities).toEqual([{ amount: 1.5, unit: 'KG' }]);
  });

  it('retire les ingrédients d’un plat enlevé et réduit les quantités communes', async () => {
    const a = await createRecipe(yassa);
    const b = await createRecipe(mafe);
    const meal = await addMeal(MONDAY, a.id);
    await addMeal(TUESDAY, b.id);

    await request(ctx.app)
      .delete(`${base()}/meals/${meal.id}`)
      .set('Authorization', papa)
      .expect(204);

    const names = (await list()).items.map((i) => i.name);
    expect(names).not.toContain('Cuisses de poulet');
    expect((await item('oignon'))?.quantities).toEqual([{ amount: 3, unit: 'UNIT' }]);
  });

  it('déplace les ingrédients quand le plat change de semaine', async () => {
    const recipe = await createRecipe(yassa);
    const meal = await addMeal(TUESDAY, recipe.id);
    await request(ctx.app)
      .patch(`${base()}/meals/${meal.id}`)
      .set('Authorization', papa)
      .send({ date: NEXT_MONDAY })
      .expect(200);

    expect((await list(MONDAY)).items).toEqual([]);
    expect((await list(NEXT_MONDAY)).items.map((i) => i.name)).toContain('Oignon');
  });

  it('met à jour la liste quand on remplace le plat du jour', async () => {
    const a = await createRecipe(yassa);
    const b = await createRecipe(mafe);
    const meal = await addMeal(MONDAY, a.id);
    await request(ctx.app)
      .patch(`${base()}/meals/${meal.id}`)
      .set('Authorization', papa)
      .send({ recipeId: b.id })
      .expect(200);

    const names = (await list()).items.map((i) => i.name);
    expect(names).toContain("Pâte d'arachide");
    expect(names).not.toContain('Cuisses de poulet');
  });

  it('suit les modifications de la recette pour la semaine en cours, pas les semaines passées', async () => {
    const recipe = await createRecipe(yassa);
    await addMeal(TUESDAY, recipe.id);
    await addMeal(LAST_MONDAY, recipe.id);

    await request(ctx.app)
      .put(`${base()}/recipes/${recipe.id}`)
      .set('Authorization', papa)
      .send({ ...yassa, ingredients: [{ name: 'Oignon', quantity: 10, unit: 'UNIT' }] })
      .expect(200);

    expect((await list(MONDAY)).items.map((i) => [i.name, i.quantities])).toEqual([
      ['Oignon', [{ amount: 10, unit: 'UNIT' }]],
    ]);
    expect((await list(LAST_MONDAY)).items).toHaveLength(4);
  });
});

describe('articles déjà cochés et ajouts à la main', () => {
  it('décoche un article acheté quand un nouveau plat en demande plus', async () => {
    const a = await createRecipe(yassa);
    const b = await createRecipe(mafe);
    await addMeal(MONDAY, a.id);
    const oignon = await item('oignon');
    await check(oignon?.id ?? '');

    await addMeal(TUESDAY, b.id);
    expect(await item('oignon')).toMatchObject({
      checked: false,
      change: 'INCREASED',
      quantities: [{ amount: 11, unit: 'UNIT' }],
    });
  });

  it('garde coché un article dont la quantité ne change pas', async () => {
    const a = await createRecipe(yassa);
    const b = await createRecipe({ name: 'Poulet rôti', ingredients: [] });
    await addMeal(MONDAY, a.id);
    const oignon = await item('oignon');
    await check(oignon?.id ?? '');

    await addMeal(TUESDAY, b.id);
    expect(await item('oignon')).toMatchObject({ checked: true, change: null });
  });

  it('garde un article déjà acheté dont plus aucun plat n’a besoin', async () => {
    const recipe = await createRecipe(yassa);
    const meal = await addMeal(MONDAY, recipe.id);
    const poulet = await item('cuisses');
    await check(poulet?.id ?? '');

    await request(ctx.app)
      .delete(`${base()}/meals/${meal.id}`)
      .set('Authorization', papa)
      .expect(204);
    const names = (await list()).items.map((i) => i.name);
    expect(names).toEqual(['Cuisses de poulet']);
    expect(await item('cuisses')).toMatchObject({ checked: true, change: 'NO_LONGER_NEEDED' });
  });

  it('additionne sur une seule ligne un article ajouté à la main et demandé par un plat', async () => {
    await request(ctx.app)
      .post(`${base()}/shopping-list/items`)
      .set('Authorization', papa)
      .send({ date: MONDAY, name: 'Oignons', quantity: 2, unit: 'UNIT' })
      .expect(201);
    const recipe = await createRecipe(yassa);
    const meal = await addMeal(TUESDAY, recipe.id);

    expect(await item('oignon')).toMatchObject({
      quantities: [{ amount: 10, unit: 'UNIT' }],
      manual: { amount: 2, unit: 'UNIT' },
      fromRecipes: [{ recipeName: 'Yassa poulet' }],
    });

    // Le plat retiré, la part ajoutée à la main reste.
    await request(ctx.app)
      .delete(`${base()}/meals/${meal.id}`)
      .set('Authorization', papa)
      .expect(204);
    expect(await item('oignon')).toMatchObject({
      quantities: [{ amount: 2, unit: 'UNIT' }],
      fromRecipes: [],
    });
  });

  it('ajouter à la main un article déjà demandé par un plat complète la même ligne', async () => {
    const recipe = await createRecipe(yassa);
    await addMeal(TUESDAY, recipe.id);
    await request(ctx.app)
      .post(`${base()}/shopping-list/items`)
      .set('Authorization', papa)
      .send({ date: MONDAY, name: 'oignon', quantity: 4, unit: 'UNIT' })
      .expect(201);

    const oignons = (await list()).items.filter((i) => i.name.toLowerCase().startsWith('oignon'));
    expect(oignons).toHaveLength(1);
    expect(oignons[0]?.quantities).toEqual([{ amount: 12, unit: 'UNIT' }]);
  });

  it('un essentiel et un plat partagent la même ligne', async () => {
    await request(ctx.app)
      .post(`${base()}/staples`)
      .set('Authorization', papa)
      .send({ name: 'Oignon', quantity: 5, unit: 'UNIT' })
      .expect(201);
    const recipe = await createRecipe(yassa);
    await addMeal(TUESDAY, recipe.id);

    expect(await item('oignon')).toMatchObject({
      isStaple: true,
      quantities: [{ amount: 13, unit: 'UNIT' }],
    });
  });
});

describe('cuisinier et isolation', () => {
  it('permet de choisir un autre membre, y compris un profil enfant, comme cuisinier', async () => {
    const child = await request(ctx.app)
      .post(`${base()}/members`)
      .set('Authorization', papa)
      .send({ displayName: 'Awa', avatarColor: 'plum' })
      .expect(201);
    const recipe = await createRecipe(yassa);
    const meal = await addMeal(MONDAY, recipe.id, child.body.id);
    expect(meal.cook.displayName).toBe('Awa');
  });

  it("refuse la recette ou le cuisinier d'une autre famille, et cache la semaine", async () => {
    const voisin = await loginAs(ctx, 'voisin@exemple.ca');
    const autre = await createFamily(voisin, 'Famille Voisine');
    const theirRecipe = await request(ctx.app)
      .post(`/v1/families/${autre.id}/recipes`)
      .set('Authorization', voisin)
      .send(mafe)
      .expect(201);

    await request(ctx.app)
      .post(`${base()}/meals`)
      .set('Authorization', papa)
      .send({ date: MONDAY, recipeId: theirRecipe.body.id })
      .expect(404);

    const recipe = await createRecipe(yassa);
    await request(ctx.app)
      .post(`${base()}/meals`)
      .set('Authorization', papa)
      .send({ date: MONDAY, recipeId: recipe.id, cookId: autre.members[0]?.id })
      .expect(404);

    const meal = await addMeal(MONDAY, recipe.id);
    await request(ctx.app).get(`${base()}/week`).set('Authorization', voisin).expect(404);
    await request(ctx.app)
      .delete(`/v1/families/${autre.id}/meals/${meal.id}`)
      .set('Authorization', voisin)
      .expect(404);
  });
});
