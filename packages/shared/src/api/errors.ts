/**
 * Codes d'erreur stables renvoyés par l'API dans `{ error: { code, message } }`.
 * Le client mobile les traduit via i18n (clé `errors.<code>`), il n'affiche
 * jamais le `message` technique.
 */
export const ApiErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_TOO_MANY_ATTEMPTS: 'OTP_TOO_MANY_ATTEMPTS',
  INVITATION_INVALID: 'INVITATION_INVALID',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
  LAST_ADMIN: 'LAST_ADMIN',
  LAST_SHOPPING_RESPONSIBLE: 'LAST_SHOPPING_RESPONSIBLE',
  MANAGED_MEMBER_CANNOT_BE_ADMIN: 'MANAGED_MEMBER_CANNOT_BE_ADMIN',
  RECIPE_NAME_TAKEN: 'RECIPE_NAME_TAKEN',
  ITEM_ALREADY_IN_LIST: 'ITEM_ALREADY_IN_LIST',
  ITEM_NOT_EDITABLE: 'ITEM_NOT_EDITABLE',
  STAPLE_ALREADY_EXISTS: 'STAPLE_ALREADY_EXISTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Détails de validation, par champ (uniquement pour VALIDATION_ERROR). */
    details?: Record<string, string[]>;
    /** Secondes avant nouvelle tentative (uniquement pour RATE_LIMITED). */
    retryAfter?: number;
  };
}
