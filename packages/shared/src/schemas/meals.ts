import { z } from 'zod';
import type { AvatarColor, AvatarEmoji } from '../domain/avatar';
import { isoDateSchema } from './shopping';

/** POST /families/:familyId/meals : un plat prévu pour un jour (un seul plat par jour). */
export const createMealBodySchema = z.object({
  date: isoDateSchema,
  recipeId: z.string().min(1),
  /** Membre qui cuisine ; par défaut, celui qui ajoute le plat. */
  cookId: z.string().min(1).optional(),
});
export type CreateMealBody = z.input<typeof createMealBodySchema>;

/** PATCH /families/:familyId/meals/:mealId */
export const updateMealBodySchema = createMealBodySchema.partial();
export type UpdateMealBody = z.input<typeof updateMealBodySchema>;

/** GET /families/:familyId/week?date=AAAA-MM-JJ */
export const weekQuerySchema = z.object({ date: isoDateSchema.optional() });

export interface MealDto {
  id: string;
  date: string;
  recipe: { id: string; name: string };
  cook: {
    id: string;
    displayName: string;
    avatarColor: AvatarColor;
    avatarEmoji: AvatarEmoji | null;
  };
}

export interface WeekPlanDto {
  startDate: string;
  endDate: string;
  isCurrentWeek: boolean;
  previousStartDate: string;
  nextStartDate: string;
  /** Les 7 jours de la semaine, dans l'ordre, avec le plat prévu s'il y en a un. */
  days: { date: string; meal: MealDto | null }[];
}
