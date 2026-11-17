import type { PushData } from '@yumi/shared';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: PushData;
}

/** Résultat d'un envoi, dans l'ordre des messages : `invalidToken` = appareil à oublier. */
export type PushResult = { ok: true } | { ok: false; invalidToken: boolean; error: string };

/** Abstraction d'envoi de notifications : service Expo en prod, mémoire en test. */
export interface PushSender {
  send(messages: readonly PushMessage[]): Promise<PushResult[]>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // limite de l'API Expo par requête

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/** Envoi via le service de notifications d'Expo (APNs / FCM derrière). */
export function createExpoPushSender(fetchImpl: typeof fetch = fetch): PushSender {
  return {
    async send(messages) {
      const results: PushResult[] = [];
      for (let start = 0; start < messages.length; start += BATCH_SIZE) {
        const batch = messages.slice(start, start + BATCH_SIZE);
        const response = await fetchImpl(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.map((message) => ({ ...message, sound: 'default' }))),
          signal: AbortSignal.timeout(15_000),
        });
        const payload = (await response.json().catch(() => null)) as {
          data?: ExpoTicket[];
          errors?: { message: string }[];
        } | null;
        if (!response.ok || !payload?.data) {
          const error = payload?.errors?.[0]?.message ?? `HTTP ${response.status}`;
          results.push(...batch.map(() => ({ ok: false as const, invalidToken: false, error })));
          continue;
        }
        results.push(
          ...batch.map((_, index): PushResult => {
            const ticket = payload.data?.[index];
            if (ticket?.status === 'ok') return { ok: true };
            const code = ticket?.details?.error ?? ticket?.message ?? 'Réponse inattendue';
            return { ok: false, invalidToken: code === 'DeviceNotRegistered', error: code };
          }),
        );
      }
      return results;
    },
  };
}
