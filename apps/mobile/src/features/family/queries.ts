import { useQuery } from '@tanstack/react-query';
import { familyApi } from './family-api';

export const familyKeys = {
  detail: (familyId: string) => ['family', familyId] as const,
  invitations: (familyId: string) => ['family', familyId, 'invitations'] as const,
};

export function useFamily(familyId: string | undefined) {
  return useQuery({
    queryKey: familyKeys.detail(familyId ?? ''),
    queryFn: () => familyApi.get(familyId ?? ''),
    enabled: !!familyId,
  });
}

export function useInvitations(familyId: string) {
  return useQuery({
    queryKey: familyKeys.invitations(familyId),
    queryFn: () => familyApi.listInvitations(familyId),
  });
}
