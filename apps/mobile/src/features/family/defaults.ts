import { AVATAR_COLORS, type AvatarColor } from '@yumi/shared';
import { getCalendars } from 'expo-localization';

/** Échéance proposée à la création d'une famille : dimanche 18 h. */
export const DEFAULT_DEADLINE = { weekday: 7, time: '18:00' } as const;
/** Premier jour de semaine par défaut : lundi. */
export const DEFAULT_WEEK_STARTS_ON = 1;
const FALLBACK_TIMEZONE = 'America/Toronto';

/** Fuseau IANA de l'appareil (ex. "America/Toronto"). */
export function deviceTimezone(): string {
  return getCalendars()[0]?.timeZone ?? FALLBACK_TIMEZONE;
}

/** Couleur d'avatar aléatoire, pour varier les profils sans effort. */
export function randomAvatarColor(): AvatarColor {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] ?? 'paprika';
}
