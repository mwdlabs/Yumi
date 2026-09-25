import type { FamilyIngredientDto, RecipeBody, RecipeDto, RecipeSummaryDto } from '@yumi/shared';
import { apiClient } from '@/lib/api-client';

const recipesPath = (familyId: string) => `/families/${encodeURIComponent(familyId)}/recipes`;

export const recipesApi = {
  list: (familyId: string) => apiClient.request<RecipeSummaryDto[]>('GET', recipesPath(familyId)),

  get: (familyId: string, recipeId: string) =>
    apiClient.request<RecipeDto>('GET', `${recipesPath(familyId)}/${encodeURIComponent(recipeId)}`),

  create: (familyId: string, body: RecipeBody) =>
    apiClient.request<RecipeDto>('POST', recipesPath(familyId), { body }),

  update: (familyId: string, recipeId: string, body: RecipeBody) =>
    apiClient.request<RecipeDto>(
      'PUT',
      `${recipesPath(familyId)}/${encodeURIComponent(recipeId)}`,
      { body },
    ),

  archive: (familyId: string, recipeId: string) =>
    apiClient.request<void>('DELETE', `${recipesPath(familyId)}/${encodeURIComponent(recipeId)}`),

  familyIngredients: (familyId: string) =>
    apiClient.request<FamilyIngredientDto[]>(
      'GET',
      `/families/${encodeURIComponent(familyId)}/ingredients`,
    ),
};
