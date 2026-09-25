/**
 * Choix d'avatar : listes fermées, communes à l'API (validation) et au mobile
 * (affichage). Les couleurs sont des clés ; le mobile les associe aux tokens du thème.
 */
export const AVATAR_COLORS = [
  'paprika',
  'honey',
  'pistachio',
  'blueberry',
  'peach',
  'mint',
  'plum',
  'sky',
] as const;
export type AvatarColor = (typeof AVATAR_COLORS)[number];

/** Emojis proposés : gourmands et adaptés aux enfants. */
export const AVATAR_EMOJIS = [
  '🍅',
  '🥕',
  '🍋',
  '🍓',
  '🥑',
  '🍕',
  '🌮',
  '🍜',
  '🧁',
  '🍪',
  '🥞',
  '🧀',
  '🐻',
  '🦊',
  '🐼',
  '🐸',
] as const;
export type AvatarEmoji = (typeof AVATAR_EMOJIS)[number];
