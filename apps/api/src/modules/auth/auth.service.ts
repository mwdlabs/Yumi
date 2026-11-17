import { ApiErrorCode, type AuthTokens, type MeResponse } from '@yumi/shared';
import type { TFunction } from 'i18next';
import type { Env } from '../../config/env.ts';
import { AppError } from '../../http/errors.ts';
import type { Clock } from '../../lib/clock.ts';
import { hmacSha256, randomDigits, randomToken, safeEqual, sha256 } from '../../lib/crypto.ts';
import type { Database } from '../../lib/prisma.ts';
import type { Mailer } from '../../mail/mailer.ts';
import { renderOtpEmail } from '../../mail/templates/otp.ts';
import { getMe } from '../me/me.service.ts';
import type { TokenService } from './token.service.ts';

const OTP_LENGTH = 6;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

interface AuthServiceDeps {
  env: Env;
  db: Database;
  mailer: Mailer;
  tokens: TokenService;
  t: TFunction;
  clock: Clock;
}

/**
 * Connexion sans mot de passe par code à 6 chiffres envoyé par courriel.
 *
 * - Un seul code actif par adresse : en demander un nouveau invalide le précédent.
 * - Le code est lié à l'adresse dans le HMAC : un code valide pour A ne l'est pas pour B.
 * - La réponse à une demande de code est identique que l'adresse soit connue ou non.
 * - La première connexion réussie crée le compte (pas d'inscription séparée).
 * - Compte de démonstration (REVIEW_ACCOUNT_*) pour l'examen App Store : son code est
 *   fixe et aucun courriel n'est envoyé ; délais et limites de tentatives s'appliquent.
 */
export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  private hashOtp(email: string, code: string): string {
    return hmacSha256(this.deps.env.HASH_SECRET, `otp:${email}:${code}`);
  }

  async requestOtp(email: string): Promise<void> {
    const { db, env, clock, mailer, t } = this.deps;
    const now = clock.now();

    const recent = await db.emailOtp.findMany({
      where: { email, createdAt: { gt: new Date(now.getTime() - OTP_WINDOW_MS) } },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    const latest = recent[0];
    if (latest) {
      const elapsedSeconds = (now.getTime() - latest.createdAt.getTime()) / 1000;
      if (elapsedSeconds < env.OTP_RESEND_COOLDOWN_SECONDS) {
        throw AppError.rateLimited(Math.ceil(env.OTP_RESEND_COOLDOWN_SECONDS - elapsedSeconds));
      }
    }
    const oldestInWindow = recent[env.OTP_MAX_PER_WINDOW - 1];
    if (oldestInWindow) {
      const releaseAt = oldestInWindow.createdAt.getTime() + OTP_WINDOW_MS;
      throw AppError.rateLimited(Math.ceil((releaseAt - now.getTime()) / 1000));
    }

    const isReviewAccount = email === env.REVIEW_ACCOUNT_EMAIL;
    const code =
      isReviewAccount && env.REVIEW_ACCOUNT_CODE
        ? env.REVIEW_ACCOUNT_CODE
        : randomDigits(OTP_LENGTH);
    await db.$transaction([
      db.emailOtp.updateMany({
        where: { email, consumedAt: null },
        data: { consumedAt: now },
      }),
      db.emailOtp.create({
        data: {
          email,
          codeHash: this.hashOtp(email, code),
          createdAt: now,
          expiresAt: new Date(now.getTime() + env.OTP_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    if (isReviewAccount) return;
    await mailer.send(
      renderOtpEmail(t, { to: email, code, appName: env.APP_NAME, minutes: env.OTP_TTL_MINUTES }),
    );
  }

  async verifyOtp(input: {
    email: string;
    code: string;
    deviceLabel?: string | undefined;
  }): Promise<AuthTokens & { me: MeResponse }> {
    const { db, env, clock } = this.deps;
    const now = clock.now();

    const otp = await db.emailOtp.findFirst({
      where: { email: input.email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) throw otpError(ApiErrorCode.OTP_INVALID);
    if (otp.expiresAt <= now) throw otpError(ApiErrorCode.OTP_EXPIRED);

    // Incrément atomique : deux requêtes simultanées ne peuvent pas dépasser la limite.
    const counted = await db.emailOtp.updateMany({
      where: { id: otp.id, consumedAt: null, attempts: { lt: env.OTP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (counted.count === 0) throw otpError(ApiErrorCode.OTP_TOO_MANY_ATTEMPTS);

    if (!safeEqual(otp.codeHash, this.hashOtp(input.email, input.code))) {
      throw otpError(ApiErrorCode.OTP_INVALID);
    }

    const consumed = await db.emailOtp.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw otpError(ApiErrorCode.OTP_INVALID);

    const user = await db.user.upsert({
      where: { email: input.email },
      update: {},
      create: { email: input.email },
      select: { id: true },
    });

    const tokens = await this.createSession(user.id, input.deviceLabel);
    return { ...tokens, me: await getMe(db, user.id) };
  }

  /** Rotation : l'ancien refresh token devient inutilisable dès qu'il a servi. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { db, env, clock, tokens } = this.deps;
    const now = clock.now();
    const currentHash = sha256(refreshToken);

    const session = await db.session.findUnique({ where: { refreshTokenHash: currentHash } });
    if (!session || session.revokedAt || session.expiresAt <= now) {
      throw AppError.unauthenticated('Session expirée.');
    }

    const nextToken = randomToken();
    const rotated = await db.session.updateMany({
      where: { id: session.id, refreshTokenHash: currentHash, revokedAt: null },
      data: {
        refreshTokenHash: sha256(nextToken),
        lastUsedAt: now,
        expiresAt: new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      },
    });
    if (rotated.count === 0) throw AppError.unauthenticated('Session expirée.');

    return {
      accessToken: await tokens.signAccessToken({ userId: session.userId, sessionId: session.id }),
      accessTokenExpiresIn: tokens.accessTokenTtlSeconds,
      refreshToken: nextToken,
    };
  }

  /** Révoque la session. Idempotent : un jeton inconnu ne produit pas d'erreur. */
  async logout(refreshToken: string): Promise<void> {
    await this.deps.db.session.updateMany({
      where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: this.deps.clock.now() },
    });
  }

  private async createSession(userId: string, deviceLabel?: string): Promise<AuthTokens> {
    const { db, env, clock, tokens } = this.deps;
    const refreshToken = randomToken();
    const session = await db.session.create({
      data: {
        userId,
        deviceLabel: deviceLabel ?? null,
        refreshTokenHash: sha256(refreshToken),
        expiresAt: new Date(clock.now().getTime() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      },
      select: { id: true },
    });
    return {
      accessToken: await tokens.signAccessToken({ userId, sessionId: session.id }),
      accessTokenExpiresIn: tokens.accessTokenTtlSeconds,
      refreshToken,
    };
  }
}

function otpError(code: ApiErrorCode): AppError {
  const messages: Partial<Record<ApiErrorCode, string>> = {
    [ApiErrorCode.OTP_INVALID]: 'Code invalide.',
    [ApiErrorCode.OTP_EXPIRED]: 'Code expiré.',
    [ApiErrorCode.OTP_TOO_MANY_ATTEMPTS]: 'Trop de tentatives. Demande un nouveau code.',
  };
  return new AppError(code, 400, messages[code] ?? 'Code invalide.');
}
