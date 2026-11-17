import type { MeResponse } from '@yumi/shared';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { unregisterPush } from '@/features/notifications/push';
import { apiClient } from '@/lib/api-client';
import { secureStorage } from '@/lib/secure-storage';
import { authApi } from './auth-api';

/**
 * - `restoring` : lecture de la session enregistrée au démarrage.
 * - `unreachable` : une session existe mais le serveur est injoignable ; on ne
 *   déconnecte pas l'utilisateur, on lui propose de réessayer.
 */
type SessionState =
  | { status: 'restoring' }
  | { status: 'unreachable' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; me: MeResponse };

interface SessionContextValue {
  state: SessionState;
  signIn: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Supprime définitivement le compte, puis ferme la session locale. */
  deleteAccount: () => Promise<void>;
  retryRestore: () => void;
  /** Recharge le profil (après création, adhésion ou départ d'une famille). */
  refreshMe: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Restaure la session enregistrée sur l'appareil, sans jamais lever d'erreur. */
async function loadSavedSession(): Promise<SessionState> {
  try {
    if (!(await apiClient.refreshSession())) return { status: 'signedOut' };
    return { status: 'signedIn', me: await authApi.me() };
  } catch {
    return { status: 'unreachable' };
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'restoring' });

  useEffect(() => {
    let cancelled = false;
    void loadSavedSession().then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      apiClient.onSessionExpired(() => {
        queryClient.clear();
        setState({ status: 'signedOut' });
      }),
    [queryClient],
  );

  const signIn = useCallback(async (email: string, code: string) => {
    const deviceLabel = Constants.deviceName ?? undefined;
    const { me, ...tokens } = await authApi.verifyOtp(email, code, deviceLabel);
    await apiClient.setTokens(tokens);
    setState({ status: 'signedIn', me });
  }, []);

  const signOut = useCallback(async () => {
    // Plus de rappels pour ce compte sur cet appareil (au mieux, sans bloquer).
    await unregisterPush().catch(() => undefined);
    const refreshToken = await secureStorage.getRefreshToken();
    // La déconnexion locale ne dépend pas du réseau : on révoque côté serveur au mieux.
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    await apiClient.clearTokens();
    queryClient.clear();
    setState({ status: 'signedOut' });
  }, [queryClient]);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    await apiClient.clearTokens();
    queryClient.clear();
    setState({ status: 'signedOut' });
  }, [queryClient]);

  const refreshMe = useCallback(async () => {
    setState({ status: 'signedIn', me: await authApi.me() });
  }, []);

  const value = useMemo(
    () => ({
      state,
      signIn,
      signOut,
      deleteAccount,
      refreshMe,
      retryRestore: () => {
        setState({ status: 'restoring' });
        void loadSavedSession().then(setState);
      },
    }),
    [state, signIn, signOut, deleteAccount, refreshMe],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession doit être utilisé dans <SessionProvider>.');
  return context;
}

/**
 * Famille active de l'utilisateur connecté. Le MVP n'affiche qu'une famille :
 * la première rejointe. Le modèle de données en permet plusieurs.
 */
export function useActiveMembership() {
  const { state } = useSession();
  return state.status === 'signedIn' ? (state.me.memberships[0] ?? null) : null;
}
