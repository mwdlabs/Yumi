import { z } from 'zod';
import type { IngredientCategory } from '../catalog/ingredients';
import { UNITS, type Unit } from '../domain/units';

const stapleFields = {
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

/** POST /families/:familyId/staples */
export const stapleBodySchema = z.object(stapleFields).refine(quantityAndUnitTogether, {
  message: 'La quantité et l’unité vont ensemble.',
  path: ['unit'],
});
export type StapleBody = z.input<typeof stapleBodySchema>;

/** POST /families/:familyId/staples/batch : plusieurs essentiels d'un coup (suggestions). */
export const staplesBatchBodySchema = z.object({
  staples: z.array(stapleBodySchema).min(1).max(50),
});
export type StaplesBatchBody = z.input<typeof staplesBatchBodySchema>;

/** PATCH /families/:familyId/staples/:stapleId */
export const updateStapleBodySchema = z
  .object(stapleFields)
  .partial()
  .refine(quantityAndUnitTogether, {
    message: 'La quantité et l’unité vont ensemble.',
    path: ['unit'],
  });
export type UpdateStapleBody = z.input<typeof updateStapleBodySchema>;

export interface StapleDto {
  id: string;
  name: string;
  quantity: number | null;
  unit: Unit | null;
  category: IngredientCategory | null;
}
