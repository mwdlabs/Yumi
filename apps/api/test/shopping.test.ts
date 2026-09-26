import type { FamilyDto, ShoppingItemDto, ShoppingListDto } from '@yumi/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock } = ctx;

let papa: string;
let familyId: string;
const listPath = () => `/v1/families/${familyId}/shopping-list`;

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

async function addItem(body: object, auth = papa): Promise<ShoppingItemDto> {
  const res = await request(ctx.app)
    .post(`${listPath()}/items`)
    .set('Authorization', auth)
    .send({ date: '2026-09-24', quantity: null, unit: null, ...body })
    .expect(201);
  return res.body as ShoppingItemDto;
}

async function getList(date?: string, auth = papa): Promise<ShoppingListDto> {
  const res = await request(ctx.app)
    .get(listPath())
    .query(date ? { date } : {})
    .set('Authorization', auth)
    .expect(200);
  return res.body as ShoppingListDto;
}

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  papa = await loginAs(ctx, 'papa@exemple.ca');
  familyId = (await createFamily(papa)).id;
});

afterAll(async () => {
  vi.restoreAllMocks();
  await db.$disconnect();
});

describe('liste de la semaine', () => {
  it('renvoie la semaine en cours, vide', async () => {
    // Jeudi 24 septembre 2026, 15 h à Toronto.
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2026-09-24T19:00:00Z'));
    const list = await getList();
    vi.restoreAllMocks();

    expect(list).toMatchObject({
      startDate: '2026-09-21',
      endDate: '2026-09-27',
      isCurrentWeek: true,
      previousStartDate: '2026-09-14',
      nextStartDate: '2026-09-28',
      status: 'OPEN',
      items: [],
    });
    // La semaine en cours est matérialisée pour y copier les essentiels (aucun ici).
    expect(await db.week.count()).toBe(1);
  });

  it("ne crée pas de semaine passée en l'affichant", async () => {
    await getList('2020-01-06');
    expect(await db.week.count()).toBe(0);
  });

  it('ramène une date quelconque au début de sa semaine', async () => {
    const list = await getList('2026-10-01');
    expect(list.startDate).toBe('2026-09-28');
  });

  it('refuse une date invalide', async () => {
    await request(ctx.app)
      .get(listPath())
      .query({ date: '2026-02-30' })
      .set('Authorization', papa)
      .expect(400);
  });
});

describe('articles ajoutés à la main', () => {
  it('ajoute un article (avec ou sans quantité) et crée la semaine avec son échéance', async () => {
    const lait = await addItem({ name: 'Lait', quantity: 2, unit: 'L' });
    const pq = await addItem({ name: 'Papier de toilette' });

    expect(lait).toMatchObject({
      name: 'Lait',
      quantities: [{ amount: 2, unit: 'L' }],
      manual: { amount: 2, unit: 'L' },
      fromRecipes: [],
      category: 'dairy',
      checked: false,
    });
    expect(lait.addedBy?.displayName).toBe('Papa');
    expect(pq).toMatchObject({
      quantities: [{ amount: null, unit: null }],
      manual: { amount: null, unit: null },
      category: 'household',
    });

    const week = await db.week.findFirstOrThrow();
    // Semaine du lundi 21 sept. : échéance le dimanche 20 à 18 h (UTC−4).
    expect(week.deadlineAt.toISOString()).toBe('2026-09-20T22:00:00.000Z');

    const list = await getList('2026-09-21');
    expect(list.items.map((i) => i.name)).toEqual(['Lait', 'Papier de toilette']);
  });

  it('sépare les semaines', async () => {
    await addItem({ name: 'Lait' });
    await addItem({ name: 'Pain', date: '2026-09-30' });
    expect((await getList('2026-09-21')).items.map((i) => i.name)).toEqual(['Lait']);
    expect((await getList('2026-09-28')).items.map((i) => i.name)).toEqual(['Pain']);
  });

  it('refuse un doublon dans la même semaine (pluriel et casse ignorés)', async () => {
    await addItem({ name: 'Banane' });
    const res = await request(ctx.app)
      .post(`${listPath()}/items`)
      .set('Authorization', papa)
      .send({ date: '2026-09-22', name: 'BANANES', quantity: null, unit: null })
      .expect(409);
    expect(res.body.error.code).toBe('ITEM_ALREADY_IN_LIST');
  });

  it('coche et décoche en notant qui a coché ; les articles cochés passent en fin de liste', async () => {
    const lait = await addItem({ name: 'Lait' });
    await addItem({ name: 'Pain' });

    const checked = await request(ctx.app)
      .patch(`${listPath()}/items/${lait.id}`)
      .set('Authorization', papa)
      .send({ checked: true })
      .expect(200);
    expect(checked.body).toMatchObject({ checked: true, checkedBy: { displayName: 'Papa' } });
    expect((await getList('2026-09-21')).items.map((i) => i.name)).toEqual(['Pain', 'Lait']);

    const unchecked = await request(ctx.app)
      .patch(`${listPath()}/items/${lait.id}`)
      .set('Authorization', papa)
      .send({ checked: false })
      .expect(200);
    expect(unchecked.body).toMatchObject({ checked: false, checkedBy: null });
  });

  it('modifie le nom et la quantité, puis supprime', async () => {
    const item = await addItem({ name: 'Lait' });
    const res = await request(ctx.app)
      .patch(`${listPath()}/items/${item.id}`)
      .set('Authorization', papa)
      .send({ name: 'Lait 2 %', quantity: 4, unit: 'L' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Lait 2 %', quantities: [{ amount: 4, unit: 'L' }] });

    await request(ctx.app)
      .delete(`${listPath()}/items/${item.id}`)
      .set('Authorization', papa)
      .expect(204);
    expect((await getList('2026-09-21')).items).toEqual([]);
  });

  it('refuse de modifier ou supprimer un article issu des recettes', async () => {
    const item = await addItem({ name: 'Oignon' });
    // Simule un article venant uniquement des plats.
    await db.shoppingItem.update({ where: { id: item.id }, data: { isManual: false } });

    await request(ctx.app)
      .patch(`${listPath()}/items/${item.id}`)
      .set('Authorization', papa)
      .send({ name: 'Autre' })
      .expect(409);
    await request(ctx.app)
      .delete(`${listPath()}/items/${item.id}`)
      .set('Authorization', papa)
      .expect(409);
    // Le cochage reste possible.
    await request(ctx.app)
      .patch(`${listPath()}/items/${item.id}`)
      .set('Authorization', papa)
      .send({ checked: true })
      .expect(200);
  });

  it('est partagée avec la famille et invisible pour les autres familles', async () => {
    const item = await addItem({ name: 'Lait' });
    const voisin = await loginAs(ctx, 'voisin@exemple.ca');
    const autre = await createFamily(voisin, 'Famille Voisine');

    await request(ctx.app).get(listPath()).set('Authorization', voisin).expect(404);
    const foreign = `/v1/families/${autre.id}/shopping-list/items/${item.id}`;
    await request(ctx.app)
      .patch(foreign)
      .set('Authorization', voisin)
      .send({ checked: true })
      .expect(404);
    await request(ctx.app).delete(foreign).set('Authorization', voisin).expect(404);
    expect((await db.shoppingItem.findUniqueOrThrow({ where: { id: item.id } })).checkedAt).toBe(
      null,
    );
  });
});
