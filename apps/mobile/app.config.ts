import type { ConfigContext, ExpoConfig } from 'expo/config';
// Version unique du produit : celle du package.json racine du monorepo.
import rootPackage from '../../package.json';

/**
 * Configuration native de l'app, entièrement pilotée par l'environnement
 * (voir .env.example) : aucun nom, identifiant ou scheme n'est codé en dur
 * ailleurs dans le code. Les valeurs par défaut correspondent à Yumi.
 */

const env = (name: string, fallback: string): string => process.env[name]?.trim() || fallback;

const appName = env('APP_NAME', 'Yumi');
const easProjectId = process.env.EAS_PROJECT_ID?.trim();

// Un build de production ne doit jamais pointer vers une API locale ou non chiffrée.
if (process.env.EAS_BUILD_PROFILE === 'production') {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!apiUrl.startsWith('https://') || /localhost|127\.0\.0\.1/.test(apiUrl)) {
    throw new Error(
      `EXPO_PUBLIC_API_URL doit être une URL https publique en production (reçu : « ${apiUrl} »).`,
    );
  }
  if (!easProjectId) throw new Error('EAS_PROJECT_ID est requis pour un build de production.');
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: env('APP_SLUG', 'yumi'),
  scheme: env('APP_SCHEME', 'yumi'),
  version: rootPackage.version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  backgroundColor: '#FFF8F1',
  ...(process.env.EXPO_OWNER ? { owner: process.env.EXPO_OWNER } : {}),
  ios: {
    bundleIdentifier: env('IOS_BUNDLE_ID', 'ca.mwdlabs.yumi'),
    supportsTablet: false,
    // Seul HTTPS standard est utilisé : aucune déclaration d'export de chiffrement requise.
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: env('ANDROID_PACKAGE', 'ca.mwdlabs.yumi'),
    adaptiveIcon: {
      backgroundColor: '#FFF8F1',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-localization',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: '#FFF8F1',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    ...(easProjectId ? { eas: { projectId: easProjectId } } : {}),
  },
});
