import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { enablePush, getPushPermission, pushUrl, syncPushToken, type PushPermission } from './push';

/**
 * À monter dans l'app connectée : réenregistre l'appareil et ouvre l'écran d'une
 * notification touchée (app ouverte, en arrière-plan ou lancée par la notification).
 */
export function usePushNotifications(): void {
  useEffect(() => {
    // Sans réseau ou sans autorisation, on réessaiera au prochain démarrage.
    syncPushToken().catch(() => undefined);

    const open = (response: Notifications.NotificationResponse | null) => {
      const url = pushUrl(response);
      if (!url) return;
      void Notifications.clearLastNotificationResponseAsync();
      router.push(url as Href);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

/** Autorisation des notifications, mise à jour au retour dans l'app (Réglages iOS). */
export function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [enabling, setEnabling] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(() => {
    void getPushPermission().then(setPermission);
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const enable = useCallback(async () => {
    setEnabling(true);
    setFailed(false);
    try {
      setPermission(await enablePush());
    } catch {
      setFailed(true);
    } finally {
      setEnabling(false);
    }
  }, []);

  return { permission, enable, enabling, failed };
}
