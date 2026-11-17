import { z } from 'zod';

/** Booléen lu depuis une variable d'environnement ("true"/"false", "1"/"0"…). */
const envBoolean = z.stringbool();

/** Liste séparée par des virgules ; vide = liste vide. */
const commaList = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

/** Variable facultative : une valeur vide (`NOM=`) équivaut à une variable absente. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_NAME: z.string().trim().min(1).default('Yumi'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: commaList,
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  ENABLE_DEV_TOOLS: envBoolean.default(false),

  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),

  HASH_SECRET: z.string().min(32),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ISSUER: z.string().default('yumi-api'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(60),

  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(0).default(60),
  OTP_MAX_PER_WINDOW: z.coerce.number().int().positive().default(5),

  INVITATION_TTL_HOURS: z.coerce.number().int().positive().default(48),

  REVIEW_ACCOUNT_EMAIL: optional(z.string().trim().toLowerCase().pipe(z.email())),
  REVIEW_ACCOUNT_CODE: optional(z.string().regex(/^\d{6}$/)),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: envBoolean.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Valide les variables d'environnement au démarrage.
 * Échoue immédiatement avec la liste des variables manquantes ou invalides,
 * plutôt que de planter plus tard au premier usage.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${problems}`);
  }
  if (!result.data.REVIEW_ACCOUNT_EMAIL !== !result.data.REVIEW_ACCOUNT_CODE) {
    throw new Error('REVIEW_ACCOUNT_EMAIL et REVIEW_ACCOUNT_CODE vont ensemble.');
  }
  if (result.data.NODE_ENV === 'production' && result.data.ENABLE_DEV_TOOLS) {
    throw new Error('ENABLE_DEV_TOOLS ne doit jamais être activé en production.');
  }
  return result.data;
}
