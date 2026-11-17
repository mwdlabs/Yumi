import type { CreatedInvitationDto, FamilyDto, MemberDto, RecipeDto } from '@yumi/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock } = ctx;

// Jeudi 24 septembre 2026 : semaine en cours = lundi 21 septembre.
const NOW = new Date('2026-09-24T19:00:00Z');
const MONDAY = '2026-09-21';

let papa: string;
let maman: string;

const profile = (displayName: string) => ({ displayName, avatarColor: 'honey' });

async function createFamily(): Promise<FamilyDto> {
  const res = await request(ctx.app)
    .post('/v1/families')
    .set('Authorization', papa)
    .send({
      family: {
        name: 'Famille Diouf',
        timezone: 'America/Toronto',
        weekStartsOn: 1,
        deadlineWeekday: 7,
        deadlineTime: '18:00',
      },
      profile: profile('Papa'),
    })
    .expect(201);
  return res.body as FamilyDto;
}

async function addChild(familyId: string): Promise<MemberDto> {
  const res = await request(ctx.app)
    .post(`/v1/families/${familyId}/members`)
    .set('Authorization', papa)
    .send(profile('Awa'))
    .expect(201);
  return res.body as MemberDto;
}

async function addMeal(familyId: string): Promise<void> {
  const recipe = await request(ctx.app)
    .post(`/v1/families/${familyId}/recipes`)
    .set('Authorization', papa)
    .send({ name: 'Mafé', ingredients: [{ name: 'Riz blanc', quantity: 1, unit: 'KG' }] })
    .expect(201);
  await request(ctx.app)
    .post(`/v1/families/${familyId}/meals`)
    .set('Authorization', papa)
    .send({ date: MONDAY, recipeId: (recipe.body as RecipeDto).id })
    .expect(201);
}

async function joinAsMaman(familyId: string): Promise<void> {
  const invitation = await request(ctx.app)
    .post(`/v1/families/${familyId}/invitations`)
    .set('Authorization', papa)
    .expect(201);
  await request(ctx.app)
    .post('/v1/invitations/join')
    .set('Authorization', maman)
    .send({ code: (invitation.body as CreatedInvitationDto).code, profile: profile('Maman') })
    .expect(201);
}

function deleteAccount(auth: string) {
  return request(ctx.app).delete('/v1/me').set('Authorization', auth);
}

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  papa = await loginAs(ctx, 'papa@exemple.ca');
  maman = await loginAs(ctx, 'maman@exemple.ca');
  vi.spyOn(clock, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('suppression du compte', () => {
  it("supprime un compte sans famille et révoque l'accès", async () => {
    await deleteAccount(papa).expect(204);

    expect(await db.user.count({ where: { email: 'papa@exemple.ca' } })).toBe(0);
    expect(await db.emailOtp.count({ where: { email: 'papa@exemple.ca' } })).toBe(0);
    await request(ctx.app).get('/v1/me').set('Authorization', papa).expect(401);
  });

  it('supprime la famille et ses profils gérés quand aucun autre adulte ne reste', async () => {
    const family = await createFamily();
    await addChild(family.id);
    await addMeal(family.id);

    await deleteAccount(papa).expect(204);

    expect(await db.family.count()).toBe(0);
    expect(await db.recipe.count()).toBe(0);
    // Seul le compte de Maman (sans famille) subsiste.
    expect(await db.user.findMany({ select: { email: true } })).toEqual([
      { email: 'maman@exemple.ca' },
    ]);
  });

  it("garde la famille, anonymise le membre et transmet ses rôles à l'adulte restant", async () => {
    const family = await createFamily();
    await addChild(family.id);
    await joinAsMaman(family.id);
    await addMeal(family.id);

    await deleteAccount(papa).expect(204);

    const res = await request(ctx.app)
      .get(`/v1/families/${family.id}`)
      .set('Authorization', maman)
      .expect(200);
    const members = (res.body as FamilyDto).members;
    expect(members.map((m) => m.displayName).sort()).toEqual(['Awa', 'Maman']);
    expect(members.find((m) => m.displayName === 'Maman')).toMatchObject({
      role: 'ADMIN',
      isShoppingResponsible: true,
    });

    // L'historique est conservé, sans donnée personnelle.
    const former = await db.member.findFirstOrThrow({
      where: { familyId: family.id, active: false },
      include: { user: true },
    });
    expect(former.displayName).toBe('Ancien membre');
    expect(former.user.email).toBeNull();
    expect(await db.session.count({ where: { userId: former.userId } })).toBe(0);
    expect(await db.meal.count()).toBe(1);
  });

  it('exige une connexion', async () => {
    await request(ctx.app).delete('/v1/me').expect(401);
  });
});
