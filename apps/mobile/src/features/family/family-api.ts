import type {
  CreateFamilyBody,
  CreateManagedMemberBody,
  CreatedInvitationDto,
  FamilyDto,
  InvitationDto,
  InvitationPreviewDto,
  JoinFamilyBody,
  MemberDto,
  UpdateFamilyBody,
  UpdateMemberBody,
} from '@yumi/shared';
import { apiClient } from '@/lib/api-client';

const familyPath = (familyId: string) => `/families/${encodeURIComponent(familyId)}`;

export const familyApi = {
  create: (body: CreateFamilyBody) => apiClient.request<FamilyDto>('POST', '/families', { body }),

  get: (familyId: string) => apiClient.request<FamilyDto>('GET', familyPath(familyId)),

  update: (familyId: string, body: UpdateFamilyBody) =>
    apiClient.request<FamilyDto>('PATCH', familyPath(familyId), { body }),

  createManagedMember: (familyId: string, body: CreateManagedMemberBody) =>
    apiClient.request<MemberDto>('POST', `${familyPath(familyId)}/members`, { body }),

  updateMember: (familyId: string, memberId: string, body: UpdateMemberBody) =>
    apiClient.request<MemberDto>(
      'PATCH',
      `${familyPath(familyId)}/members/${encodeURIComponent(memberId)}`,
      { body },
    ),

  removeMember: (familyId: string, memberId: string) =>
    apiClient.request<void>(
      'DELETE',
      `${familyPath(familyId)}/members/${encodeURIComponent(memberId)}`,
    ),

  listInvitations: (familyId: string) =>
    apiClient.request<InvitationDto[]>('GET', `${familyPath(familyId)}/invitations`),

  createInvitation: (familyId: string) =>
    apiClient.request<CreatedInvitationDto>('POST', `${familyPath(familyId)}/invitations`),

  revokeInvitation: (familyId: string, invitationId: string) =>
    apiClient.request<void>(
      'DELETE',
      `${familyPath(familyId)}/invitations/${encodeURIComponent(invitationId)}`,
    ),

  previewInvitation: (code: string) =>
    apiClient.request<InvitationPreviewDto>('POST', '/invitations/preview', { body: { code } }),

  join: (body: JoinFamilyBody) =>
    apiClient.request<FamilyDto>('POST', '/invitations/join', { body }),
};
