import type { ApiErrorBody, ApiErrorCode } from '@yumi/shared';
import i18next from 'i18next';

/** Codes d'erreur propres au client (jamais renvoyés par l'API). */
export type ClientErrorCode = 'NETWORK_ERROR';

/** Erreur normalisée pour toute l'app : code stable + statut HTTP éventuel. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | ClientErrorCode,
    readonly status: number | null,
    readonly body?: ApiErrorBody['error'],
  ) {
    super(body?.message ?? code);
    this.name = 'ApiError';
  }

  get retryAfter(): number | undefined {
    return this.body?.retryAfter;
  }

  static network(): ApiError {
    return new ApiError('NETWORK_ERROR', null);
  }
}

/** Message traduit, prêt à afficher, pour n'importe quelle erreur. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return i18next.t(`common:errors.${error.code}`, { seconds: error.retryAfter ?? 60 });
  }
  return i18next.t('common:errors.INTERNAL_ERROR');
}
