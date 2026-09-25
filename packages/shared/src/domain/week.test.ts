import { describe, expect, it } from 'vitest';
import {
  isIsoDate,
  shiftWeek,
  weekDeadline,
  weekEndDate,
  weekStartFor,
  weekStartOfDate,
} from './week';

const TORONTO = 'America/Toronto';
const MONDAY = 1;
const SUNDAY = 7;

describe('weekStartFor', () => {
  it('calcule le lundi de la semaine dans le fuseau de la famille', () => {
    // Jeudi 24 septembre 2026, 15 h à Toronto.
    expect(weekStartFor(new Date('2026-09-24T19:00:00Z'), TORONTO, MONDAY)).toBe('2026-09-21');
  });

  it("utilise l'heure locale, pas l'heure UTC", () => {
    // Dimanche 27 sept. 23 h 30 à Toronto = lundi 28 sept. 03 h 30 UTC : encore dimanche.
    expect(weekStartFor(new Date('2026-09-28T03:30:00Z'), TORONTO, MONDAY)).toBe('2026-09-21');
  });

  it('respecte un début de semaine le dimanche', () => {
    expect(weekStartFor(new Date('2026-09-24T19:00:00Z'), TORONTO, SUNDAY)).toBe('2026-09-20');
    expect(weekStartFor(new Date('2026-09-27T16:00:00Z'), TORONTO, SUNDAY)).toBe('2026-09-27');
  });
});

describe('weekStartOfDate / shiftWeek / weekEndDate', () => {
  it('ramène une date quelconque au début de sa semaine', () => {
    expect(weekStartOfDate('2026-09-24', MONDAY)).toBe('2026-09-21');
    expect(weekStartOfDate('2026-09-21', MONDAY)).toBe('2026-09-21');
    expect(weekStartOfDate('2026-09-27', MONDAY)).toBe('2026-09-21');
  });

  it('passe d’une semaine à l’autre, y compris entre deux années', () => {
    expect(shiftWeek('2026-09-21', 1)).toBe('2026-09-28');
    expect(shiftWeek('2026-09-21', -1)).toBe('2026-09-14');
    expect(shiftWeek('2026-12-28', 1)).toBe('2027-01-04');
    expect(weekEndDate('2026-12-28')).toBe('2027-01-03');
  });
});

describe('weekDeadline', () => {
  it('place l’échéance la veille du début de semaine (heure avancée : UTC−4)', () => {
    expect(weekDeadline('2026-09-28', TORONTO, SUNDAY, '18:00').toISOString()).toBe(
      '2026-09-27T22:00:00.000Z',
    );
  });

  it("reste à 18 h locale après le passage à l'heure normale (UTC−5)", () => {
    // Retour à l'heure normale le dimanche 1er novembre 2026.
    expect(weekDeadline('2026-11-02', TORONTO, SUNDAY, '18:00').toISOString()).toBe(
      '2026-11-01T23:00:00.000Z',
    );
  });

  it('recule d’une semaine si le jour d’échéance est le premier jour de la semaine', () => {
    // Échéance « lundi 10 h » pour la semaine du lundi 28 : lundi 21 à 10 h.
    expect(weekDeadline('2026-09-28', TORONTO, MONDAY, '10:00').toISOString()).toBe(
      '2026-09-21T14:00:00.000Z',
    );
  });

  it('accepte un samedi matin', () => {
    expect(weekDeadline('2026-09-28', TORONTO, 6, '09:30').toISOString()).toBe(
      '2026-09-26T13:30:00.000Z',
    );
  });
});

describe('isIsoDate', () => {
  it.each(['2026-09-24', '2028-02-29'])('accepte %s', (d) => expect(isIsoDate(d)).toBe(true));
  it.each(['2026-02-30', '24/09/2026', '2026-9-4', ''])('refuse %j', (d) =>
    expect(isIsoDate(d)).toBe(false),
  );
});
