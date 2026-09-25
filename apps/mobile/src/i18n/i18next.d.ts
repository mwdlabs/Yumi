import type { defaultNamespace, resources } from './resources';

// Clés de traduction typées : une clé inexistante est une erreur de compilation.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNamespace;
    resources: (typeof resources)['fr-CA'];
  }
}
