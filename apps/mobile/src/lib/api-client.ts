import { ApiErrorCode, type ApiErrorBody, type AuthTokens } from '@yumi/shared';
import { appConfig } from '@/config';
import { ApiError } from './api-error';
import { secureStorage } from './secure-storage';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  /** Requête authentifiée (par défaut) ; false pour les routes publiques de connexion. */
  auth?: boolean;
}

/**
 * Client HTTP de l'API.
 *
 * - Ajoute le jeton d'accès (conservé en mémoire seulement).
 * - Sur un 401, rafraîchit la session une seule fois puis rejoue la requête.
 *   Les rafraîchissements concurrents sont mutualisés (une seule rotation).
 * - Si la session ne peut pas être rafraîchie, prévient l'app via `onSessionExpired`.
 */
class ApiClient {
  private accessToken: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  private sessionExpiredListener: (() => void) | null = null;

  onSessionExpired(listener: () => void): () => void {
    this.sessionExpiredListener = listener;
    return () => {
      if (this.sessionExpiredListener === listener) this.sessionExpiredListener = null;
    };
  }

  /** Enregistre une nouvelle paire de jetons (connexion ou rafraîchissement). */
  async setTokens(tokens: AuthTokens): Promise<void> {
    this.accessToken = tokens.accessToken;
    await secureStorage.setRefreshToken(tokens.refreshToken);
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    await secureStorage.clearRefreshToken();
  }

  /**
   * Tente d'obtenir un jeton d'accès à partir du refresh token stocké.
   * Retourne false si aucune session valide n'existe ; lève ApiError('NETWORK_ERROR')
   * si le serveur est injoignable (la session n'est alors pas effacée).
   */
  refreshSession(): Promise<boolean> {
    this.refreshInFlight ??= this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = await secureStorage.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const tokens = await this.send<AuthTokens>('POST', '/auth/refresh', { refreshToken }, null);
      await this.setTokens(tokens);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.code === ApiErrorCode.UNAUTHENTICATED) {
        await this.clearTokens();
        return false;
      }
      throw error;
    }
  }

  async request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
    const useAuth = options.auth ?? true;
    try {
      return await this.send<T>(method, path, options.body, useAuth ? this.accessToken : null);
    } catch (error) {
      const expired = error instanceof ApiError && error.code === ApiErrorCode.UNAUTHENTICATED;
      if (!useAuth || !expired) throw error;

      if (!(await this.refreshSession())) {
        this.sessionExpiredListener?.();
        throw error;
      }
      return this.send<T>(method, path, options.body, this.accessToken);
    }
  }

  private async send<T>(
    method: Method,
    path: string,
    body: unknown,
    accessToken: string | null,
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let response: Response;
    try {
      response = await fetch(`${appConfig.apiUrl}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw ApiError.network();
    }

    if (response.status === 204) return undefined as T;

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const errorBody = (payload as ApiErrorBody | null)?.error;
      throw new ApiError(
        errorBody?.code ?? ApiErrorCode.INTERNAL_ERROR,
        response.status,
        errorBody,
      );
    }
    return payload as T;
  }
}

export const apiClient = new ApiClient();
