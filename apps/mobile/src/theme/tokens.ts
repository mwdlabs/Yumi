/**
 * Design tokens de l'identité « cuisine chaleureuse ».
 *
 * Règle : aucun composant n'utilise de valeur de couleur, rayon ou espacement
 * en dur ; tout passe par ces tokens. Les noms sont sémantiques pour permettre
 * un mode sombre ultérieur (il suffira de fournir une seconde palette).
 *
 * Contrastes (WCAG 2.1) vérifiés : texte ≥ 4.5:1 sur son fond.
 */

export const palette = {
  cream: '#FFF8F1',
  white: '#FFFFFF',
  cocoa: '#2B1D16',
  cocoaMuted: '#6E5B50',
  paprika: '#E0603A',
  paprikaStrong: '#C4461F',
  paprikaSoft: '#FDE3D8',
  honey: '#F6B93B',
  pistachio: '#7FB77E',
  blueberry: '#6C63B5',
  sand: '#F0E4D8',
  danger: '#B3261E',
  dangerSoft: '#FCE4E2',
} as const;

export const colors = {
  background: palette.cream,
  surface: palette.white,
  surfaceSunken: '#FBEFE3',
  text: palette.cocoa, // 15.5:1 sur background
  textMuted: palette.cocoaMuted, // 6.1:1 sur background
  textOnPrimary: palette.white, // 4.95:1 sur primaryStrong
  primary: palette.paprika, // grands éléments, illustrations
  primaryStrong: palette.paprikaStrong, // boutons, liens, texte d'accent
  primarySoft: palette.paprikaSoft,
  border: palette.sand,
  borderStrong: '#E2CDB9',
  focus: palette.blueberry,
  danger: palette.danger,
  dangerSoft: palette.dangerSoft,
} as const;

/**
 * Statuts : teinte + icône + libellé, jamais la couleur seule.
 * Ambre / myrtille / vert restent distinguables pour les daltonismes courants.
 */
export const statusColors = {
  pending: { background: '#FFF1D6', foreground: '#8A5300' }, // 5.7:1
  chosen: { background: '#E9E6FB', foreground: '#4B3FA0' }, // 6.8:1
  done: { background: '#E1F2DC', foreground: '#2E6A37' }, // 5.6:1
  absent: { background: '#EFEAE6', foreground: '#5E5049' }, // 6.5:1
} as const;

/** Couleurs d'avatar proposées aux membres (clé stockée en base, jamais l'hexadécimal). */
export const avatarColors = {
  paprika: { background: '#FDE3D8', foreground: '#A63A17' },
  honey: { background: '#FFF1D6', foreground: '#8A5300' },
  pistachio: { background: '#E1F2DC', foreground: '#2E6A37' },
  blueberry: { background: '#E9E6FB', foreground: '#4B3FA0' },
  peach: { background: '#FFE6D5', foreground: '#9A4A1C' },
  mint: { background: '#DDF3EE', foreground: '#1F6B5C' },
  plum: { background: '#F3E1F0', foreground: '#7D2E6E' },
  sky: { background: '#DDEEFB', foreground: '#1F5A8A' },
} as const;
export type AvatarColorKey = keyof typeof avatarColors;

export const fonts = {
  display: 'Fraunces_700Bold',
  title: 'Fraunces_600SemiBold',
  body: 'Nunito_400Regular',
  bodySemiBold: 'Nunito_600SemiBold',
  bodyBold: 'Nunito_700Bold',
  bodyExtraBold: 'Nunito_800ExtraBold',
} as const;

/** Échelle typographique (tailles en points, hauteurs de ligne confortables). */
export const typography = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46 },
  title: { fontFamily: fonts.title, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fonts.title, fontSize: 21, lineHeight: 27 },
  body: { fontFamily: fonts.body, fontSize: 17, lineHeight: 24 },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 24 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 19 },
  button: { fontFamily: fonts.bodyExtraBold, fontSize: 17, lineHeight: 22 },
  code: { fontFamily: fonts.bodyExtraBold, fontSize: 28, lineHeight: 34 },
} as const;
export type TypographyVariant = keyof typeof typography;

/** Espacements sur une grille de 4 pt. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

/** Ombres teintées chaudes (pas de gris neutre). */
export const shadows = {
  card: {
    shadowColor: palette.cocoa,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;

/** Taille minimale d'une zone tactile (accessibilité). */
export const touchTarget = 48;
