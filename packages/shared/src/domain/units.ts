/**
 * Liste fermée des unités de recette (identique à l'enum Prisma `Unit`).
 * La conversion entre unités d'une même dimension sera utilisée par la fusion
 * des ingrédients de la liste de courses.
 */
export const UNITS = [
  'G',
  'KG',
  'ML',
  'L',
  'TSP',
  'TBSP',
  'CUP',
  'UNIT',
  'PINCH',
  'CLOVE',
  'CAN',
  'PACK',
  'SLICE',
  'BUNCH',
] as const;
export type Unit = (typeof UNITS)[number];

/** Unités proposées en premier dans les sélecteurs (les plus courantes). */
export const COMMON_UNITS: readonly Unit[] = ['UNIT', 'G', 'KG', 'ML', 'L', 'TBSP', 'TSP', 'CUP'];

/** Dimensions convertibles entre elles ; les unités de compte ne se convertissent jamais. */
const MASS_UNITS: readonly Unit[] = ['G', 'KG'];
const VOLUME_UNITS: readonly Unit[] = ['ML', 'L', 'TSP', 'TBSP', 'CUP'];

/**
 * Dimension d'une unité, telle que stockée sur les quantités de la liste de
 * courses : "mass", "volume", "count:<UNITÉ>", ou "none" (sans quantité).
 */
export function unitDimension(unit: Unit | null): string {
  if (unit === null) return 'none';
  if (MASS_UNITS.includes(unit)) return 'mass';
  if (VOLUME_UNITS.includes(unit)) return 'volume';
  return `count:${unit}`;
}
