import { describe, expect, it } from 'vitest';
import { ingredientKey, normalizeText } from './normalize';

describe('normalizeText', () => {
  it('retire casse, accents, ponctuation et espaces superflus', () => {
    expect(normalizeText('  Pâte d’arachide ')).toBe('pate d arachide');
    expect(normalizeText('Thiéboudienne')).toBe('thieboudienne');
    expect(normalizeText('Œufs')).toBe('oeufs');
  });
});

describe('ingredientKey', () => {
  it.each([
    ['Tomates', 'tomate'],
    ['tomate', 'tomate'],
    ['Pommes de terre', 'pomme de terre'],
    ['Poireaux', 'poireau'],
    ['Choux', 'chou'],
    ['Oignons', 'oignon'],
    ['Vermicelles', 'vermicelle'],
    ['Haricots niébé', 'haricot niebe'],
  ])('%s → %s', (input, expected) => {
    expect(ingredientKey(input)).toBe(expected);
  });

  it.each(['riz', 'pois', 'noix', 'couscous', 'ananas', 'radis', 'jus'])(
    'garde les mots invariables (%s)',
    (word) => {
      expect(ingredientKey(word)).toBe(word);
    },
  );

  it('ne devine aucune équivalence sémantique', () => {
    expect(ingredientKey("Gousses d'ail")).not.toBe(ingredientKey('Ail'));
  });
});
