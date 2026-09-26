import { describe, expect, it } from 'vitest';
import {
  fromThousandthsOfBase,
  mergeIngredients,
  needsMoreThan,
  toThousandthsOfBase,
  type IngredientLine,
} from './merge';
import type { Unit } from './units';

const line = (
  name: string,
  quantity: number | null,
  unit: Unit | null,
  source = name,
): IngredientLine<string> => ({ name, quantity, unit, source });

const merge = (...lines: IngredientLine<string>[]) => mergeIngredients(lines);

describe('mergeIngredients — regroupement', () => {
  it('fusionne casse, accents, espaces et pluriel simple', () => {
    const [item, ...rest] = merge(
      line('Tomates', 2, 'UNIT', 'a'),
      line('  tomate ', 3, 'UNIT', 'b'),
      line('TOMATE', 1, 'UNIT', 'c'),
    );
    expect(rest).toHaveLength(0);
    expect(item).toEqual({
      key: 'tomate',
      label: 'Tomates',
      quantities: [{ dimension: 'count:UNIT', unit: 'UNIT', amount: 6 }],
      sources: ['a', 'b', 'c'],
    });
  });

  it('garde des articles distincts sans équivalence devinée', () => {
    expect(merge(line('Ail', 3, 'CLOVE'), line('Oignon', 2, 'UNIT'))).toHaveLength(2);
  });

  it('ignore les noms vides et une entrée vide', () => {
    expect(merge()).toEqual([]);
    expect(merge(line('   ', 1, 'UNIT'))).toEqual([]);
  });
});

describe('mergeIngredients — unités', () => {
  it('garde l’unité quand toutes les lignes l’utilisent (3 tasses)', () => {
    expect(merge(line('Farine', 1, 'CUP'), line('Farine', 2, 'CUP'))[0]?.quantities).toEqual([
      { dimension: 'volume', unit: 'CUP', amount: 3 },
    ]);
  });

  it('convertit la masse : 500 g + 1 kg = 1,5 kg', () => {
    expect(merge(line('Riz', 500, 'G'), line('Riz', 1, 'KG'))[0]?.quantities).toEqual([
      { dimension: 'mass', unit: 'KG', amount: 1.5 },
    ]);
  });

  it('reste en grammes sous 1 kg', () => {
    expect(merge(line('Beurre', 0.25, 'KG'), line('Beurre', 50, 'G'))[0]?.quantities).toEqual([
      { dimension: 'mass', unit: 'G', amount: 300 },
    ]);
  });

  it('convertit le volume : 2 c. à soupe + 1 c. à thé = 35 ml', () => {
    expect(merge(line('Moutarde', 2, 'TBSP'), line('Moutarde', 1, 'TSP'))[0]?.quantities).toEqual([
      { dimension: 'volume', unit: 'ML', amount: 35 },
    ]);
  });

  it('passe en litres à partir de 1000 ml : 1 tasse + 800 ml = 1,05 L', () => {
    expect(merge(line('Lait', 1, 'CUP'), line('Lait', 800, 'ML'))[0]?.quantities).toEqual([
      { dimension: 'volume', unit: 'L', amount: 1.05 },
    ]);
  });

  it('ne convertit jamais entre dimensions : « 2 unités + 200 g »', () => {
    expect(merge(line('Tomates', 2, 'UNIT'), line('tomate', 200, 'G'))[0]?.quantities).toEqual([
      { dimension: 'mass', unit: 'G', amount: 200 },
      { dimension: 'count:UNIT', unit: 'UNIT', amount: 2 },
    ]);
  });

  it('additionne chaque unité de compte séparément', () => {
    expect(
      merge(line('Ail', 3, 'CLOVE'), line('Ail', 2, 'CLOVE'), line('Ail', 1, 'UNIT'))[0]
        ?.quantities,
    ).toEqual([
      { dimension: 'count:UNIT', unit: 'UNIT', amount: 1 },
      { dimension: 'count:CLOVE', unit: 'CLOVE', amount: 5 },
    ]);
  });

  it('calcule sans erreur d’arrondi flottant (0,1 + 0,2)', () => {
    expect(merge(line('Riz', 0.1, 'KG'), line('Riz', 0.2, 'KG'))[0]?.quantities[0]?.amount).toBe(
      0.3,
    );
  });
});

describe('mergeIngredients — « au goût »', () => {
  it('reste « au goût » si aucune quantité n’est connue', () => {
    expect(merge(line('Sel', null, null), line('sel', null, null))[0]?.quantities).toEqual([
      { dimension: 'none', unit: null, amount: null },
    ]);
  });

  it('affiche seulement la quantité connue quand on mélange', () => {
    expect(merge(line('Piment', null, null), line('Piment', 2, 'UNIT'))[0]?.quantities).toEqual([
      { dimension: 'count:UNIT', unit: 'UNIT', amount: 2 },
    ]);
  });
});

describe('mergeIngredients — propriétés', () => {
  it('ne dépend pas de l’ordre des lignes (quantités)', () => {
    const lines = [line('Oignon', 3, 'UNIT'), line('Riz', 1, 'KG'), line('oignons', 5, 'UNIT')];
    const byKey = (items: ReturnType<typeof merge>) =>
      Object.fromEntries(items.map((item) => [item.key, item.quantities]));
    expect(byKey(mergeIngredients([...lines].reverse()))).toEqual(byKey(mergeIngredients(lines)));
  });

  it('est idempotent : refusionner le résultat ne change pas les quantités', () => {
    const once = merge(line('Lait', 1, 'CUP'), line('Lait', 800, 'ML'), line('Riz', 500, 'G'));
    const again = mergeIngredients(
      once.flatMap((item) =>
        item.quantities.map((q) => ({
          name: item.label,
          quantity: q.amount,
          unit: q.unit,
          source: item.key,
        })),
      ),
    );
    expect(again.map((i) => i.quantities)).toEqual(once.map((i) => i.quantities));
  });
});

describe('needsMoreThan', () => {
  const q = (amount: number, unit: Unit, dimension: string) => ({ amount, unit, dimension });

  it('détecte une hausse, même dans une autre unité', () => {
    expect(needsMoreThan([q(1.2, 'KG', 'mass')], [q(1000, 'G', 'mass')])).toBe(true);
    expect(needsMoreThan([q(900, 'G', 'mass')], [q(1, 'KG', 'mass')])).toBe(false);
  });

  it('considère une nouvelle dimension comme une hausse', () => {
    expect(needsMoreThan([q(2, 'UNIT', 'count:UNIT')], [q(200, 'G', 'mass')])).toBe(true);
  });
});

describe('conversions de base', () => {
  it('fait l’aller-retour entre unités', () => {
    expect(fromThousandthsOfBase(toThousandthsOfBase(1.5, 'KG'), 'G')).toBe(1500);
    expect(fromThousandthsOfBase(toThousandthsOfBase(2, 'TBSP'), 'ML')).toBe(30);
    expect(fromThousandthsOfBase(toThousandthsOfBase(250, 'ML'), 'CUP')).toBe(1);
  });
});
