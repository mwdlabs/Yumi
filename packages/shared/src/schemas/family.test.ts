import { describe, expect, it } from 'vitest';
import {
  createFamilyBodySchema,
  memberProfileSchema,
  timezoneSchema,
  updateMemberBodySchema,
} from './family';

const validFamily = {
  name: 'Famille Tremblay',
  timezone: 'America/Toronto',
  weekStartsOn: 1,
  deadlineWeekday: 7,
  deadlineTime: '18:00',
};

describe('timezoneSchema', () => {
  it.each(['America/Toronto', 'America/Montreal', 'Europe/Paris', 'UTC'])('accepte %s', (tz) => {
    expect(timezoneSchema.safeParse(tz).success).toBe(true);
  });

  it.each(['Mars/Olympus', '', 'EST5EDT/Invalide'])('refuse %j', (tz) => {
    expect(timezoneSchema.safeParse(tz).success).toBe(false);
  });
});

describe('memberProfileSchema', () => {
  it('nettoie le nom et met l’emoji à null par défaut', () => {
    expect(memberProfileSchema.parse({ displayName: '  Léa ', avatarColor: 'honey' })).toEqual({
      displayName: 'Léa',
      avatarColor: 'honey',
      avatarEmoji: null,
    });
  });

  it('refuse une couleur ou un emoji hors liste', () => {
    expect(
      memberProfileSchema.safeParse({ displayName: 'Léa', avatarColor: '#FF0000' }).success,
    ).toBe(false);
    expect(
      memberProfileSchema.safeParse({ displayName: 'Léa', avatarColor: 'honey', avatarEmoji: '💣' })
        .success,
    ).toBe(false);
  });

  it('refuse un nom vide', () => {
    expect(
      memberProfileSchema.safeParse({ displayName: '   ', avatarColor: 'honey' }).success,
    ).toBe(false);
  });
});

describe('createFamilyBodySchema', () => {
  it('accepte une famille valide', () => {
    const result = createFamilyBodySchema.safeParse({
      family: validFamily,
      profile: { displayName: 'Maman', avatarColor: 'paprika', avatarEmoji: '🍅' },
    });
    expect(result.success).toBe(true);
  });

  it('refuse un jour ou une heure invalides', () => {
    const profile = { displayName: 'Maman', avatarColor: 'paprika' };
    expect(
      createFamilyBodySchema.safeParse({ family: { ...validFamily, deadlineWeekday: 8 }, profile })
        .success,
    ).toBe(false);
    expect(
      createFamilyBodySchema.safeParse({
        family: { ...validFamily, deadlineTime: '25:00' },
        profile,
      }).success,
    ).toBe(false);
  });
});

describe('updateMemberBodySchema', () => {
  it('accepte une mise à jour partielle', () => {
    expect(updateMemberBodySchema.parse({ isShoppingResponsible: true })).toEqual({
      isShoppingResponsible: true,
    });
  });
});

describe('updateMemberBodySchema (régression)', () => {
  it("n'efface pas l'emoji quand il est absent de la requête", () => {
    expect(updateMemberBodySchema.parse({ displayName: 'Léo' })).not.toHaveProperty('avatarEmoji');
  });

  it("permet de retirer l'emoji explicitement", () => {
    expect(updateMemberBodySchema.parse({ avatarEmoji: null })).toEqual({ avatarEmoji: null });
  });
});
