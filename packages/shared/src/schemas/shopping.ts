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

export interface ShoppingItemDto {
  id: string;
  name: string;
  quantity: number | null;
  unit: Unit | null;
  /** Rayon déduit du catalogue ; null si l'article est inconnu. */
  category: IngredientCategory | null;
  isManual: boolean;
  /** Ajouté automatiquement depuis les essentiels de la famille. */
  isStaple: boolean;
  checked: boolean;
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
