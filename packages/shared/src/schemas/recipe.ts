import { z } from 'zod';
import { UNITS, type Unit } from '../domain/units';

/** Arrondi au millième : précision stockée en base (Decimal(10, 3)). */
const roundThousandth = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Ingrédient d'une recette. Quantité et unité vont ensemble :
 * les deux sont nulles pour « au goût » (ex. sel).
 */
export const recipeIngredientInputSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    quantity: z.number().positive().max(100_000).transform(roundThousandth).nullable(),
    unit: z.enum(UNITS).nullable(),
  })
  .refine((value) => (value.quantity === null) === (value.unit === null), {
    message: 'La quantité et l’unité vont ensemble (ou aucune des deux pour « au goût »).',
    path: ['unit'],
  });
export type RecipeIngredientInput = z.input<typeof recipeIngredientInputSchema>;

/** POST /families/:familyId/recipes et PUT /families/:familyId/recipes/:recipeId */
export const recipeBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
  /** Nombre de portions (sert plus tard à ajuster les quantités). */
  servings: z.number().int().min(1).max(50).nullable().default(null),
  /** Une recette peut être vide (ex. « Pizza commandée »). */
  ingredients: z.array(recipeIngredientInputSchema).max(60),
});
export type RecipeBody = z.input<typeof recipeBodySchema>;

// ─── Réponses ────────────────────────────────────────────────────────────────

export interface RecipeIngredientDto {
  id: string;
  name: string;
  quantity: number | null;
  unit: Unit | null;
}

export interface RecipeSummaryDto {
  id: string;
  name: string;
  servings: number | null;
  ingredientCount: number;
  updatedAt: string;
}

export interface RecipeDto {
  id: string;
  name: string;
  servings: number | null;
  ingredients: RecipeIngredientDto[];
  createdBy: { id: string; displayName: string };
  updatedAt: string;
}

/** GET /families/:familyId/ingredients : ingrédients déjà utilisés par la famille. */
export interface FamilyIngredientDto {
  name: string;
  unit: Unit | null;
  /** Nombre de recettes qui l'utilisent. */
  recipeCount: number;
}
