import { z } from 'zod';
import { emailSchema, sixDigitCodeSchema } from './common';

/** POST /auth/otp/request */
export const requestOtpBodySchema = z.object({
  email: emailSchema,
});
export type RequestOtpBody = z.infer<typeof requestOtpBodySchema>;

/** POST /auth/otp/verify */
export const verifyOtpBodySchema = z.object({
  email: emailSchema,
  code: sixDigitCodeSchema,
  /** Libellé libre de l'appareil (ex. « iPhone de Léa »), affiché dans la gestion des sessions. */
  deviceLabel: z.string().trim().max(100).optional(),
});
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;

/** POST /auth/refresh et POST /auth/logout */
export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(20).max(200),
});
export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;

/** Paire de jetons renvoyée à la connexion et au rafraîchissement. */
export interface AuthTokens {
  accessToken: string;
  /** Durée de validité du jeton d'accès, en secondes. */
  accessTokenExpiresIn: number;
  refreshToken: string;
}

/** Appartenance d'un utilisateur à une famille, telle que vue par le client. */
export interface MembershipSummary {
  memberId: string;
  familyId: string;
  familyName: string;
  displayName: string;
  role: 'ADMIN' | 'MEMBER';
}

/** GET /me */
export interface MeResponse {
  user: { id: string; email: string | null };
  memberships: MembershipSummary[];
}

/** Réponse de POST /auth/otp/verify. */
export interface VerifyOtpResponse extends AuthTokens {
  me: MeResponse;
}
