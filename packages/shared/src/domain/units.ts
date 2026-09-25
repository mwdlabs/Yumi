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
