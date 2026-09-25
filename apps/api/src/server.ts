import { Redis } from 'ioredis';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { createApp } from './app.ts';
import { loadEnv } from './config/env.ts';
import { createI18n } from './i18n/index.ts';
import { createLogger } from './lib/logger.ts';
import { createPrisma } from './lib/prisma.ts';
import { createSmtpMailer } from './mail/mailer.ts';

/** Point d'entrée du processus HTTP. */
async function main(): Promise<void> {
  const env = loadEnv();
  const logger = createLogger(env);
  const db = createPrisma(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

  const app = createApp({
    env,
    db,
    logger,
    mailer: createSmtpMailer(env),
    t: createI18n(),
    rateLimitStoreFactory: (prefix) =>
      new RedisStore({
        prefix,
        sendCommand: (command: string, ...args: string[]) =>
          redis.call(command, ...args) as Promise<RedisReply>,
      }),
  });

  const server = app.listen(env.PORT, () => {
    logger.info(`${env.APP_NAME} API à l'écoute sur http://localhost:${env.PORT}`);
  });

  // Arrêt propre : on termine les requêtes en cours avant de fermer les connexions.
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Arrêt en cours');
    server.close(async () => {
      await Promise.allSettled([db.$disconnect(), redis.quit()]);
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
