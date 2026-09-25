import type { StapleBody, StapleDto, UpdateStapleBody } from '@yumi/shared';
import { apiClient } from '@/lib/api-client';

const staplesPath = (familyId: string) => `/families/${encodeURIComponent(familyId)}/staples`;

export const staplesApi = {
  list: (familyId: string) => apiClient.request<StapleDto[]>('GET', staplesPath(familyId)),

  create: (familyId: string, body: StapleBody) =>
    apiClient.request<StapleDto>('POST', staplesPath(familyId), { body }),

  createMany: (familyId: string, staples: StapleBody[]) =>
    apiClient.request<StapleDto[]>('POST', `${staplesPath(familyId)}/batch`, {
      body: { staples },
    }),

  update: (familyId: string, stapleId: string, body: UpdateStapleBody) =>
    apiClient.request<StapleDto>(
      'PATCH',
      `${staplesPath(familyId)}/${encodeURIComponent(stapleId)}`,
      { body },
    ),

  remove: (familyId: string, stapleId: string) =>
    apiClient.request<void>('DELETE', `${staplesPath(familyId)}/${encodeURIComponent(stapleId)}`),
};
