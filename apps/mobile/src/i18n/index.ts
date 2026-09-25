import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { appConfig } from '@/config';
import { defaultNamespace, resources, type SupportedLanguage } from './resources';

const FALLBACK_LANGUAGE: SupportedLanguage = 'fr-CA';

/** Choisit la première langue de l'appareil prise en charge, sinon le français (Québec). */
function detectLanguage(): SupportedLanguage {
  for (const locale of getLocales()) {
    const tag = locale.languageTag as SupportedLanguage;
    if (tag in resources) return tag;
    const match = Object.keys(resources).find((lng) => lng.startsWith(`${locale.languageCode}-`));
    if (match) return match as SupportedLanguage;
  }
  return FALLBACK_LANGUAGE;
}

void i18next.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: FALLBACK_LANGUAGE,
  defaultNS: defaultNamespace,
  ns: Object.keys(resources[FALLBACK_LANGUAGE]),
  initAsync: false,
  interpolation: {
    escapeValue: false, // React échappe déjà le rendu.
    // Le nom de l'app est disponible partout : « Bienvenue dans {{appName}} ».
    defaultVariables: { appName: appConfig.appName },
  },
});

export default i18next;
