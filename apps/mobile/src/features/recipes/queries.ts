import { useQuery, useQueryClient } from '@tanstack/react-query';
import { recipesApi } from './recipes-api';

export const recipeKeys = {
  all: (familyId: string) => ['family', familyId, 'recipes'] as const,
  detail: (familyId: string, recipeId: string) =>
    ['family', familyId, 'recipes', recipeId] as const,
  familyIngredients: (familyId: string) => ['family', familyId, 'ingredients'] as const,
};

export function useRecipes(familyId: string) {
  return useQuery({
    queryKey: recipeKeys.all(familyId),
    queryFn: () => recipesApi.list(familyId),
    enabled: !!familyId,
  });
}

export function useRecipe(familyId: string, recipeId: string) {
  return useQuery({
    queryKey: recipeKeys.detail(familyId, recipeId),
    queryFn: () => recipesApi.get(familyId, recipeId),
    enabled: !!familyId && !!recipeId,
  });
}

export function useFamilyIngredients(familyId: string) {
  return useQuery({
    queryKey: recipeKeys.familyIngredients(familyId),
    queryFn: () => recipesApi.familyIngredients(familyId),
    enabled: !!familyId,
    staleTime: 5 * 60_000,
  });
}

/** Invalide tout ce qui dépend des recettes (liste, détails, ingrédients suggérés). */
export function useInvalidateRecipes(familyId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient
      .invalidateQueries({ queryKey: recipeKeys.all(familyId) })
      .then(() =>
        queryClient.invalidateQueries({ queryKey: recipeKeys.familyIngredients(familyId) }),
      );
}
