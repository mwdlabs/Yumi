import { ApiErrorCode, type ApiErrorBody } from '@yumi/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { z } from 'zod';
import type { Logger } from '../lib/logger.ts';

/** Erreur métier connue, convertie telle quelle en réponse HTTP. */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
    readonly extra: Pick<ApiErrorBody['error'], 'details' | 'retryAfter'> = {},
  ) {
    super(message);
    this.name = 'AppError';
  }

  static unauthenticated(message = 'Authentification requise.'): AppError {
    return new AppError(ApiErrorCode.UNAUTHENTICATED, 401, message);
  }

  static notFound(message = 'Ressource introuvable.'): AppError {
    return new AppError(ApiErrorCode.NOT_FOUND, 404, message);
  }

  static rateLimited(retryAfter: number): AppError {
    return new AppError(ApiErrorCode.RATE_LIMITED, 429, 'Trop de requêtes.', { retryAfter });
  }
}

function send(res: Parameters<ErrorRequestHandler>[2], status: number, body: ApiErrorBody): void {
  if (body.error.retryAfter !== undefined) res.setHeader('Retry-After', body.error.retryAfter);
  res.status(status).json(body);
}

/** Route inconnue → 404 au format d'erreur standard. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  send(res, 404, { error: { code: ApiErrorCode.NOT_FOUND, message: 'Route introuvable.' } });
};

/** Convertit toute erreur en réponse `{ error: { code, message } }` sans fuite de détails internes. */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, _req, res, _next) => {
    if (err instanceof AppError) {
      send(res, err.status, { error: { code: err.code, message: err.message, ...err.extra } });
      return;
    }
    if (err instanceof z.ZodError) {
      send(res, 400, {
        error: {
          code: ApiErrorCode.VALIDATION_ERROR,
          message: 'Données invalides.',
          details: z.flattenError(err).fieldErrors as Record<string, string[]>,
        },
      });
      return;
    }
    // JSON mal formé envoyé par le client (erreur levée par express.json()).
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
      send(res, 400, {
        error: { code: ApiErrorCode.VALIDATION_ERROR, message: 'JSON invalide.' },
      });
      return;
    }
    logger.error({ err }, 'Erreur non gérée');
    send(res, 500, {
      error: { code: ApiErrorCode.INTERNAL_ERROR, message: 'Erreur interne.' },
    });
  };
}
