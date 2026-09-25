import { ingredientKey, normalizeText } from '../domain/normalize';
import type { Unit } from '../domain/units';
import { DISH_TEMPLATES, type DishTemplate } from './dishes';
import {
  CATALOG_INGREDIENTS,
  getCatalogIngredient,
  type CatalogIngredient,
  type IngredientCategory,
} from './ingredients';

/** Suggestion d'ingrédient proposée pendant la saisie. */
export interface IngredientSuggestion {
  name: string;
  unit: Unit | null;
  category: IngredientCategory | null;
  /** `family` : déjà utilisé dans une recette de la famille ; `catalog` : catalogue. */
  source: 'family' | 'catalog';
}

/** Ingrédient déjà utilisé par la famille (fourni par l'API). */
export interface FamilyIngredientUsage {
  name: string;
  unit: Unit | null;
}

/**
 * Score de correspondance d'un texte avec la requête (plus petit = meilleur) :
 * 0 = commence par la requête, 1 = un mot commence par la requête,
 * 2 = contient la requête, null = aucune correspondance.
 */
function matchScore(candidate: string, query: string): number | null {
  const text = normalizeText(candidate);
  if (text.startsWith(query)) return 0;
  if (text.split(' ').some((word) => word.startsWith(query))) return 1;
  if (text.includes(query)) return 2;
  return null;
}

function bestScore(names: readonly string[], query: string): number | null {
  const scores = names.map((name) => matchScore(name, query)).filter((s) => s !== null);
  return scores.length > 0 ? Math.min(...scores) : null;
}

const catalogNames = (ingredient: CatalogIngredient) => [
  ingredient.name,
  ...(ingredient.aliases ?? []),
];

/**
 * Suggestions d'ingrédients pour une saisie : les ingrédients déjà utilisés
 * par la famille d'abord, puis le catalogue. Accents, casse et pluriels
 * n'ont pas d'importance ; les noms locaux (guedj, jaxatu…) sont reconnus.
 * Sans requête, retourne les ingrédients de la famille puis tout le catalogue.
 */
export function suggestIngredients(
  rawQuery: string,
  familyUsage: readonly FamilyIngredientUsage[] = [],
  limit = 12,
): IngredientSuggestion[] {
  const query = normalizeText(rawQuery);
  const seen = new Set<string>();
  const scored: { suggestion: IngredientSuggestion; score: number; order: number }[] = [];

  const catalogByKey = new Map(
    CATALOG_INGREDIENTS.map((ingredient) => [ingredientKey(ingredient.name), ingredient]),
  );

  familyUsage.forEach((usage, order) => {
    const key = ingredientKey(usage.name);
    if (seen.has(key)) return;
    const score = query ? matchScore(usage.name, query) : 0;
    if (score === null) return;
    seen.add(key);
    scored.push({
      suggestion: {
        name: usage.name,
        unit: usage.unit,
        category: catalogByKey.get(key)?.category ?? null,
        source: 'family',
      },
      // Les habitudes de la famille passent avant le catalogue à score égal.
      score: score * 2,
      order,
    });
  });

  CATALOG_INGREDIENTS.forEach((ingredient, index) => {
    const key = ingredientKey(ingredient.name);
    if (seen.has(key)) return;
    const score = query ? bestScore(catalogNames(ingredient), query) : 0;
    if (score === null) return;
    seen.add(key);
    scored.push({
      suggestion: {
        name: ingredient.name,
        unit: ingredient.defaultUnit,
        category: ingredient.category,
        source: 'catalog',
      },
      score: score * 2 + 1,
      order: familyUsage.length + index,
    });
  });

  return scored
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.suggestion);
}

/** Plats du catalogue correspondant à une saisie de nom de recette. */
export function suggestDishes(rawQuery: string, limit = 6): DishTemplate[] {
  const query = normalizeText(rawQuery);
  if (!query) return [];
  return DISH_TEMPLATES.map((dish, order) => ({
    dish,
    order,
    score: bestScore([dish.name, ...(dish.aliases ?? [])], query),
  }))
    .filter((entry): entry is typeof entry & { score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score || a.order - b.order)
    .slice(0, limit)
    .map((entry) => entry.dish);
}

/** Plat du catalogue dont le nom (ou un alias) correspond exactement à la saisie. */
export function findDish(rawName: string): DishTemplate | null {
  const query = normalizeText(rawName);
  if (!query) return null;
  return (
    DISH_TEMPLATES.find((dish) =>
      [dish.name, ...(dish.aliases ?? [])].some((name) => normalizeText(name) === query),
    ) ?? null
  );
}

/** Ingrédients d'un plat du catalogue, prêts à placer dans une recette. */
export function dishIngredients(
  dish: DishTemplate,
): { name: string; quantity: number | null; unit: Unit | null }[] {
  return dish.ingredients.map((row) => ({
    name: getCatalogIngredient(row.ingredient).name,
    quantity: row.quantity,
    unit: row.unit,
  }));
}
