import type { AvatarColor, AvatarEmoji, FamilyDto, MemberDto } from '@yumi/shared';
import type { Family, Member } from '../../generated/prisma/client.ts';

/** Sélection Prisma nécessaire pour construire un MemberDto. */
export const memberDtoInclude = { user: { select: { id: true, email: true } } } as const;
type MemberWithUser = Member & { user: { id: string; email: string | null } };

export function toMemberDto(member: MemberWithUser, currentUserId: string): MemberDto {
  return {
    id: member.id,
    displayName: member.displayName,
    // Valeurs validées par les listes fermées de @yumi/shared à l'écriture.
    avatarColor: member.avatarColor as AvatarColor,
    avatarEmoji: member.avatarEmoji as AvatarEmoji | null,
    role: member.role,
    isShoppingResponsible: member.isShoppingResponsible,
    isManaged: member.user.email === null,
    isMe: member.user.id === currentUserId,
  };
}

export function toFamilyDto(
  family: Family & { members: MemberWithUser[] },
  currentUserId: string,
): FamilyDto {
  return {
    id: family.id,
    name: family.name,
    timezone: family.timezone,
    weekStartsOn: family.weekStartsOn,
    deadlineWeekday: family.deadlineWeekday,
    deadlineTime: family.deadlineTime,
    members: family.members.map((member) => toMemberDto(member, currentUserId)),
  };
}
