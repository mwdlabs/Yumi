import { z } from 'zod';
import type { IngredientCategory } from '../catalog/ingredients';
import { isIsoDate } from '../domain/week';
import { UNITS, type Unit } from '../domain/units';

/** Date locale "YYYY-MM-DD". */
export const isoDateSchema = z
  .string()
  .refine(isIsoDate, { message: 'Date invalide (AAAA-MM-JJ).' });

const itemFields = {
  name: z.string().trim().min(1).max(60),
  quantity: z
    .number()
    .positive()
    .max(100_000)
    .transform((value) => Math.round(value * 1000) / 1000)
    .nullable(),
  unit: z.enum(UNITS).nullable(),
};

const quantityAndUnitTogether = (value: { quantity?: unknown; unit?: unknown }) =>
  (value.quantity === undefined) === (value.unit === undefined) &&
  (value.quantity === null) === (value.unit === null);

/** GET /families/:familyId/shopping-list?date=AAAA-MM-JJ (n'importe quel jour de la semaine). */
export const shoppingListQuerySchema = z.object({ date: isoDateSchema.optional() });

/** POST /families/:familyId/shopping-list/items : article ajouté à la main. */
export const addShoppingItemBodySchema = z
  .object({ date: isoDateSchema, ...itemFields })
  .refine(quantityAndUnitTogether, {
    message: 'La quantité et l’unité vont ensemble.',
    path: ['unit'],
  });
export type AddShoppingItemBody = z.input<typeof addShoppingItemBodySchema>;

/**
 * PATCH /families/:familyId/shopping-list/items/:itemId
 * `checked` pour tous les articles ; nom et quantité pour les articles ajoutés à la main.
 */
export const updateShoppingItemBodySchema = z
  .object({ checked: z.boolean(), ...itemFields })
  .partial()
  .refine(quantityAndUnitTogether, {
    message: 'La quantité et l’unité vont ensemble.',
    path: ['unit'],
  });
export type UpdateShoppingItemBody = z.input<typeof updateShoppingItemBodySchema>;

// ─── Réponses ────────────────────────────────────────────────────────────────

export interface ShoppingQuantityDto {
  amount: number | null;
  unit: Unit | null;
}

export interface ShoppingItemDto {
  id: string;
  name: string;
  /**
   * Quantité totale à acheter, une par dimension (ex. « 2 unités » et « 200 g »).
   * Liste vide ou [{ amount: null }] = sans quantité.
   */
  quantities: ShoppingQuantityDto[];
  /** Part ajoutée à la main (modifiable) ; null si l'article vient uniquement des recettes. */
  manual: ShoppingQuantityDto | null;
  /** Plats de la semaine qui demandent cet article. */
  fromRecipes: { recipeName: string; date: string }[];
  /** Rayon déduit du catalogue ; null si l'article est inconnu. */
  category: IngredientCategory | null;
  /** Ajouté automatiquement depuis les essentiels de la famille. */
  isStaple: boolean;
  checked: boolean;
  /**
   * Changement survenu après le cochage : `INCREASED` (un plat en demande plus : à
   * compléter), `NO_LONGER_NEEDED` (le plat a été retiré, déjà acheté).
   */
  change: 'INCREASED' | 'NO_LONGER_NEEDED' | null;
  checkedBy: { id: string; displayName: string } | null;
  /** Membre ayant ajouté l'article à la main ; null pour les articles des recettes. */
  addedBy: { id: string; displayName: string } | null;
  addedAt: string;
}

export interface ShoppingListDto {
  /** Premier et dernier jours (inclus) de la semaine, dates locales. */
  startDate: string;
  endDate: string;
  /** Semaine en cours dans le fuseau de la famille. */
  isCurrentWeek: boolean;
  previousStartDate: string;
  nextStartDate: string;
  status: 'OPEN' | 'LIST_GENERATED' | 'SHOPPING_DONE';
  /** Articles non cochés d'abord, puis cochés ; ordre d'ajout à l'intérieur. */
  items: ShoppingItemDto[];
}
