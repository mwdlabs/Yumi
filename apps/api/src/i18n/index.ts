import i18next, { type TFunction } from 'i18next';
import frCA from './locales/fr-CA/server.json' with { type: 'json' };

export const DEFAULT_LOCALE = 'fr-CA';

/**
 * Instance i18n dédiée au serveur (courriels, notifications push).
 * Les ressources sont chargées en mémoire : l'initialisation est synchrone.
 */
export function createI18n(): TFunction {
  const instance = i18next.createInstance();
  void instance.init({
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    resources: { 'fr-CA': { translation: frCA } },
    initAsync: false,
    interpolation: { escapeValue: false },
  });
  return instance.t;
}
