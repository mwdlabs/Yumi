import { unitDimension, weekDeadline, weekStartFor, type Unit } from '@yumi/shared';
import type { Family, Prisma } from '../../generated/prisma/client.ts';
import type { Clock } from '../../lib/clock.ts';

type Tx = Prisma.TransactionClient;

/** Une date locale "AAAA-MM-JJ" telle que stockée dans une colonne `date`. */
export const toDbDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);
export const fromDbDate = (date: Date) => date.toISOString().slice(0, 10);

/** Début de la semaine en cours dans le fuseau de la famille. */
export function currentWeekStart(family: Family, clock: Clock): string {
  return weekStartFor(clock.now(), family.timezone, family.weekStartsOn);
}

/** Ligne de quantité d'un article (une seule dimension pour les articles simples). */
export function quantityRow(quantity: number | null, unit: Unit | null) {
  return { dimension: unitDimension(unit), unit, amount: quantity };
}

/**
 * Crée la semaine si besoin (idempotent, sûr en concurrence) et, pour la
 * semaine en cours ou à venir, y copie une seule fois les essentiels.
 */
export async function ensureWeek(
  tx: Tx,
  family: Family,
  startDate: string,
  clock: Clock,
): Promise<string> {
  const week = await tx.week.upsert({
    where: { familyId_startDate: { familyId: family.id, startDate: toDbDate(startDate) } },
    update: {},
    create: {
      familyId: family.id,
      startDate: toDbDate(startDate),
      deadlineAt: weekDeadline(
        startDate,
        family.timezone,
        family.deadlineWeekday,
        family.deadlineTime,
      ),
    },
    select: { id: true },
  });
  if (startDate >= currentWeekStart(family, clock)) {
    await applyStaplesOnce(tx, family.id, week.id, clock);
  }
  return week.id;
}

/**
 * Copie les essentiels dans la semaine, une seule fois : un essentiel retiré
 * de la liste de cette semaine ne revient donc pas au prochain affichage.
 */
async function applyStaplesOnce(tx: Tx, familyId: string, weekId: string, clock: Clock) {
  const claimed = await tx.week.updateMany({
    where: { id: weekId, staplesAppliedAt: null },
    data: { staplesAppliedAt: clock.now() },
  });
  if (claimed.count === 0) return;
  const staples = await tx.familyStaple.findMany({
    where: { familyId },
    orderBy: { createdAt: 'asc' },
  });
  await addStaplesToWeek(tx, weekId, staples, clock);
}

/**
 * Ajoute des essentiels à une liste existante.
 * - Article de même nom déjà ajouté à la main : conservé tel quel.
 * - Article de même nom demandé seulement par des plats : l'essentiel s'y greffe
 *   (même ligne, quantité de l'essentiel en plus de celle des plats).
 */
export async function addStaplesToWeek(
  tx: Tx,
  weekId: string,
  staples: readonly {
    id: string;
    key: string;
    name: string;
    quantity: Prisma.Decimal | null;
    unit: Unit | null;
  }[],
  clock: Clock,
): Promise<void> {
  if (staples.length === 0) return;
  const now = clock.now();

  const recipeOnly = await tx.shoppingItem.findMany({
    where: { weekId, isManual: false, key: { in: staples.map((staple) => staple.key) } },
    select: { id: true, key: true },
  });
  for (const item of recipeOnly) {
    const staple = staples.find((candidate) => candidate.key === item.key);
    if (!staple) continue;
    await tx.shoppingItem.update({
      where: { id: item.id },
      data: {
        isManual: true,
        stapleId: staple.id,
        quantities: {
          create: quantityRow(
            staple.quantity === null ? null : Number(staple.quantity),
            staple.unit,
          ),
        },
      },
    });
  }

  const created = await tx.shoppingItem.createManyAndReturn({
    data: staples.map((staple, index) => ({
      weekId,
      key: staple.key,
      label: staple.name,
      isManual: true,
      stapleId: staple.id,
      // Conserve l'ordre des essentiels à l'affichage.
      createdAt: new Date(now.getTime() + index),
    })),
    skipDuplicates: true,
    select: { id: true, stapleId: true },
  });
  const byStaple = new Map(staples.map((staple) => [staple.id, staple]));
  await tx.shoppingItemQuantity.createMany({
    data: created.map((item) => {
      const staple = byStaple.get(item.stapleId ?? '');
      const quantity = staple?.quantity == null ? null : Number(staple.quantity);
      return { itemId: item.id, ...quantityRow(quantity, staple?.unit ?? null) };
    }),
  });
}
