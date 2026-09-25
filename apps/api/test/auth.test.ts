import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestContext, resetDatabase } from './helpers.ts';

const ctx = createTestContext();
const { app, db, mailer, clock } = ctx;
const EMAIL = 'lea@exemple.ca';

function requestCode(email = EMAIL) {
  return request(app).post('/v1/auth/otp/request').send({ email });
}

async function login(email = EMAIL) {
  await requestCode(email).expect(204);
  const res = await request(app)
    .post('/v1/auth/otp/verify')
    .send({ email, code: mailer.lastCodeFor(email), deviceLabel: 'Test' })
    .expect(200);
  return res.body as { accessToken: string; refreshToken: string };
}

beforeEach(async () => {
  await resetDatabase(db);
  mailer.sent.length = 0;
  clock.advance(60 * 60 * 1000); // sort de toute fenêtre de limitation du test précédent
});

afterAll(async () => {
  await db.$disconnect();
});

describe('POST /v1/auth/otp/request', () => {
  it('envoie un code à 6 chiffres, sans le stocker en clair', async () => {
    await requestCode('  Lea@Exemple.CA ').expect(204);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe(EMAIL);
    expect(mailer.sent[0]?.subject).toMatch(/^\d{6} est ton code Yumi$/);

    const otp = await db.emailOtp.findFirstOrThrow({ where: { email: EMAIL } });
    expect(otp.codeHash).not.toContain(mailer.lastCodeFor(EMAIL));
  });

  it('impose un délai avant de renvoyer un code', async () => {
    await requestCode().expect(204);
    const res = await requestCode().expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.retryAfter).toBeGreaterThan(0);

    clock.advance(61 * 1000);
    await requestCode().expect(204);
  });

  it('refuse une adresse invalide', async () => {
    const res = await requestCode('pas-un-courriel').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.email).toBeDefined();
  });
});

describe('POST /v1/auth/otp/verify', () => {
  it('crée le compte à la première connexion et renvoie les jetons', async () => {
    await requestCode().expect(204);
    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ email: EMAIL, code: mailer.lastCodeFor(EMAIL) })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
    expect(res.body.me.user.email).toBe(EMAIL);
    expect(res.body.me.memberships).toEqual([]);
  });

  it('refuse un code déjà utilisé', async () => {
    await requestCode().expect(204);
    const code = mailer.lastCodeFor(EMAIL);
    await request(app).post('/v1/auth/otp/verify').send({ email: EMAIL, code }).expect(200);
    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ email: EMAIL, code })
      .expect(400);
    expect(res.body.error.code).toBe('OTP_INVALID');
  });

  it('refuse un code expiré', async () => {
    await requestCode().expect(204);
    clock.advance(11 * 60 * 1000);
    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ email: EMAIL, code: mailer.lastCodeFor(EMAIL) })
      .expect(400);
    expect(res.body.error.code).toBe('OTP_EXPIRED');
  });

  it('bloque le code après 5 tentatives erronées, même si le bon code suit', async () => {
    await requestCode().expect(204);
    const good = mailer.lastCodeFor(EMAIL);
    const wrong = good === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/v1/auth/otp/verify')
        .send({ email: EMAIL, code: wrong })
        .expect(400);
    }
    const res = await request(app)
      .post('/v1/auth/otp/verify')
      .send({ email: EMAIL, code: good })
      .expect(400);
    expect(res.body.error.code).toBe('OTP_TOO_MANY_ATTEMPTS');
  });

  it("n'accepte pas le code d'une autre adresse", async () => {
    await requestCode('a@exemple.ca').expect(204);
    await requestCode('b@exemple.ca').expect(204);
    await request(app)
      .post('/v1/auth/otp/verify')
      .send({ email: 'b@exemple.ca', code: mailer.lastCodeFor('a@exemple.ca') })
      .expect(400);
  });

  it('invalide le code précédent quand un nouveau est demandé', async () => {
    await requestCode().expect(204);
    const first = mailer.lastCodeFor(EMAIL);
    clock.advance(61 * 1000);
    await requestCode().expect(204);
    const second = mailer.lastCodeFor(EMAIL);
    if (first !== second) {
      await request(app)
        .post('/v1/auth/otp/verify')
        .send({ email: EMAIL, code: first })
        .expect(400);
    }
    await request(app).post('/v1/auth/otp/verify').send({ email: EMAIL, code: second }).expect(200);
  });
});

describe('sessions', () => {
  it('protège /v1/me', async () => {
    const res = await request(app).get('/v1/me').expect(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
    await request(app).get('/v1/me').set('Authorization', 'Bearer faux').expect(401);
  });

  it('donne accès à /v1/me avec le jeton d’accès', async () => {
    const { accessToken } = await login();
    const res = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.user.email).toBe(EMAIL);
  });

  it('fait tourner le refresh token : l’ancien devient inutilisable', async () => {
    const { refreshToken } = await login();
    const res = await request(app).post('/v1/auth/refresh').send({ refreshToken }).expect(200);
    expect(res.body.refreshToken).not.toBe(refreshToken);

    await request(app).post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    await request(app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: res.body.refreshToken })
      .expect(200);
  });

  it('la déconnexion révoque immédiatement la session', async () => {
    const { accessToken, refreshToken } = await login();
    await request(app).post('/v1/auth/logout').send({ refreshToken }).expect(204);

    await request(app).get('/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
    await request(app).post('/v1/auth/refresh').send({ refreshToken }).expect(401);
  });
});

describe('erreurs', () => {
  it('répond 404 au format standard pour une route inconnue', async () => {
    const res = await request(app).get('/v1/inexistant').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('répond 400 pour un JSON mal formé', async () => {
    const res = await request(app)
      .post('/v1/auth/otp/request')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
