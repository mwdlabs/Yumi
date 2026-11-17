import type { FamilyDto, MealDto, MemberDto, RecipeDto, ShoppingListDto } from '@yumi/shared';
import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createI18n } from '../src/i18n/index.ts';
import { createLogger } from '../src/lib/logger.ts';
import type { PushMessage, PushResult, PushSender } from '../src/notifications/push-sender.ts';
import { RemindersService } from '../src/notifications/reminders.service.ts';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock, env } = ctx;

// Samedi 26 septembre 2026, 20 h à Toronto. Semaine suivante : lundi 28 septembre,
// échéance dimanche 27 à 18 h (dans moins de 24 h).
const SATURDAY_EVENING = new Date('2026-09-27T00:00:00Z');
const AFTER_DEADLINE = new Date('2026-09-27T22:30:00Z');
const NEXT_MONDAY = '2026-09-28';
const NEXT_TUESDAY = '2026-09-29';

/** Envoi mémoire : garde les messages et peut déclarer un jeton invalide. */
class InMemoryPush implements PushSender {
  readonly sent: PushMessage[] = [];
  invalidTokens = new Set<string>();

  async send(messages: readonly PushMessage[]): Promise<PushResult[]> {
    this.sent.push(...messages);
    return messages.map((m) =>
      this.invalidTokens.has(m.to)
        ? { ok: false, invalidToken: true, error: 'DeviceNotRegistered' }
        : { ok: true },
    );
  }
}

const TOKEN_PAPA = 'ExponentPushToken[papa]';
const TOKEN_MAMAN = 'ExponentPushToken[maman]';

let papa: string;
let maman: string;
let family: FamilyDto;
let push: InMemoryPush;
let reminders: RemindersService;
const base = () => `/v1/families/${family.id}`;

async function registerDevice(auth: string, token: string) {
  await request(ctx.app)
    .post('/v1/me/push-devices')
    .set('Authorization', auth)
    .send({ token, platform: 'IOS' })
    .expect(204);
}

async function createRecipe(): Promise<RecipeDto> {
  const res = await request(ctx.app)
    .post(`${base()}/recipes`)
    .set('Authorization', papa)
    .send({ name: 'Mafé', ingredients: [{ name: 'Riz blanc', quantity: 1, unit: 'KG' }] })
    .expect(201);
  return res.body as RecipeDto;
}

async function reserveDay(date: string, cookId: string): Promise<MealDto> {
  const res = await request(ctx.app)
    .post(`${base()}/meals`)
    .set('Authorization', papa)
    .send({ date, cookId })
    .expect(201);
  return res.body as MealDto;
}

async function list(): Promise<ShoppingListDto> {
  const res = await request(ctx.app)
    .get(`${base()}/shopping-list`)
    .query({ date: NEXT_MONDAY })
    .set('Authorization', papa)
    .expect(200);
  return res.body as ShoppingListDto;
}

function member(name: string): MemberDto {
  const found = family.members.find((m) => m.displayName === name);
  if (!found) throw new Error(`membre ${name} introuvable`);
  return found;
}

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  papa = await loginAs(ctx, 'papa@exemple.ca');
  maman = await loginAs(ctx, 'maman@exemple.ca');
  vi.spyOn(clock, 'now').mockReturnValue(SATURDAY_EVENING);

  const created = await request(ctx.app)
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
      profile: { displayName: 'Papa', avatarColor: 'honey' },
    })
    .expect(201);
  family = created.body as FamilyDto;
  const invitation = await request(ctx.app)
    .post(`${base()}/invitations`)
    .set('Authorization', papa)
    .expect(201);
  await request(ctx.app)
    .post('/v1/invitations/join')
    .set('Authorization', maman)
    .send({ code: invitation.body.code, profile: { displayName: 'Mariam', avatarColor: 'honey' } })
    .expect(201);
  await request(ctx.app)
    .post(`${base()}/members`)
    .set('Authorization', papa)
    .send({ displayName: 'Awa', avatarColor: 'honey' })
    .expect(201);
  family = (await request(ctx.app).get(base()).set('Authorization', papa).expect(200))
    .body as FamilyDto;

  push = new InMemoryPush();
  reminders = new RemindersService({
    db,
    push,
    clock,
    t: createI18n(),
    logger: createLogger({ ...env, LOG_LEVEL: 'silent' }),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('jour réservé, plat à choisir', () => {
  it("n'ajoute rien à la liste tant que le plat n'est pas choisi", async () => {
    const meal = await reserveDay(NEXT_MONDAY, member('Mariam').id);
    expect(meal.recipe).toBeNull();
    expect((await list()).items).toHaveLength(0);

    const recipe = await createRecipe();
    await request(ctx.app)
      .patch(`${base()}/meals/${meal.id}`)
      .set('Authorization', maman)
      .send({ recipeId: recipe.id })
      .expect(200);
    expect((await list()).items.map((i) => i.name)).toEqual(['Riz blanc']);
  });
});

describe('appareils', () => {
  it('enregistre, réattribue et retire un jeton', async () => {
    await registerDevice(papa, TOKEN_PAPA);
    await registerDevice(maman, TOKEN_PAPA); // même téléphone, autre compte
    const device = await db.pushDevice.findUniqueOrThrow({ where: { token: TOKEN_PAPA } });
    const mamanUser = await db.user.findUniqueOrThrow({ where: { email: 'maman@exemple.ca' } });
    expect(device.userId).toBe(mamanUser.id);

    await request(ctx.app)
      .delete('/v1/me/push-devices')
      .set('Authorization', maman)
      .send({ token: TOKEN_PAPA })
      .expect(204);
    expect(await db.pushDevice.count()).toBe(0);
  });

  it('refuse un jeton mal formé', async () => {
    await request(ctx.app)
      .post('/v1/me/push-devices')
      .set('Authorization', papa)
      .send({ token: 'pas-un-jeton', platform: 'IOS' })
      .expect(400);
  });
});

describe('rappel « choisis ton plat »', () => {
  it('prévient le cuisinier 24 h avant l’échéance, une seule fois', async () => {
    await registerDevice(maman, TOKEN_MAMAN);
    const meal = await reserveDay(NEXT_MONDAY, member('Mariam').id);

    await reminders.run();
    await reminders.run();

    expect(push.sent).toHaveLength(1);
    expect(push.sent[0]).toMatchObject({
      to: TOKEN_MAMAN,
      title: 'Ton plat de lundi 28 septembre',
      data: { url: `/choisir?date=${NEXT_MONDAY}&mealId=${meal.id}` },
    });
    expect(push.sent[0]?.body).toContain('dimanche 18 h 00');
  });

  it("prévient les admins pour le plat d'un enfant, et pas pour un plat déjà choisi", async () => {
    await registerDevice(papa, TOKEN_PAPA);
    await registerDevice(maman, TOKEN_MAMAN);
    await reserveDay(NEXT_MONDAY, member('Awa').id);
    const recipe = await createRecipe();
    await request(ctx.app)
      .post(`${base()}/meals`)
      .set('Authorization', maman)
      .send({ date: NEXT_TUESDAY, recipeId: recipe.id })
      .expect(201);

    await reminders.run();

    expect(push.sent.map((m) => [m.to, m.title])).toEqual([[TOKEN_PAPA, 'Plat de Awa à choisir']]);
  });

  it("n'envoie rien plus de 24 h avant l'échéance", async () => {
    await registerDevice(maman, TOKEN_MAMAN);
    vi.spyOn(clock, 'now').mockReturnValue(new Date('2026-09-26T12:00:00Z'));
    await reserveDay(NEXT_MONDAY, member('Mariam').id);

    await reminders.run();
    expect(push.sent).toHaveLength(0);
  });
});

describe('« liste prête »', () => {
  it("prévient le responsable des courses à l'échéance et oublie les jetons invalides", async () => {
    await registerDevice(papa, TOKEN_PAPA);
    await registerDevice(maman, TOKEN_MAMAN);
    const recipe = await createRecipe();
    await request(ctx.app)
      .post(`${base()}/meals`)
      .set('Authorization', papa)
      .send({ date: NEXT_MONDAY, recipeId: recipe.id })
      .expect(201);
    push.invalidTokens.add(TOKEN_PAPA);

    vi.spyOn(clock, 'now').mockReturnValue(AFTER_DEADLINE);
    await reminders.run();
    await reminders.run();

    // Papa (créateur) est le responsable des courses ; Mariam ne reçoit rien.
    expect(push.sent.map((m) => [m.to, m.body])).toEqual([
      [TOKEN_PAPA, '1 article à acheter cette semaine. Bonnes courses !'],
    ]);
    const device = await db.pushDevice.findUniqueOrThrow({ where: { token: TOKEN_PAPA } });
    expect(device.disabledAt).not.toBeNull();
  });
});
