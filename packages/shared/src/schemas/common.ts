import { z } from 'zod';

/** Adresse courriel normalisée (espaces retirés, minuscules). */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/** Code à usage unique de 6 chiffres (OTP, invitation, jumelage). */
export const sixDigitCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres.' });

/** Jour de la semaine ISO 8601 : 1 = lundi … 7 = dimanche. */
export const isoWeekdaySchema = z.number().int().min(1).max(7);
export type IsoWeekday = z.infer<typeof isoWeekdaySchema>;

/** Heure murale locale au format "HH:mm" (24 h). */
export const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Heure invalide (HH:mm).' });
