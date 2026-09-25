import '@/i18n';

import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SessionProvider, useSession } from '@/features/auth/session';
import { ApiError } from '@/lib/api-error';
import { theme } from '@/theme';
import { ErrorState } from '@/ui/ErrorState';

void SplashScreen.preventAutoHideAsync();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Inutile de réessayer une erreur métier (4xx) ; seulement le réseau et les 5xx.
        retry: (failureCount, error) =>
          failureCount < 2 &&
          !(error instanceof ApiError && error.status !== null && error.status < 500),
      },
    },
  });
}

function RootNavigator() {
  const { state, retryRestore } = useSession();
  const signedIn = state.status === 'signedIn';

  if (state.status === 'restoring') return null; // l'écran de démarrage reste affiché

  if (state.status === 'unreachable') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ErrorState onRetry={retryRestore} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

function SplashGate({ fontsReady }: { fontsReady: boolean }) {
  const { state } = useSession();
  const ready = fontsReady && state.status !== 'restoring';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  return fontsReady ? <RootNavigator /> : null;
}

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="dark" />
        {/* En cas d'échec de chargement des polices, on continue avec les polices système. */}
        <SplashGate fontsReady={fontsLoaded || !!fontError} />
      </SessionProvider>
    </QueryClientProvider>
  );
}
