import { Stack } from 'expo-router';
import { theme } from '@/theme';

export const unstable_settings = { initialRouteName: 'bienvenue' };

/** Parcours d'accueil : l'utilisateur connecté n'a pas encore de famille. */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
