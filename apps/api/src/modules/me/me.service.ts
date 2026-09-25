import type { MeResponse } from '@yumi/shared';
import { AppError } from '../../http/errors.ts';
import type { Database } from '../../lib/prisma.ts';

/** Profil de l'utilisateur connecté et ses familles actives. */
export async function getMe(db: Database, userId: string): Promise<MeResponse> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      memberships: {
        where: { active: true },
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          displayName: true,
          role: true,
          family: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!user) throw AppError.unauthenticated();

  return {
    user: { id: user.id, email: user.email },
    memberships: user.memberships.map((m) => ({
      memberId: m.id,
      familyId: m.family.id,
      familyName: m.family.name,
      displayName: m.displayName,
      role: m.role,
    })),
  };
}
