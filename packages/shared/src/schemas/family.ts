import { z } from 'zod';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../domain/avatar';
import { isoWeekdaySchema, localTimeSchema, sixDigitCodeSchema } from './common';

/** Fuseau horaire IANA reconnu par le moteur JavaScript (ex. "America/Toronto"). */
export const timezoneSchema = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Fuseau horaire inconnu.' },
);

const nameSchema = z.string().trim().min(1).max(40);

const profileFields = {
  displayName: nameSchema,
  avatarColor: z.enum(AVATAR_COLORS),
  avatarEmoji: z.enum(AVATAR_EMOJIS).nullable(),
};

/** Profil affiché d'un membre dans la famille. */
export const memberProfileSchema = z.object({
  ...profileFields,
  avatarEmoji: profileFields.avatarEmoji.default(null),
});
export type MemberProfileInput = z.input<typeof memberProfileSchema>;

/** Réglages de la famille modifiables par un admin. */
export const familySettingsSchema = z.object({
  name: nameSchema,
  timezone: timezoneSchema,
  weekStartsOn: isoWeekdaySchema,
  deadlineWeekday: isoWeekdaySchema,
  deadlineTime: localTimeSchema,
});
export type FamilySettingsInput = z.input<typeof familySettingsSchema>;

/** POST /families : crée la famille et le profil (admin) de son créateur. */
export const createFamilyBodySchema = z.object({
  family: familySettingsSchema,
  profile: memberProfileSchema,
});
export type CreateFamilyBody = z.input<typeof createFamilyBodySchema>;

/** PATCH /families/:familyId */
export const updateFamilyBodySchema = familySettingsSchema.partial();
export type UpdateFamilyBody = z.input<typeof updateFamilyBodySchema>;

/** POST /invitations/preview */
export const previewInvitationBodySchema = z.object({ code: sixDigitCodeSchema });
export type PreviewInvitationBody = z.input<typeof previewInvitationBodySchema>;

/** POST /invitations/join */
export const joinFamilyBodySchema = z.object({
  code: sixDigitCodeSchema,
  profile: memberProfileSchema,
});
export type JoinFamilyBody = z.input<typeof joinFamilyBodySchema>;

/** POST /families/:familyId/members : profil géré par un parent (enfant sans courriel). */
export const createManagedMemberBodySchema = memberProfileSchema;
export type CreateManagedMemberBody = z.input<typeof createManagedMemberBodySchema>;

/**
 * PATCH /families/:familyId/members/:memberId
 * Le profil est modifiable par le membre lui-même ou un admin ; le rôle et la
 * responsabilité des courses, par un admin uniquement.
 */
// Sans valeur par défaut : un champ absent ne doit jamais être écrasé.
export const updateMemberBodySchema = z
  .object(profileFields)
  .partial()
  .extend({
    role: z.enum(['ADMIN', 'MEMBER']).optional(),
    isShoppingResponsible: z.boolean().optional(),
  });
export type UpdateMemberBody = z.input<typeof updateMemberBodySchema>;

// ─── Réponses ────────────────────────────────────────────────────────────────

export type MemberRole = 'ADMIN' | 'MEMBER';

export interface MemberDto {
  id: string;
  displayName: string;
  avatarColor: (typeof AVATAR_COLORS)[number];
  avatarEmoji: (typeof AVATAR_EMOJIS)[number] | null;
  role: MemberRole;
  isShoppingResponsible: boolean;
  /** Profil sans courriel, géré par un parent. */
  isManaged: boolean;
  /** Vrai pour le membre correspondant à l'utilisateur connecté. */
  isMe: boolean;
}

export interface FamilyDto {
  id: string;
  name: string;
  timezone: string;
  weekStartsOn: number;
  deadlineWeekday: number;
  deadlineTime: string;
  /** Membres actifs, créateur en premier. */
  members: MemberDto[];
}

export interface InvitationDto {
  id: string;
  expiresAt: string;
  useCount: number;
  createdAt: string;
}

/** Réponse à la création : le code en clair n'est renvoyé qu'une seule fois. */
export interface CreatedInvitationDto extends InvitationDto {
  code: string;
}

export interface InvitationPreviewDto {
  familyName: string;
  memberCount: number;
}
