import { Stack } from 'expo-router';
import { usePushNotifications } from '@/features/notifications/hooks';
import { theme } from '@/theme';

/** Pile de l'app connectée : onglets, puis écrans secondaires empilés par-dessus. */
export default function AppLayout() {
  usePushNotifications();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="inviter" options={{ presentation: 'modal' }} />
      <Stack.Screen name="membres/nouveau" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
