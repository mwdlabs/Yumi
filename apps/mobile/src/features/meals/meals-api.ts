import type { CreateMealBody, MealDto, UpdateMealBody, WeekPlanDto } from '@yumi/shared';
import { apiClient } from '@/lib/api-client';

const familyPath = (familyId: string) => `/families/${encodeURIComponent(familyId)}`;

export const mealsApi = {
  /** `date` : n'importe quel jour de la semaine voulue ; absent = semaine en cours. */
  getWeek: (familyId: string, date?: string) =>
    apiClient.request<WeekPlanDto>(
      'GET',
      `${familyPath(familyId)}/week${date ? `?date=${encodeURIComponent(date)}` : ''}`,
    ),

  create: (familyId: string, body: CreateMealBody) =>
    apiClient.request<MealDto>('POST', `${familyPath(familyId)}/meals`, { body }),

  update: (familyId: string, mealId: string, body: UpdateMealBody) =>
    apiClient.request<MealDto>(
      'PATCH',
      `${familyPath(familyId)}/meals/${encodeURIComponent(mealId)}`,
      { body },
    ),

  remove: (familyId: string, mealId: string) =>
    apiClient.request<void>(
      'DELETE',
      `${familyPath(familyId)}/meals/${encodeURIComponent(mealId)}`,
    ),
};
