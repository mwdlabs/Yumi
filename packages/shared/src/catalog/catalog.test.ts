import { describe, expect, it } from 'vitest';
import { ingredientKey } from '../domain/normalize';
import { UNITS } from '../domain/units';
import { DISH_TEMPLATES } from './dishes';
import { SUGGESTED_STAPLES } from './staples';
import { CATALOG_INGREDIENTS, categoryForName } from './ingredients';
import { dishIngredients, findDish, suggestDishes, suggestIngredients } from './search';

describe('intégrité du catalogue', () => {
  it("n'a pas deux ingrédients de même clé ni de même identifiant", () => {
    const keys = CATALOG_INGREDIENTS.map((i) => ingredientKey(i.name));
    const ids = CATALOG_INGREDIENTS.map((i) => i.id);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('utilise uniquement des unités de la liste fermée', () => {
    for (const ingredient of CATALOG_INGREDIENTS) {
      expect(UNITS).toContain(ingredient.defaultUnit);
    }
    for (const dish of DISH_TEMPLATES) {
      for (const row of dish.ingredients) {
        if (row.unit !== null) expect(UNITS).toContain(row.unit);
        // Quantité et unité vont ensemble (« au goût » = les deux nulles).
        expect(row.quantity === null).toBe(row.unit === null);
      }
    }
  });

  it('a des plats aux identifiants uniques, sans ingrédient en double', () => {
    const ids = DISH_TEMPLATES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const dish of DISH_TEMPLATES) {
      const names = dishIngredients(dish).map((i) => ingredientKey(i.name));
      expect(new Set(names).size, dish.name).toBe(names.length);
    }
  });

  it('couvre les plats sénégalais, les pâtes, vermicelles et couscous', () => {
    const names = DISH_TEMPLATES.map((d) => d.name);
    for (const expected of [
      'Thiéboudienne',
      'Yassa poulet',
      'Mafé',
      'Spaghetti bolognaise',
      'Vermicelles au poulet',
      'Couscous au poulet et légumes',
    ]) {
      expect(names).toContain(expected);
    }
  });
});

describe('suggestIngredients', () => {
  const names = (query: string, usage = []) => suggestIngredients(query, usage).map((s) => s.name);

  it('ignore accents et casse', () => {
    expect(names('pate')).toContain("Pâte d'arachide");
    expect(names('OIGN')[0]).toBe('Oignon');
  });

  it('reconnaît les noms locaux', () => {
    expect(names('guedj')).toContain('Poisson séché (guedj)');
    expect(names('jaxatu')).toContain('Aubergine amère (jaxatu)');
    expect(names('soumbala')).toContain('Nététou (soumbala)');
    expect(names('maggi')).toContain('Bouillon en cube');
  });

  it("propose d'abord les ingrédients déjà utilisés par la famille", () => {
    const suggestions = suggestIngredients('pi', [{ name: 'Piment du jardin', unit: 'UNIT' }]);
    expect(suggestions[0]).toMatchObject({ name: 'Piment du jardin', source: 'family' });
  });

  it('ne duplique pas un ingrédient de la famille déjà au catalogue', () => {
    const suggestions = suggestIngredients('oignon', [{ name: 'oignons', unit: 'UNIT' }]);
    expect(suggestions.filter((s) => s.name.toLowerCase().startsWith('oignon'))).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({ name: 'oignons', category: 'produce' });
  });

  it("propose l'unité par défaut du catalogue", () => {
    expect(suggestIngredients('ail')[0]).toMatchObject({ name: 'Ail', unit: 'CLOVE' });
  });
});

describe('plats', () => {
  it('trouve un plat par nom partiel ou alias', () => {
    // Les noms qui commencent par la saisie passent avant les correspondances d'alias.
    expect(suggestDishes('yassa').map((d) => d.id)).toEqual([
      'yassa-poulet',
      'yassa-poisson',
      'vermicelles-poulet',
    ]);
    expect(suggestDishes('ceebu').map((d) => d.id)).toContain('thieboudienne');
    expect(suggestDishes('')).toEqual([]);
  });

  it('reconnaît un nom exact, alias compris', () => {
    expect(findDish('thieb')?.id).toBe('thieboudienne');
    expect(findDish('Mafé')?.id).toBe('mafe');
    expect(findDish('Mon plat inventé')).toBeNull();
  });

  it('fournit les ingrédients habituels avec les noms du catalogue', () => {
    const mafe = findDish('mafe');
    expect(mafe && dishIngredients(mafe)).toContainEqual({
      name: "Pâte d'arachide",
      quantity: 400,
      unit: 'G',
    });
  });
});

describe('articles de maison et rayons', () => {
  it("n'apparaissent dans les suggestions que pour la liste de courses", () => {
    expect(suggestIngredients('papier').map((s) => s.name)).not.toContain('Papier de toilette');
    expect(
      suggestIngredients('papier', [], 12, { includeHousehold: true }).map((s) => s.name),
    ).toContain('Papier de toilette');
  });

  it('trouve le rayon par nom ou alias, pluriel et casse confondus', () => {
    expect(categoryForName('oignons')).toBe('produce');
    expect(categoryForName('Maggi')).toBe('pantry');
    expect(categoryForName('PQ')).toBe('household');
    expect(categoryForName('Truc inconnu')).toBeNull();
  });
});

describe('essentiels suggérés', () => {
  it('référencent tous un ingrédient du catalogue, sans doublon', () => {
    const ids = new Set(CATALOG_INGREDIENTS.map((i) => i.id));
    for (const id of SUGGESTED_STAPLES) expect(ids.has(id), id).toBe(true);
    expect(new Set(SUGGESTED_STAPLES).size).toBe(SUGGESTED_STAPLES.length);
  });
});
