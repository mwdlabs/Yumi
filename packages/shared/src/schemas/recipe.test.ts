import { describe, expect, it } from 'vitest';
import { recipeBodySchema } from './recipe';

describe('recipeBodySchema', () => {
  const base = { name: 'Yassa poulet', ingredients: [] };

  it('accepte une recette sans ingrédients et met les portions à null', () => {
    expect(recipeBodySchema.parse(base)).toEqual({ ...base, servings: null });
  });

  it('accepte un ingrédient « au goût » (quantité et unité nulles)', () => {
    const parsed = recipeBodySchema.parse({
      ...base,
      ingredients: [{ name: 'Sel', quantity: null, unit: null }],
    });
    expect(parsed.ingredients[0]).toEqual({ name: 'Sel', quantity: null, unit: null });
  });

  it('refuse une quantité sans unité, ou une unité sans quantité', () => {
    for (const ingredient of [
      { name: 'Oignon', quantity: 3, unit: null },
      { name: 'Oignon', quantity: null, unit: 'UNIT' },
    ]) {
      expect(recipeBodySchema.safeParse({ ...base, ingredients: [ingredient] }).success).toBe(
        false,
      );
    }
  });

  it('refuse une unité hors liste et une quantité négative', () => {
    for (const ingredient of [
      { name: 'Riz', quantity: 1, unit: 'LIVRE' },
      { name: 'Riz', quantity: -1, unit: 'KG' },
    ]) {
      expect(recipeBodySchema.safeParse({ ...base, ingredients: [ingredient] }).success).toBe(
        false,
      );
    }
  });

  it('arrondit les quantités au millième', () => {
    const parsed = recipeBodySchema.parse({
      ...base,
      ingredients: [{ name: 'Riz', quantity: 0.33333, unit: 'KG' }],
    });
    expect(parsed.ingredients[0]?.quantity).toBe(0.333);
  });
});
