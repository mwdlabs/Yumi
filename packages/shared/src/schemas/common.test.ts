import { describe, expect, it } from 'vitest';
import { emailSchema, localTimeSchema, sixDigitCodeSchema } from './common';

describe('emailSchema', () => {
  it('normalise la casse et les espaces', () => {
    expect(emailSchema.parse('  Lea.Tremblay@Exemple.CA ')).toBe('lea.tremblay@exemple.ca');
  });

  it('refuse une adresse invalide', () => {
    expect(emailSchema.safeParse('pas-un-courriel').success).toBe(false);
  });
});

describe('sixDigitCodeSchema', () => {
  it.each(['123456', ' 000000 '])('accepte %j', (code) => {
    expect(sixDigitCodeSchema.safeParse(code).success).toBe(true);
  });

  it.each(['12345', '1234567', '12a456', ''])('refuse %j', (code) => {
    expect(sixDigitCodeSchema.safeParse(code).success).toBe(false);
  });
});

describe('localTimeSchema', () => {
  it.each(['00:00', '09:30', '23:59'])('accepte %s', (t) => {
    expect(localTimeSchema.safeParse(t).success).toBe(true);
  });

  it.each(['24:00', '9:30', '12:60', '12h30'])('refuse %s', (t) => {
    expect(localTimeSchema.safeParse(t).success).toBe(false);
  });
});
