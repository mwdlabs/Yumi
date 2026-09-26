import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shoppingKeys } from '@/features/shopping/queries';
import { mealsApi } from './meals-api';

export const weekKeys = {
  all: (familyId: string) => ['family', familyId, 'week'] as const,
  plan: (familyId: string, date: string | undefined) =>
    ['family', familyId, 'week', date ?? 'current'] as const,
};

export function useWeekPlan(familyId: string, date: string | undefined) {
  return useQuery({
    queryKey: weekKeys.plan(familyId, date),
    queryFn: () => mealsApi.getWeek(familyId, date),
    enabled: !!familyId,
    refetchInterval: 30_000,
    placeholderData: (previous) => previous,
  });
}

/** Un plat change : la semaine ET la liste de courses changent. */
export function useInvalidateWeek(familyId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: weekKeys.all(familyId) }),
      queryClient.invalidateQueries({ queryKey: shoppingKeys.all(familyId) }),
    ]);
}
