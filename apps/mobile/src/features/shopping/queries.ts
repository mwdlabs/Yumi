import type { ShoppingListDto } from '@yumi/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { shoppingApi } from './shopping-api';

/** Clé par semaine ; `current` tant que la date de début n'est pas connue. */
export const shoppingKeys = {
  list: (familyId: string, weekStart: string | undefined) =>
    ['family', familyId, 'shopping', weekStart ?? 'current'] as const,
  all: (familyId: string) => ['family', familyId, 'shopping'] as const,
};

/** Rafraîchissement régulier : les coches des autres membres apparaissent sans recharger. */
const LIVE_REFRESH_MS = 15_000;

export function useShoppingList(familyId: string, weekStart: string | undefined) {
  return useQuery({
    queryKey: shoppingKeys.list(familyId, weekStart),
    queryFn: () => shoppingApi.getList(familyId, weekStart),
    enabled: !!familyId,
    refetchInterval: LIVE_REFRESH_MS,
    placeholderData: (previous) => previous,
  });
}

/**
 * Coche / décoche avec mise à jour optimiste : la coche apparaît
 * instantanément, même en magasin avec un réseau lent ; annulée en cas d'échec.
 */
export function useToggleItem(familyId: string, weekStart: string | undefined) {
  const queryClient = useQueryClient();
  const key = shoppingKeys.list(familyId, weekStart);

  return useMutation({
    mutationFn: ({ itemId, checked }: { itemId: string; checked: boolean }) =>
      shoppingApi.updateItem(familyId, itemId, { checked }),
    onMutate: async ({ itemId, checked }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShoppingListDto>(key);
      if (previous) {
        queryClient.setQueryData<ShoppingListDto>(key, {
          ...previous,
          items: previous.items.map((item) => (item.id === itemId ? { ...item, checked } : item)),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: shoppingKeys.all(familyId) }),
  });
}
