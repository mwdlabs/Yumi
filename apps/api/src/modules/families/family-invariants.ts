import { ApiErrorCode } from '@yumi/shared';
import type { Prisma } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';

type Tx = Prisma.TransactionClient;

/**
 * Verrouille la ligne de la famille jusqu'à la fin de la transaction.
 * Sérialise les changements de membres d'une même famille : deux admins qui
 * se retirent mutuellement leurs droits en même temps ne peuvent pas laisser
 * la famille sans admin.
 */
export async function lockFamily(tx: Tx, familyId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM families WHERE id = ${familyId} FOR UPDATE`;
}

/**
 * Règles vérifiées après toute modification des membres (dans la transaction) :
 * - au moins un admin actif ;
 * - au moins un responsable des courses actif.
 */
export async function assertFamilyInvariants(tx: Tx, familyId: string): Promise<void> {
  const [admins, shoppers] = await Promise.all([
    tx.member.count({ where: { familyId, active: true, role: 'ADMIN' } }),
    tx.member.count({ where: { familyId, active: true, isShoppingResponsible: true } }),
  ]);
  if (admins === 0) {
    throw new AppError(ApiErrorCode.LAST_ADMIN, 409, 'La famille doit garder au moins un admin.');
  }
  if (shoppers === 0) {
    throw new AppError(
      ApiErrorCode.LAST_SHOPPING_RESPONSIBLE,
      409,
      'La famille doit garder au moins un responsable des courses.',
    );
  }
}
