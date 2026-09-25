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
