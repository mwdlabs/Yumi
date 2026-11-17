import type { PushData } from '@yumi/shared';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from '@/lib/api-client';

export type PushPermission = 'granted' | 'denied' | 'undetermined';

/** Jeton enregistré auprès de l'API pendant cette session (retiré à la déconnexion). */
let registeredToken: string | null = null;

// Notification reçue app ouverte : affichée en bannière, comme app fermée.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function toPermission(status: Notifications.NotificationPermissionsStatus): PushPermission {
  if (status.granted) return 'granted';
  const ios = status.ios?.status;
  if (ios === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPushPermission(): Promise<PushPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** Enregistre le jeton de l'appareil auprès de l'API (permission déjà accordée). */
async function registerToken(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Rappels',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await apiClient.request<void>('POST', '/me/push-devices', {
    body: { token, platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID' },
  });
  registeredToken = token;
}

/** Demande l'autorisation (si possible), puis enregistre l'appareil. */
export async function enablePush(): Promise<PushPermission> {
  let permission = await getPushPermission();
  if (permission === 'undetermined') {
    permission = toPermission(await Notifications.requestPermissionsAsync());
  }
  if (permission === 'granted') await registerToken();
  return permission;
}

/**
 * Au démarrage d'une session : réenregistre le jeton si l'autorisation existe déjà
 * (le jeton peut changer, ou suivre un autre compte sur le même téléphone).
 */
export async function syncPushToken(): Promise<void> {
  if ((await getPushPermission()) === 'granted') await registerToken();
}

/** Déconnexion : cet appareil ne doit plus recevoir les rappels du compte. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await apiClient.request<void>('DELETE', '/me/push-devices', { body: { token } });
}

/** Écran à ouvrir pour une notification touchée. */
export function pushUrl(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data as Partial<PushData> | undefined;
  return typeof data?.url === 'string' && data.url.startsWith('/') ? data.url : null;
}
