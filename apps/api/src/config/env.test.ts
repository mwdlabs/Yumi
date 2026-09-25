import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  HASH_SECRET: 'x'.repeat(32),
  JWT_ACCESS_SECRET: 'y'.repeat(32),
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  MAIL_FROM: 'Yumi <a@b.c>',
};

describe('loadEnv', () => {
  it('applique les valeurs par défaut', () => {
    const env = loadEnv(base);
    expect(env.APP_NAME).toBe('Yumi');
    expect(env.PORT).toBe(3000);
    expect(env.ENABLE_DEV_TOOLS).toBe(false);
    expect(env.CORS_ORIGINS).toEqual([]);
  });

  it('permet de changer le nom de l’app sans toucher au code', () => {
    expect(loadEnv({ ...base, APP_NAME: 'Miam' }).APP_NAME).toBe('Miam');
  });

  it('liste les variables invalides', () => {
    expect(() => loadEnv({ ...base, HASH_SECRET: 'court' })).toThrow(/HASH_SECRET/);
  });

  it('interdit les outils de dev en production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', ENABLE_DEV_TOOLS: 'true' })).toThrow(
      /ENABLE_DEV_TOOLS/,
    );
  });
});
