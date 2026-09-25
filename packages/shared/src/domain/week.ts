import { DateTime } from 'luxon';

/**
 * Semaines de la famille, calculées dans son fuseau horaire (IANA).
 * Une semaine est identifiée par la date locale de son premier jour, "YYYY-MM-DD".
 */

/** Date locale (YYYY-MM-DD) du premier jour de la semaine contenant `instant`. */
export function weekStartFor(instant: Date, timezone: string, weekStartsOn: number): string {
  const local = DateTime.fromJSDate(instant, { zone: timezone });
  return alignToWeekStart(local, weekStartsOn);
}

/** Premier jour de la semaine contenant une date locale quelconque (YYYY-MM-DD). */
export function weekStartOfDate(date: string, weekStartsOn: number): string {
  return alignToWeekStart(DateTime.fromISO(date, { zone: 'UTC' }), weekStartsOn);
}

function alignToWeekStart(day: DateTime, weekStartsOn: number): string {
  const offset = (day.weekday - weekStartsOn + 7) % 7;
  return toIsoDate(day.startOf('day').minus({ days: offset }));
}

/** Décale une date de début de semaine de `weeks` semaines. */
export function shiftWeek(startDate: string, weeks: number): string {
  return toIsoDate(DateTime.fromISO(startDate, { zone: 'UTC' }).plus({ weeks }));
}

/** Dernier jour (inclus) d'une semaine. */
export function weekEndDate(startDate: string): string {
  return toIsoDate(DateTime.fromISO(startDate, { zone: 'UTC' }).plus({ days: 6 }));
}

/**
 * Échéance de choix d'une semaine : dernière occurrence du jour et de l'heure
 * d'échéance de la famille (heure murale) strictement AVANT le début de la
 * semaine. Ex. semaine du lundi, échéance « dimanche 18 h » → la veille à 18 h.
 * Retourne un instant UTC, correct au changement d'heure.
 */
export function weekDeadline(
  startDate: string,
  timezone: string,
  deadlineWeekday: number,
  deadlineTime: string,
): Date {
  const [hour = 0, minute = 0] = deadlineTime.split(':').map(Number);
  const weekStart = DateTime.fromISO(startDate, { zone: timezone }).startOf('day');
  for (let daysBack = 0; daysBack <= 7; daysBack++) {
    const day = weekStart.minus({ days: daysBack });
    if (day.weekday !== deadlineWeekday) continue;
    const candidate = day.set({ hour, minute, second: 0, millisecond: 0 });
    if (candidate < weekStart) return candidate.toJSDate();
  }
  throw new Error('Échéance introuvable : jour de semaine invalide.');
}

/** Vrai si `value` est une date ISO valide (YYYY-MM-DD). */
export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value).isValid;
}

function toIsoDate(value: DateTime): string {
  const iso = value.toISODate();
  if (!iso) throw new Error('Date invalide.');
  return iso;
}
