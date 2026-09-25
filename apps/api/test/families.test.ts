import type { CreatedInvitationDto, FamilyDto, MemberDto } from '@yumi/shared';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, loginAs, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { db, clock } = ctx;

const familySettings = {
  name: 'Famille Tremblay',
  timezone: 'America/Toronto',
  weekStartsOn: 1,
  deadlineWeekday: 7,
  deadlineTime: '18:00',
};
const profile = (displayName: string) => ({ displayName, avatarColor: 'honey' });

let parent: string; // admin et créateur
let other: string; // utilisateur sans famille

async function createFamily(auth = parent): Promise<FamilyDto> {
  const res = await request(ctx.app)
    .post('/v1/families')
    .set('Authorization', auth)
    .send({ family: familySettings, profile: profile('Maman') })
    .expect(201);
  return res.body as FamilyDto;
}

async function invite(familyId: string, auth = parent): Promise<CreatedInvitationDto> {
  const res = await request(ctx.app)
    .post(`/v1/families/${familyId}/invitations`)
    .set('Authorization', auth)
    .expect(201);
  return res.body as CreatedInvitationDto;
}

function join(code: string, auth: string, name = 'Léo') {
  return request(ctx.app)
    .post('/v1/invitations/join')
    .set('Authorization', auth)
    .send({ code, profile: profile(name) });
}

function me(family: FamilyDto): MemberDto {
  const member = family.members.find((m) => m.isMe);
  if (!member) throw new Error('membre courant introuvable');
  return member;
}

beforeEach(async () => {
  ctx.resetApp();
  await resetDatabase(db);
  clock.advance(60 * 60 * 1000);
  parent = await loginAs(ctx, 'parent@exemple.ca');
  other = await loginAs(ctx, 'ado@exemple.ca');
});

afterAll(async () => {
  await db.$disconnect();
});

describe('création de famille', () => {
  it('fait du créateur un admin et le responsable des courses', async () => {
    const family = await createFamily();
    expect(family.name).toBe('Famille Tremblay');
    expect(family.members).toHaveLength(1);
    expect(me(family)).toMatchObject({
      displayName: 'Maman',
      role: 'ADMIN',
      isShoppingResponsible: true,
      isManaged: false,
    });

    const res = await request(ctx.app).get('/v1/me').set('Authorization', parent).expect(200);
    expect(res.body.memberships).toEqual([
      expect.objectContaining({ familyId: family.id, familyName: 'Famille Tremblay' }),
    ]);
  });

  it('refuse un fuseau horaire inconnu', async () => {
    const res = await request(ctx.app)
      .post('/v1/families')
      .set('Authorization', parent)
      .send({ family: { ...familySettings, timezone: 'Mars/Olympus' }, profile: profile('A') })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('exige une connexion', async () => {
    await request(ctx.app).post('/v1/families').send({}).expect(401);
  });
});

describe('isolation entre familles', () => {
  it("répond 404 à un non-membre, pour toutes les routes d'une famille", async () => {
    const family = await createFamily();
    const base = `/v1/families/${family.id}`;

    await request(ctx.app).get(base).set('Authorization', other).expect(404);
    await request(ctx.app).patch(base).set('Authorization', other).send({ name: 'X' }).expect(404);
    await request(ctx.app).post(`${base}/invitations`).set('Authorization', other).expect(404);
    await request(ctx.app)
      .post(`${base}/members`)
      .set('Authorization', other)
      .send(profile('Intrus'))
      .expect(404);
    await request(ctx.app)
      .delete(`${base}/members/${me(family).id}`)
      .set('Authorization', other)
      .expect(404);
  });

  it("ne permet pas de modifier le membre d'une autre famille via sa propre famille", async () => {
    const tremblay = await createFamily();
    const gagnon = await createFamily(other);
    const res = await request(ctx.app)
      .patch(`/v1/families/${gagnon.id}/members/${me(tremblay).id}`)
      .set('Authorization', other)
      .send({ displayName: 'Piraté' })
      .expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('invitations', () => {
  it('permet de rejoindre une famille avec un code, réutilisable par plusieurs personnes', async () => {
    const family = await createFamily();
    const invitation = await invite(family.id);
    expect(invitation.code).toMatch(/^\d{6}$/);

    const preview = await request(ctx.app)
      .post('/v1/invitations/preview')
      .set('Authorization', other)
      .send({ code: invitation.code })
      .expect(200);
    expect(preview.body).toEqual({ familyName: 'Famille Tremblay', memberCount: 1 });

    const joined = (await join(invitation.code, other).expect(201)).body as FamilyDto;
    expect(joined.members).toHaveLength(2);
    expect(me(joined)).toMatchObject({ role: 'MEMBER', isShoppingResponsible: false });

    const third = await loginAs(ctx, 'papa@exemple.ca');
    await join(invitation.code, third, 'Papa').expect(201);

    const list = await request(ctx.app)
      .get(`/v1/families/${family.id}/invitations`)
      .set('Authorization', parent)
      .expect(200);
    expect(list.body).toEqual([expect.objectContaining({ id: invitation.id, useCount: 2 })]);
    expect(list.body[0]).not.toHaveProperty('code');
  });

  it('refuse un membre déjà présent', async () => {
    const family = await createFamily();
    const { code } = await invite(family.id);
    await join(code, other).expect(201);
    const res = await join(code, other).expect(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('refuse un code expiré', async () => {
    const family = await createFamily();
    const { code } = await invite(family.id);
    clock.advance(49 * 60 * 60 * 1000);
    const res = await join(code, other).expect(410);
    expect(res.body.error.code).toBe('INVITATION_EXPIRED');
  });

  it('refuse un code révoqué ou inconnu', async () => {
    const family = await createFamily();
    const invitation = await invite(family.id);
    await request(ctx.app)
      .delete(`/v1/families/${family.id}/invitations/${invitation.id}`)
      .set('Authorization', parent)
      .expect(204);

    const res = await join(invitation.code, other).expect(404);
    expect(res.body.error.code).toBe('INVITATION_INVALID');
    const unknown = invitation.code === '000000' ? '111111' : '000000';
    await join(unknown, other).expect(404);
  });

  it('réserve la création de codes aux admins', async () => {
    const family = await createFamily();
    const { code } = await invite(family.id);
    await join(code, other).expect(201);
    const res = await request(ctx.app)
      .post(`/v1/families/${family.id}/invitations`)
      .set('Authorization', other)
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('limite les essais de codes par utilisateur', async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await join(String(100000 + i), other)).status;
    }
    expect(last).toBe(429);
  });
});

describe('membres', () => {
  async function familyWithMember() {
    const family = await createFamily();
    const { code } = await invite(family.id);
    const joined = (await join(code, other).expect(201)).body as FamilyDto;
    return { family, admin: me(family), member: me(joined) };
  }

  it('permet à un membre de modifier son propre profil, pas celui des autres', async () => {
    const { family, admin, member } = await familyWithMember();
    const base = `/v1/families/${family.id}/members`;

    const res = await request(ctx.app)
      .patch(`${base}/${member.id}`)
      .set('Authorization', other)
      .send({ displayName: 'Léonard', avatarEmoji: '🦊' })
      .expect(200);
    expect(res.body).toMatchObject({ displayName: 'Léonard', avatarEmoji: '🦊', isMe: true });

    await request(ctx.app)
      .patch(`${base}/${admin.id}`)
      .set('Authorization', other)
      .send({ displayName: 'X' })
      .expect(403);
    await request(ctx.app)
      .patch(`${base}/${member.id}`)
      .set('Authorization', other)
      .send({ role: 'ADMIN' })
      .expect(403);
  });

  it("n'efface pas l'emoji lors d'une modification partielle", async () => {
    const { family, member } = await familyWithMember();
    const base = `/v1/families/${family.id}/members/${member.id}`;
    await request(ctx.app).patch(base).set('Authorization', other).send({ avatarEmoji: '🐼' });
    const res = await request(ctx.app)
      .patch(base)
      .set('Authorization', other)
      .send({ displayName: 'Léo' })
      .expect(200);
    expect(res.body.avatarEmoji).toBe('🐼');
  });

  it('crée un profil géré (enfant sans courriel) qui ne peut pas être admin', async () => {
    const family = await createFamily();
    const base = `/v1/families/${family.id}/members`;

    const child = await request(ctx.app)
      .post(base)
      .set('Authorization', parent)
      .send({ displayName: 'Zoé', avatarColor: 'plum', avatarEmoji: '🐸' })
      .expect(201);
    expect(child.body).toMatchObject({ displayName: 'Zoé', isManaged: true, role: 'MEMBER' });

    const res = await request(ctx.app)
      .patch(`${base}/${child.body.id}`)
      .set('Authorization', parent)
      .send({ role: 'ADMIN' })
      .expect(409);
    expect(res.body.error.code).toBe('MANAGED_MEMBER_CANNOT_BE_ADMIN');

    await request(ctx.app)
      .patch(`${base}/${child.body.id}`)
      .set('Authorization', parent)
      .send({ isShoppingResponsible: true })
      .expect(200);
  });

  it('garde toujours au moins un admin et un responsable des courses', async () => {
    const { family, admin, member } = await familyWithMember();
    const base = `/v1/families/${family.id}/members`;

    const demote = await request(ctx.app)
      .patch(`${base}/${admin.id}`)
      .set('Authorization', parent)
      .send({ role: 'MEMBER' })
      .expect(409);
    expect(demote.body.error.code).toBe('LAST_ADMIN');

    const noShopper = await request(ctx.app)
      .patch(`${base}/${admin.id}`)
      .set('Authorization', parent)
      .send({ isShoppingResponsible: false })
      .expect(409);
    expect(noShopper.body.error.code).toBe('LAST_SHOPPING_RESPONSIBLE');

    const leave = await request(ctx.app)
      .delete(`${base}/${admin.id}`)
      .set('Authorization', parent)
      .expect(409);
    expect(leave.body.error.code).toBe('LAST_ADMIN');

    // Après avoir promu l'autre membre, l'admin d'origine peut céder ses droits.
    await request(ctx.app)
      .patch(`${base}/${member.id}`)
      .set('Authorization', parent)
      .send({ role: 'ADMIN', isShoppingResponsible: true })
      .expect(200);
    await request(ctx.app)
      .patch(`${base}/${admin.id}`)
      .set('Authorization', parent)
      .send({ role: 'MEMBER', isShoppingResponsible: false })
      .expect(200);
  });

  it("permet de quitter la famille puis d'y revenir avec un nouveau code", async () => {
    const { family, member } = await familyWithMember();
    await request(ctx.app)
      .delete(`/v1/families/${family.id}/members/${member.id}`)
      .set('Authorization', other)
      .expect(204);
    await request(ctx.app).get(`/v1/families/${family.id}`).set('Authorization', other).expect(404);

    const { code } = await invite(family.id);
    const back = (await join(code, other, 'Léo de retour').expect(201)).body as FamilyDto;
    expect(me(back)).toMatchObject({ id: member.id, displayName: 'Léo de retour' });
  });

  it("permet à l'admin de modifier les réglages de la famille, pas au membre", async () => {
    const { family } = await familyWithMember();
    const res = await request(ctx.app)
      .patch(`/v1/families/${family.id}`)
      .set('Authorization', parent)
      .send({ deadlineWeekday: 6, deadlineTime: '10:30' })
      .expect(200);
    expect(res.body).toMatchObject({ deadlineWeekday: 6, deadlineTime: '10:30' });

    await request(ctx.app)
      .patch(`/v1/families/${family.id}`)
      .set('Authorization', other)
      .send({ name: 'X' })
      .expect(403);
  });
});
