import {
  fromThousandthsOfBase,
  mergeIngredients,
  needsMoreThan,
  toThousandthsOfBase,
  type MergedQuantity,
} from '@yumi/shared';
import type { Prisma, ShoppingItemQuantity } from '../../generated/prisma/client.ts';
import type { Clock } from '../../lib/clock.ts';

type Tx = Prisma.TransactionClient;

/** Source d'une ligne d'ingrédient : le repas et l'ingrédient de recette d'origine. */
interface LineSource {
  mealId: string;
  recipeIngredientId: string;
}

const asMerged = (row: ShoppingItemQuantity, amount = row.amount): MergedQuantity => ({
  dimension: row.dimension,
  unit: row.unit,
  amount: amount === null ? null : Number(amount),
});

/** Quantité déjà achetée d'une dimension, exprimée dans l'unité de la nouvelle quantité. */
function carryPurchased(
  previous: readonly ShoppingItemQuantity[],
  next: MergedQuantity,
): number | null {
  const before = previous.find((row) => row.dimension === next.dimension);
  if (!before?.purchasedAmount || !before.unit || !next.unit) return null;
  return fromThousandthsOfBase(
    toThousandthsOfBase(Number(before.purchasedAmount), before.unit),
    next.unit,
  );
}

/**
 * Recalcule la part « plats » de la liste de courses d'une semaine à partir de
 * ses repas. Appelée dans la transaction de chaque changement (plat ajouté,
 * déplacé, retiré, recette modifiée).
 *
 * - Les ingrédients de tous les plats sont fusionnés (voir `mergeIngredients`).
 * - La part ajoutée à la main (et les essentiels) n'est jamais modifiée : un
 *   article « Oignon » ajouté à la main reçoit simplement en plus la quantité des plats.
 * - Article déjà coché dont un plat demande davantage → décoché, marqué `INCREASED`.
 * - Article coché dont plus aucun plat n'a besoin → conservé, marqué `NO_LONGER_NEEDED`
 *   (déjà acheté) ; non coché → retiré de la liste.
 */
export async function syncRecipeItems(tx: Tx, weekId: string, clock: Clock): Promise<void> {
  // Sérialise les changements concurrents sur une même semaine.
  await tx.$queryRaw`SELECT id FROM weeks WHERE id = ${weekId} FOR UPDATE`;

  const meals = await tx.meal.findMany({
    where: { weekId },
    orderBy: { date: 'asc' },
    include: { recipe: { include: { ingredients: { orderBy: { position: 'asc' } } } } },
  });
  const merged = mergeIngredients<LineSource>(
    meals.flatMap((meal) =>
      meal.recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity === null ? null : Number(ingredient.quantity),
        unit: ingredient.unit,
        source: { mealId: meal.id, recipeIngredientId: ingredient.id },
      })),
    ),
  );

  const items = await tx.shoppingItem.findMany({
    where: { weekId },
    include: { quantities: true, _count: { select: { sources: true } } },
  });
  const remaining = new Map(items.map((item) => [item.key, item]));
  const now = clock.now().getTime();

  for (const [index, target] of merged.entries()) {
    const existing = remaining.get(target.key);
    remaining.delete(target.key);

    if (!existing) {
      await tx.shoppingItem.create({
        data: {
          weekId,
          key: target.key,
          label: target.label,
          isManual: false,
          createdAt: new Date(now + index),
          quantities: {
            create: target.quantities.map((quantity) => ({ source: 'RECIPES', ...quantity })),
          },
          sources: { createMany: { data: target.sources, skipDuplicates: true } },
        },
      });
      continue;
    }

    const previous = existing.quantities.filter((row) => row.source === 'RECIPES');
    const checked = existing.checkedAt !== null;
    const purchased = previous.map((row) => asMerged(row, row.purchasedAmount));
    const increased = checked && needsMoreThan(target.quantities, purchased);

    await tx.shoppingItemQuantity.deleteMany({ where: { itemId: existing.id, source: 'RECIPES' } });
    await tx.shoppingItemQuantity.createMany({
      data: target.quantities.map((quantity) => ({
        itemId: existing.id,
        source: 'RECIPES' as const,
        ...quantity,
        purchasedAmount: checked ? carryPurchased(previous, quantity) : null,
      })),
    });
    await tx.shoppingItemSource.deleteMany({ where: { itemId: existing.id } });
    await tx.shoppingItemSource.createMany({
      data: target.sources.map((source) => ({ itemId: existing.id, ...source })),
      skipDuplicates: true,
    });
    await tx.shoppingItem.update({
      where: { id: existing.id },
      data: increased
        ? { change: 'INCREASED', checkedAt: null, checkedById: null }
        : existing.change === 'NO_LONGER_NEEDED'
          ? { change: null }
          : {},
    });
  }

  // Articles dont plus aucun plat n'a besoin.
  for (const item of remaining.values()) {
    const hasRecipePart =
      item._count.sources > 0 || item.quantities.some((row) => row.source === 'RECIPES');
    if (!hasRecipePart && item.isManual) continue;

    await tx.shoppingItemSource.deleteMany({ where: { itemId: item.id } });
    if (item.isManual) {
      await tx.shoppingItemQuantity.deleteMany({ where: { itemId: item.id, source: 'RECIPES' } });
    } else if (item.checkedAt !== null) {
      // Déjà acheté : on garde la ligne (et la quantité achetée) pour mémoire.
      await tx.shoppingItem.update({
        where: { id: item.id },
        data: { change: 'NO_LONGER_NEEDED' },
      });
    } else {
      await tx.shoppingItem.delete({ where: { id: item.id } });
    }
  }
}
