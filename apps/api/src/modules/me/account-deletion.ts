import type { TFunction } from 'i18next';
import type { Prisma } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Database } from '../../lib/prisma.ts';
import { assertFamilyInvariants, lockFamily } from '../families/family-invariants.ts';

type Tx = Prisma.TransactionClient;

/**
 * Suppression du compte de l'utilisateur connecté (exigée par l'App Store).
 *
 * Pour chaque famille :
 * - s'il ne reste aucun autre adulte (membre avec courriel), la famille entière est
 *   supprimée, profils gérés (enfants) compris ;
 * - sinon le membre est désactivé et anonymisé ; ses droits d'admin et de responsable
 *   des courses passent, au besoin, à l'adulte le plus ancien. L'historique des repas
 *   reste cohérent pour les autres.
 *
 * Le compte est ensuite supprimé, ou anonymisé (courriel effacé, sessions et appareils
 * supprimés) s'il est encore référencé par l'historique d'une famille.
 */
export async function deleteAccount(db: Database, t: TFunction, userId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true, memberships: { select: { familyId: true } } },
    });
    if (!user) throw AppError.unauthenticated();

    const familyIds = [...new Set(user.memberships.map((m) => m.familyId))].sort();
    for (const familyId of familyIds) {
      await lockFamily(tx, familyId);
      const otherAdults = await tx.member.findMany({
        where: { familyId, active: true, userId: { not: userId }, user: { email: { not: null } } },
        orderBy: { joinedAt: 'asc' },
        select: { id: true },
      });
      const successor = otherAdults[0];
      if (successor) await leaveFamily(tx, t, familyId, userId, successor.id);
      else await deleteFamily(tx, familyId);
    }

    if ((await tx.member.count({ where: { userId } })) === 0) {
      await tx.user.delete({ where: { id: userId } });
    } else {
      await tx.user.update({ where: { id: userId }, data: { email: null } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.pushDevice.deleteMany({ where: { userId } });
    }
    if (user.email) await tx.emailOtp.deleteMany({ where: { email: user.email } });
  });
}

async function leaveFamily(
  tx: Tx,
  t: TFunction,
  familyId: string,
  userId: string,
  successorId: string,
): Promise<void> {
  await tx.member.updateMany({
    where: { familyId, userId },
    data: {
      active: false,
      displayName: t('account.deletedMember'),
      avatarEmoji: null,
      role: 'MEMBER',
      isShoppingResponsible: false,
    },
  });

  const [admins, shoppers] = await Promise.all([
    tx.member.count({ where: { familyId, active: true, role: 'ADMIN' } }),
    tx.member.count({ where: { familyId, active: true, isShoppingResponsible: true } }),
  ]);
  if (admins === 0 || shoppers === 0) {
    await tx.member.update({
      where: { id: successorId },
      data: {
        ...(admins === 0 ? { role: 'ADMIN' as const } : {}),
        ...(shoppers === 0 ? { isShoppingResponsible: true } : {}),
      },
    });
  }
  await assertFamilyInvariants(tx, familyId);
}

/** Supprime la famille et ses profils gérés, dans l'ordre imposé par les clés étrangères. */
async function deleteFamily(tx: Tx, familyId: string): Promise<void> {
  const managed = await tx.member.findMany({
    where: { familyId, user: { email: null } },
    select: { userId: true },
  });
  // Les repas référencent recettes et cuisiniers (RESTRICT) : semaines puis recettes d'abord.
  await tx.week.deleteMany({ where: { familyId } });
  await tx.recipe.deleteMany({ where: { familyId } });
  await tx.family.delete({ where: { id: familyId } });
  await tx.user.deleteMany({
    where: { id: { in: managed.map((m) => m.userId) }, memberships: { none: {} } },
  });
}
