import type { FamilyDto, ShoppingListDto, StapleDto } from '@yumi/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock } = ctx;

// Jeudi 24 septembre 2026, 15 h à Toronto : semaine en cours = lundi 21 septembre.
const NOW = new Date('2026-09-24T19:00:00Z');
const THIS_WEEK = '2026-09-21';
const NEXT_WEEK = '2026-09-28';
const LAST_WEEK = '2026-09-14';

let papa: string;
let familyId: string;
const base = () => `/v1/families/${familyId}`;

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

async function addStaple(name: string, quantity: number | null = null, unit: string | null = null) {
  const res = await request(ctx.app)
    .post(`${base()}/staples`)
    .set('Authorization', papa)
    .send({ name, quantity, unit })
    .expect(201);
  return res.body as StapleDto;
}

async function list(date: string): Promise<ShoppingListDto> {
  const res = await request(ctx.app)
    .get(`${base()}/shopping-list`)
    .query({ date })
    .set('Authorization', papa)
    .expect(200);
  return res.body as ShoppingListDto;
}

const names = (l: ShoppingListDto) => l.items.map((i) => i.name);

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  papa = await loginAs(ctx, 'papa@exemple.ca');
  familyId = (await createFamily(papa)).id;
  vi.spyOn(clock, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('essentiels', () => {
  it('se gèrent comme une liste (ajout, modification, retrait)', async () => {
    const lait = await addStaple('Lait', 2, 'L');
    expect(lait).toMatchObject({ name: 'Lait', quantity: 2, unit: 'L', category: 'dairy' });

    const res = await request(ctx.app)
      .patch(`${base()}/staples/${lait.id}`)
      .set('Authorization', papa)
      .send({ quantity: 4, unit: 'L' })
      .expect(200);
    expect(res.body.quantity).toBe(4);

    await request(ctx.app)
      .delete(`${base()}/staples/${lait.id}`)
      .set('Authorization', papa)
      .expect(204);
    const all = await request(ctx.app)
      .get(`${base()}/staples`)
      .set('Authorization', papa)
      .expect(200);
    expect(all.body).toEqual([]);
  });

  it('refuse un doublon (pluriel et casse ignorés)', async () => {
    await addStaple('Oignon');
    const res = await request(ctx.app)
      .post(`${base()}/staples`)
      .set('Authorization', papa)
      .send({ name: 'OIGNONS', quantity: null, unit: null })
      .expect(409);
    expect(res.body.error.code).toBe('STAPLE_ALREADY_EXISTS');
  });

  it('ajoute les suggestions en lot, en ignorant celles déjà présentes', async () => {
    await addStaple('Lait');
    const res = await request(ctx.app)
      .post(`${base()}/staples/batch`)
      .set('Authorization', papa)
      .send({
        staples: [
          { name: 'Lait', quantity: null, unit: null },
          { name: 'Œufs', quantity: 12, unit: 'UNIT' },
          { name: 'Riz brisé', quantity: 5, unit: 'KG' },
        ],
      })
      .expect(201);
    expect(res.body.map((s: StapleDto) => s.name)).toEqual(['Lait', 'Œufs', 'Riz brisé']);
  });
});

describe('ajout automatique à la liste de chaque semaine', () => {
  it('copie les essentiels dans la semaine en cours et les suivantes, pas dans les passées', async () => {
    await addStaple('Lait', 2, 'L');
    await addStaple('Pain');

    const thisWeek = await list(THIS_WEEK);
    expect(names(thisWeek)).toEqual(['Lait', 'Pain']);
    expect(thisWeek.items[0]).toMatchObject({ quantity: 2, unit: 'L', isStaple: true });
    expect(names(await list(NEXT_WEEK))).toEqual(['Lait', 'Pain']);
    expect(names(await list(LAST_WEEK))).toEqual([]);
  });

  it("ne remet pas un essentiel retiré de la liste d'une semaine", async () => {
    await addStaple('Lait');
    const item = (await list(THIS_WEEK)).items[0];
    await request(ctx.app)
      .delete(`${base()}/shopping-list/items/${item?.id}`)
      .set('Authorization', papa)
      .expect(204);
    expect(names(await list(THIS_WEEK))).toEqual([]);
  });

  it('garde un article déjà ajouté à la main au lieu de le doubler', async () => {
    await request(ctx.app)
      .post(`${base()}/shopping-list/items`)
      .set('Authorization', papa)
      .send({ date: THIS_WEEK, name: 'Lait', quantity: 1, unit: 'L' })
      .expect(201);
    await addStaple('Lait', 2, 'L');

    const items = (await list(THIS_WEEK)).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ quantity: 1, isStaple: false });
  });

  it('ajoute un nouvel essentiel aux listes déjà ouvertes', async () => {
    await list(THIS_WEEK);
    await list(NEXT_WEEK);
    await addStaple('Café');
    expect(names(await list(THIS_WEEK))).toEqual(['Café']);
    expect(names(await list(NEXT_WEEK))).toEqual(['Café']);
  });

  it('reporte une modification sur les articles non cochés', async () => {
    const lait = await addStaple('Lait', 2, 'L');
    const [thisItem] = (await list(THIS_WEEK)).items;
    await list(NEXT_WEEK);
    await request(ctx.app)
      .patch(`${base()}/shopping-list/items/${thisItem?.id}`)
      .set('Authorization', papa)
      .send({ checked: true })
      .expect(200);

    await request(ctx.app)
      .patch(`${base()}/staples/${lait.id}`)
      .set('Authorization', papa)
      .send({ name: 'Lait 2 %', quantity: 4, unit: 'L' })
      .expect(200);

    // Déjà acheté cette semaine : inchangé. Semaine prochaine : mis à jour.
    expect((await list(THIS_WEEK)).items[0]).toMatchObject({ name: 'Lait', quantity: 2 });
    expect((await list(NEXT_WEEK)).items[0]).toMatchObject({ name: 'Lait 2 %', quantity: 4 });
  });

  it('retire un essentiel des semaines suivantes, en gardant la semaine en cours', async () => {
    const cafe = await addStaple('Café');
    await list(THIS_WEEK);
    await list(NEXT_WEEK);
    await request(ctx.app)
      .delete(`${base()}/staples/${cafe.id}`)
      .set('Authorization', papa)
      .expect(204);

    const thisWeek = await list(THIS_WEEK);
    expect(names(thisWeek)).toEqual(['Café']);
    expect(thisWeek.items[0]?.isStaple).toBe(false);
    expect(names(await list(NEXT_WEEK))).toEqual([]);
  });

  it('est propre à chaque famille', async () => {
    const lait = await addStaple('Lait');
    const voisin = await loginAs(ctx, 'voisin@exemple.ca');
    const autre = await createFamily(voisin, 'Famille Voisine');

    await request(ctx.app).get(`${base()}/staples`).set('Authorization', voisin).expect(404);
    await request(ctx.app)
      .delete(`/v1/families/${autre.id}/staples/${lait.id}`)
      .set('Authorization', voisin)
      .expect(404);
    const other = await request(ctx.app)
      .get(`/v1/families/${autre.id}/shopping-list`)
      .query({ date: THIS_WEEK })
      .set('Authorization', voisin)
      .expect(200);
    expect(other.body.items).toEqual([]);
  });
});
