import { ingredientKey } from './normalize';
import { unitDimension, UNITS, type Unit } from './units';

/**
 * Fusion des ingrédients en liste de courses (fonction pure).
 *
 * Règles :
 * 1. Les lignes sont regroupées par clé normalisée (casse, accents, pluriel simple).
 * 2. Dans un groupe, les quantités s'additionnent par dimension :
 *    - masse (g, kg) et volume (ml, L, c. à thé, c. à soupe, tasse) se convertissent ;
 *    - chaque unité de compte (unité, gousse, boîte…) est sa propre dimension ;
 *    - aucune conversion entre dimensions : « 2 unités + 200 g » restent deux quantités.
 * 3. Unité affichée : si toutes les lignes d'une dimension ont la même unité, on la
 *    garde (3 tasses) ; sinon on passe en métrique (g/ml), puis kg/L à partir de 1000.
 * 4. « Au goût » (sans quantité) n'apparaît que si aucune quantité n'est connue.
 * 5. Calcul en millièmes entiers : pas d'erreur d'arrondi flottant.
 */

export interface IngredientLine<S = unknown> {
  name: string;
  quantity: number | null;
  unit: Unit | null;
  source: S;
}

export interface MergedQuantity {
  /** "mass" | "volume" | "count:<UNITÉ>" | "none" */
  dimension: string;
  amount: number | null;
  unit: Unit | null;
}

export interface MergedItem<S = unknown> {
  key: string;
  /** Nom affiché : première forme saisie. */
  label: string;
  /** Une quantité par dimension, dans un ordre stable. */
  quantities: MergedQuantity[];
  sources: S[];
}

/** Facteur vers l'unité de base de la dimension (g ou ml), en millièmes entiers. */
const BASE_FACTOR: Partial<Record<Unit, number>> = {
  G: 1,
  KG: 1000,
  ML: 1,
  L: 1000,
  TSP: 5, // c. à thé
  TBSP: 15, // c. à soupe
  CUP: 250, // tasse métrique canadienne
};

/** Quantité en millièmes d'unité de base (entier). */
export function toThousandthsOfBase(amount: number, unit: Unit): number {
  return Math.round(amount * 1000) * (BASE_FACTOR[unit] ?? 1);
}

const roundThousandth = (thousandths: number) => Math.round(thousandths) / 1000;

/** Inverse de `toThousandthsOfBase` : millièmes d'unité de base → quantité dans `unit`. */
export function fromThousandthsOfBase(thousandths: number, unit: Unit): number {
  return roundThousandth(thousandths / (BASE_FACTOR[unit] ?? 1));
}

function dimensionOrder(dimension: string): number {
  if (dimension === 'mass') return 0;
  if (dimension === 'volume') return 1;
  if (dimension === 'none') return 1000;
  return 2 + UNITS.indexOf(dimension.slice('count:'.length) as Unit);
}

/** Somme d'une dimension convertible, avec choix de l'unité d'affichage. */
function sumConvertible(
  dimension: 'mass' | 'volume',
  lines: readonly { quantity: number; unit: Unit }[],
): MergedQuantity {
  const units = new Set(lines.map((line) => line.unit));
  const [onlyUnit] = units;
  if (units.size === 1 && onlyUnit) {
    const total = lines.reduce((sum, line) => sum + Math.round(line.quantity * 1000), 0);
    return { dimension, unit: onlyUnit, amount: roundThousandth(total) };
  }
  const base = lines.reduce((sum, line) => sum + toThousandthsOfBase(line.quantity, line.unit), 0);
  const big = base >= 1_000_000; // ≥ 1000 g ou 1000 ml
  if (dimension === 'mass') {
    return { dimension, unit: big ? 'KG' : 'G', amount: roundThousandth(big ? base / 1000 : base) };
  }
  return { dimension, unit: big ? 'L' : 'ML', amount: roundThousandth(big ? base / 1000 : base) };
}

export function mergeIngredients<S>(lines: readonly IngredientLine<S>[]): MergedItem<S>[] {
  const groups = new Map<string, IngredientLine<S>[]>();
  for (const line of lines) {
    const key = ingredientKey(line.name);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(line);
    else groups.set(key, [line]);
  }

  const items: MergedItem<S>[] = [];
  for (const [key, group] of groups) {
    const byDimension = new Map<string, IngredientLine<S>[]>();
    for (const line of group) {
      const dimension = line.quantity === null ? 'none' : unitDimension(line.unit);
      byDimension.set(dimension, [...(byDimension.get(dimension) ?? []), line]);
    }

    const quantities: MergedQuantity[] = [];
    for (const [dimension, dimensionLines] of byDimension) {
      if (dimension === 'none') continue;
      const quantified = dimensionLines.flatMap((line) =>
        line.quantity !== null && line.unit !== null
          ? [{ quantity: line.quantity, unit: line.unit }]
          : [],
      );
      if (dimension === 'mass' || dimension === 'volume') {
        quantities.push(sumConvertible(dimension, quantified));
      } else {
        const total = quantified.reduce((sum, line) => sum + Math.round(line.quantity * 1000), 0);
        quantities.push({
          dimension,
          unit: quantified[0]?.unit ?? null,
          amount: roundThousandth(total),
        });
      }
    }
    if (quantities.length === 0) quantities.push({ dimension: 'none', unit: null, amount: null });
    quantities.sort((a, b) => dimensionOrder(a.dimension) - dimensionOrder(b.dimension));

    items.push({
      key,
      label: group[0]?.name.trim() ?? key,
      quantities,
      sources: group.map((line) => line.source),
    });
  }
  return items;
}

/**
 * Vrai si `next` demande plus que `previous` dans au moins une dimension
 * (sert à détecter qu'un article déjà acheté doit être complété).
 */
export function needsMoreThan(
  next: readonly MergedQuantity[],
  previous: readonly MergedQuantity[],
): boolean {
  const toBase = (quantity: MergedQuantity) =>
    quantity.amount === null || quantity.unit === null
      ? 0
      : toThousandthsOfBase(quantity.amount, quantity.unit);
  return next.some((quantity) => {
    if (quantity.dimension === 'none') return false;
    const before = previous.find((p) => p.dimension === quantity.dimension);
    return !before || toBase(quantity) > toBase(before);
  });
}
