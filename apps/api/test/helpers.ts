import type { Express } from 'express';
import { createApp } from '../src/app.ts';
import { loadEnv, type Env } from '../src/config/env.ts';
import { createI18n } from '../src/i18n/index.ts';
import type { Clock } from '../src/lib/clock.ts';
import { createLogger } from '../src/lib/logger.ts';
import { createPrisma, type Database } from '../src/lib/prisma.ts';
import type { MailMessage, Mailer } from '../src/mail/mailer.ts';

/** Mailer mémoire : conserve les courriels envoyés pour inspection. */
export class InMemoryMailer implements Mailer {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** Extrait le code à 6 chiffres du dernier courriel envoyé à `to`. */
  lastCodeFor(to: string): string {
    const message = this.sent.findLast((m) => m.to === to);
    const code = message?.text.match(/\b\d{6}\b/)?.[0];
    if (!code) throw new Error(`Aucun code envoyé à ${to}`);
    return code;
  }
}

/** Horloge contrôlable pour tester les expirations et délais. */
export class TestClock implements Clock {
  private current = new Date();

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export interface TestContext {
  /** Application courante ; recréée par `resetApp` (limiteurs de débit remis à zéro). */
  app: Express;
  resetApp(): void;
  db: Database;
  env: Env;
  mailer: InMemoryMailer;
  clock: TestClock;
}

export function createTestContext(overrides: Partial<Record<keyof Env, string>> = {}): TestContext {
  const env = loadEnv({
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    APP_NAME: 'Yumi',
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: 'redis://localhost:6379',
    HASH_SECRET: 'test-hash-secret-test-hash-secret-0000',
    JWT_ACCESS_SECRET: 'test-jwt-secret-test-jwt-secret-000000',
    SMTP_HOST: 'localhost',
    SMTP_PORT: '1025',
    MAIL_FROM: 'Yumi <test@example.com>',
    ...overrides,
  });
  const db = createPrisma(env.DATABASE_URL);
  const mailer = new InMemoryMailer();
  const clock = new TestClock();
  const logger = createLogger(env);
  const t = createI18n();
  const build = () => createApp({ env, db, mailer, clock, logger, t });
  const ctx: TestContext = {
    app: build(),
    resetApp: () => {
      ctx.app = build();
    },
    db,
    env,
    mailer,
    clock,
  };
  return ctx;
}

/** Vide toutes les tables (sauf l'historique des migrations). */
export async function resetDatabase(db: Database): Promise<void> {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

/** Connecte (ou inscrit) un utilisateur et renvoie un en-tête Authorization prêt à l'emploi. */
export async function loginAs(ctx: TestContext, email: string): Promise<string> {
  const { default: request } = await import('supertest');
  await request(ctx.app).post('/v1/auth/otp/request').send({ email }).expect(204);
  const res = await request(ctx.app)
    .post('/v1/auth/otp/verify')
    .send({ email, code: ctx.mailer.lastCodeFor(email) })
    .expect(200);
  return `Bearer ${(res.body as { accessToken: string }).accessToken}`;
}
