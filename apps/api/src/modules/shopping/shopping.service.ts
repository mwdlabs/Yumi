import {
  addShoppingItemBodySchema,
  ApiErrorCode,
  categoryForName,
  ingredientKey,
  mergeIngredients,
  shiftWeek,
  shoppingListQuerySchema,
  updateShoppingItemBodySchema,
  weekEndDate,
  weekStartOfDate,
  type AddShoppingItemBody,
  type ShoppingItemDto,
  type ShoppingListDto,
  type UpdateShoppingItemBody,
} from '@yumi/shared';
import { Prisma, type Family, type Member } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Clock } from '../../lib/clock.ts';
import type { Database } from '../../lib/prisma.ts';
import { currentWeekStart, ensureWeek, fromDbDate, quantityRow, toDbDate } from './weeks.ts';

const itemInclude = {
  quantities: true,
  checkedBy: { select: { id: true, displayName: true } },
  addedBy: { select: { id: true, displayName: true } },
  sources: {
    select: { meal: { select: { date: true, recipe: { select: { name: true } } } } },
  },
} as const satisfies Prisma.ShoppingItemInclude;
type ItemWithRelations = Prisma.ShoppingItemGetPayload<{ include: typeof itemInclude }>;

/**
 * Liste de courses hebdomadaire de la famille.
 *
 * Un article peut combiner deux parts :
 * - une part ajoutée à la main (ou copiée depuis les essentiels), modifiable ;
 * - une part « plats », recalculée automatiquement à partir des repas de la
 *   semaine (voir `syncRecipeItems`).
 * Les deux sont additionnées à l'affichage.
 */
export class ShoppingService {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  async getList(member: Member, query: unknown): Promise<ShoppingListDto> {
    const { date } = shoppingListQuerySchema.parse(query);
    const family = await this.family(member);
    const startDate = this.resolveWeekStart(family, date);
    const current = currentWeekStart(family, this.clock);

    // Semaine en cours ou à venir : on la matérialise pour y placer les essentiels.
    if (startDate >= current) {
      await this.db.$transaction((tx) => ensureWeek(tx, family, startDate, this.clock));
    }

    const week = await this.db.week.findUnique({
      where: { familyId_startDate: { familyId: family.id, startDate: toDbDate(startDate) } },
      include: { shoppingItems: { include: itemInclude, orderBy: { createdAt: 'asc' } } },
    });

    const items = (week?.shoppingItems ?? []).map(toItemDto);
    return {
      startDate,
      endDate: weekEndDate(startDate),
      isCurrentWeek: startDate === current,
      previousStartDate: shiftWeek(startDate, -1),
      nextStartDate: shiftWeek(startDate, 1),
      status: week?.status ?? 'OPEN',
      // Stable : à cocher d'abord, dans l'ordre d'ajout, puis déjà dans le panier.
      items: [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)],
    };
  }

  /**
   * Ajoute un article à la main. S'il est déjà demandé par un plat, la quantité
   * saisie s'ajoute à la même ligne au lieu de créer un doublon.
   */
  async addItem(member: Member, input: AddShoppingItemBody): Promise<ShoppingItemDto> {
    const body = addShoppingItemBodySchema.parse(input);
    const family = await this.family(member);
    const startDate = this.resolveWeekStart(family, body.date);
    const key = ingredientKey(body.name);

    try {
      return await this.db.$transaction(async (tx) => {
        const weekId = await ensureWeek(tx, family, startDate, this.clock);
        const existing = await tx.shoppingItem.findUnique({
          where: { weekId_key: { weekId, key } },
        });
        if (existing?.isManual) throw duplicate();

        const manualPart = { quantities: { create: quantityRow(body.quantity, body.unit) } };
        const item = existing
          ? await tx.shoppingItem.update({
              where: { id: existing.id },
              data: { isManual: true, addedById: member.id, ...manualPart },
              include: itemInclude,
            })
          : await tx.shoppingItem.create({
              data: {
                weekId,
                key,
                label: body.name,
                isManual: true,
                addedById: member.id,
                createdAt: this.clock.now(),
                ...manualPart,
              },
              include: itemInclude,
            });
        return toItemDto(item);
      });
    } catch (error) {
      throw mapDuplicate(error);
    }
  }

  /**
   * Cochage (tout article) ; nom et quantité (part ajoutée à la main seulement).
   * Cocher mémorise la quantité achetée, pour repérer ensuite une hausse.
   */
  async updateItem(
    member: Member,
    itemId: string,
    input: UpdateShoppingItemBody,
  ): Promise<ShoppingItemDto> {
    const body = updateShoppingItemBodySchema.parse(input);
    const item = await this.findItem(member, itemId);
    const editsContent = body.name !== undefined || body.quantity !== undefined;
    if (editsContent && !item.isManual) throw notEditable();
    // Renommer un article aussi demandé par un plat le séparerait de ce plat.
    if (body.name !== undefined && item._count.sources > 0) throw notEditable();

    try {
      return await this.db.$transaction(async (tx) => {
        if (body.quantity !== undefined) {
          await tx.shoppingItemQuantity.deleteMany({ where: { itemId, source: 'MANUAL' } });
          await tx.shoppingItemQuantity.create({
            data: { itemId, ...quantityRow(body.quantity, body.unit ?? null) },
          });
        }
        if (body.checked !== undefined) {
          // Quantité achetée = quantité demandée au moment du cochage.
          const rows = await tx.shoppingItemQuantity.findMany({ where: { itemId } });
          for (const row of rows) {
            await tx.shoppingItemQuantity.update({
              where: { id: row.id },
              data: { purchasedAmount: body.checked ? row.amount : null },
            });
          }
        }
        const updated = await tx.shoppingItem.update({
          where: { id: itemId },
          data: {
            ...(body.name !== undefined ? { label: body.name, key: ingredientKey(body.name) } : {}),
            ...(body.checked !== undefined
              ? body.checked
                ? { checkedAt: this.clock.now(), checkedById: member.id }
                : { checkedAt: null, checkedById: null, change: null }
              : {}),
          },
          include: itemInclude,
        });
        return toItemDto(updated);
      });
    } catch (error) {
      throw mapDuplicate(error);
    }
  }

  /**
   * Retire la part ajoutée à la main. Si des plats demandent aussi l'article,
   * la ligne reste avec leur quantité ; sinon elle disparaît.
   */
  async deleteItem(member: Member, itemId: string): Promise<void> {
    const item = await this.findItem(member, itemId);
    if (!item.isManual) throw notEditable();
    if (item._count.sources === 0) {
      await this.db.shoppingItem.delete({ where: { id: item.id } });
      return;
    }
    await this.db.$transaction([
      this.db.shoppingItemQuantity.deleteMany({ where: { itemId, source: 'MANUAL' } }),
      this.db.shoppingItem.update({
        where: { id: itemId },
        data: { isManual: false, stapleId: null, addedById: null },
      }),
    ]);
  }

  private async family(member: Member): Promise<Family> {
    return this.db.family.findUniqueOrThrow({ where: { id: member.familyId } });
  }

  /** Début de la semaine demandée (n'importe quel jour) ou de la semaine en cours. */
  private resolveWeekStart(family: Family, date?: string): string {
    return date ? weekStartOfDate(date, family.weekStartsOn) : currentWeekStart(family, this.clock);
  }

  private async findItem(member: Member, itemId: string) {
    const item = await this.db.shoppingItem.findFirst({
      where: { id: itemId, week: { familyId: member.familyId } },
      include: { _count: { select: { sources: true } } },
    });
    if (!item) throw AppError.notFound('Article introuvable.');
    return item;
  }
}

function toItemDto(item: ItemWithRelations): ShoppingItemDto {
  const numeric = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));
  // Total = part à la main + part des plats, fusionnées selon les mêmes règles.
  const [total] = mergeIngredients(
    item.quantities.map((row) => ({
      name: item.label,
      quantity: numeric(row.amount),
      unit: row.unit,
      source: null,
    })),
  );
  const manualRow = item.quantities.find((row) => row.source === 'MANUAL');

  // Un plat par repas (un même plat peut demander l'article pour plusieurs ingrédients).
  const fromRecipes = new Map<string, { recipeName: string; date: string }>();
  for (const { meal } of item.sources) {
    if (!meal.recipe) continue; // source orpheline : la liste est resynchronisée au prochain changement
    const date = fromDbDate(meal.date);
    fromRecipes.set(`${date}-${meal.recipe.name}`, { recipeName: meal.recipe.name, date });
  }

  return {
    id: item.id,
    name: item.label,
    quantities: (total?.quantities ?? []).map(({ amount, unit }) => ({ amount, unit })),
    manual: item.isManual
      ? { amount: numeric(manualRow?.amount ?? null), unit: manualRow?.unit ?? null }
      : null,
    fromRecipes: [...fromRecipes.values()].sort((a, b) => a.date.localeCompare(b.date)),
    category: categoryForName(item.label),
    isStaple: item.stapleId !== null,
    checked: item.checkedAt !== null,
    change: item.change === 'NEW' ? null : item.change,
    checkedBy: item.checkedBy,
    addedBy: item.addedBy,
    addedAt: item.createdAt.toISOString(),
  };
}

function notEditable(): AppError {
  return new AppError(
    ApiErrorCode.ITEM_NOT_EDITABLE,
    409,
    'Cet article vient des plats de la semaine : modifie plutôt la recette.',
  );
}

function duplicate(): AppError {
  return new AppError(
    ApiErrorCode.ITEM_ALREADY_IN_LIST,
    409,
    'Cet article est déjà dans la liste de la semaine.',
  );
}

/** Violation de l'unicité (semaine, nom normalisé) → article déjà dans la liste. */
function mapDuplicate(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return duplicate();
  }
  return error;
}
