import Constants from 'expo-constants';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name} (voir apps/mobile/.env.example)`);
  }
  return value;
}

/** Configuration d'exécution, issue de app.config.ts et des variables EXPO_PUBLIC_*. */
export const appConfig = {
  /** Nom affiché de l'app (marque blanche), défini par APP_NAME au build. */
  appName: Constants.expoConfig?.name ?? 'Yumi',
  /** Version produit (package.json racine), affichée pour le support. */
  version: Constants.expoConfig?.version ?? '',
  /** URL de base de l'API, préfixe de version compris. */
  apiUrl: required('EXPO_PUBLIC_API_URL', process.env.EXPO_PUBLIC_API_URL).replace(/\/+$/, ''),
} as const;
