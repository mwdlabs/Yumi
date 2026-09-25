import app from './locales/fr-CA/app.json';
import auth from './locales/fr-CA/auth.json';
import common from './locales/fr-CA/common.json';

/**
 * Ressources de traduction, par langue puis par espace de noms.
 * Pour ajouter l'anglais : créer locales/en-CA/*.json avec les mêmes clés
 * et l'ajouter ici.
 */
export const resources = {
  'fr-CA': { common, auth, app },
} as const;

export const defaultNamespace = 'common';
export type SupportedLanguage = keyof typeof resources;
