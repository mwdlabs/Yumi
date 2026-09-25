import { Stack } from 'expo-router';
import { theme } from '@/theme';

export const unstable_settings = { initialRouteName: 'connexion' };

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
