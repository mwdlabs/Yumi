import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'auth.refreshToken';

/**
 * Stockage du refresh token dans le trousseau iOS / Keystore Android.
 * Le jeton d'accès (courte durée) reste uniquement en mémoire.
 */
export const secureStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  clearRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
};
