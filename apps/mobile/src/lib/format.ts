import type { Unit } from '@yumi/shared';
import i18next from 'i18next';

/** "18:05" → « 18 h 05 » (format québécois, via i18n). */
export function formatLocalTime(localTime: string): string {
  const [hours = '0', minutes = '00'] = localTime.split(':');
  return i18next.t('common:time.hoursMinutes', { hours: Number(hours), minutes });
}

/** Jour ISO (1 = lundi … 7 = dimanche) → « dimanche ». */
export function formatWeekday(isoWeekday: number): string {
  return i18next.t(`common:weekdays.${String(isoWeekday) as '1'}`);
}

/** Date et heure lisibles dans la langue courante : « dim. 27 sept., 18 h 05 ». */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(i18next.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** "HH:mm" ↔ Date (heure locale de l'appareil, date du jour) pour les sélecteurs d'heure. */
export function localTimeToDate(localTime: string): Date {
  const [hours = 0, minutes = 0] = localTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToLocalTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Nombre au format local : 1.5 → « 1,5 ». */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18next.language, { maximumFractionDigits: 3 }).format(value);
}

/** Libellé d'une unité, accordé à la quantité : « gousse » / « gousses ». */
export function formatUnit(unit: Unit, quantity = 1): string {
  return i18next.t(`recipes:units.${unit}` as 'recipes:units.G', { count: quantity });
}

/**
 * Quantité lisible : « 500 g », « 2 gousses », « 1,5 kg », « 3 » (unités
 * simples), ou « au goût » quand il n'y a pas de quantité.
 */
export function formatQuantity(quantity: number | null, unit: Unit | null): string {
  if (quantity === null || unit === null) return i18next.t('recipes:toTaste');
  if (unit === 'UNIT') return formatNumber(quantity);
  return `${formatNumber(quantity)} ${formatUnit(unit, quantity)}`;
}

/** Date locale "AAAA-MM-JJ" → « 28 sept. » (sans décalage de fuseau). */
export function formatShortDate(isoDate: string): string {
  const [year = 1970, month = 1, day = 1] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(i18next.language, { day: 'numeric', month: 'short' }).format(
    new Date(year, month - 1, day),
  );
}
