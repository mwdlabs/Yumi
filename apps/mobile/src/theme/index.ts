import * as tokens from './tokens';

/** Point d'entrée unique du thème : `import { theme } from '@/theme'`. */
export const theme = tokens;
export type Theme = typeof theme;
export type { AvatarColorKey, TypographyVariant } from './tokens';
