import type { Unit } from '@yumi/shared';

/** Ingrédient en cours d'édition (clé locale stable pour les listes React). */
export interface DraftIngredient {
  key: string;
  name: string;
  quantity: number | null;
  unit: Unit | null;
}

let counter = 0;
export const newDraftKey = () => `draft-${Date.now()}-${counter++}`;
