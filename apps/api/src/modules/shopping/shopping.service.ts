import {
  addShoppingItemBodySchema,
  ApiErrorCode,
  categoryForName,
  ingredientKey,
  shiftWeek,
  shoppingListQuerySchema,
  unitDimension,
  updateShoppingItemBodySchema,
  weekDeadline,
  weekEndDate,
  weekStartFor,
  weekStartOfDate,
  type AddShoppingItemBody,
  type ShoppingItemDto,
  type ShoppingListDto,
  type Unit,
  type UpdateShoppingItemBody,
} from '@yumi/shared';
import { Prisma, type Family, type Member } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Clock } from '../../lib/clock.ts';
import type { Database } from '../../lib/prisma.ts';

type Tx = Prisma.TransactionClient;

const itemInclude = {
  quantities: true,
  checkedBy: { select: { id: true, displayName: true } },
  addedBy: { select: { id: true, displayName: true } },
} as const satisfies Prisma.ShoppingItemInclude;
type ItemWithRelations = Prisma.ShoppingItemGetPayload<{ include: typeof itemInclude }>;

/** Une date locale "AAAA-MM-JJ" telle que stockée dans une colonne `date`. */
const toDbDate = (isoDate: string) => new Date(`${isoDate}T00:00:00.000Z`);

/**
 * Liste de courses hebdomadaire de la famille.
 *
 * Chaque membre peut ajouter des articles à la main, pour n'importe quelle
 * semaine, et cocher les articles en magasin. Les articles issus des recettes
 * (génération automatique, fonctionnalité 4) partageront la même liste.
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

    const week = await this.db.week.findUnique({
      where: { familyId_startDate: { familyId: family.id, startDate: toDbDate(startDate) } },
      include: { shoppingItems: { include: itemInclude, orderBy: { createdAt: 'asc' } } },
    });

    const items = (week?.shoppingItems ?? []).map(toItemDto);
    return {
      startDate,
      endDate: weekEndDate(startDate),
      isCurrentWeek: startDate === this.resolveWeekStart(family),
      previousStartDate: shiftWeek(startDate, -1),
      nextStartDate: shiftWeek(startDate, 1),
      status: week?.status ?? 'OPEN',
      // Stable : à cocher d'abord, dans l'ordre d'ajout, puis déjà dans le panier.
      items: [...items.filter((i) => !i.checked), ...items.filter((i) => i.checked)],
    };
  }

  async addItem(member: Member, input: AddShoppingItemBody): Promise<ShoppingItemDto> {
    const body = addShoppingItemBodySchema.parse(input);
    const family = await this.family(member);
    const startDate = this.resolveWeekStart(family, body.date);

    try {
      return await this.db.$transaction(async (tx) => {
        const weekId = await this.ensureWeek(tx, family, startDate);
        const item = await tx.shoppingItem.create({
          data: {
            weekId,
            key: ingredientKey(body.name),
            label: body.name,
            isManual: true,
            addedById: member.id,
            createdAt: this.clock.now(),
            quantities: { create: quantityRow(body.quantity, body.unit) },
          },
          include: itemInclude,
        });
        return toItemDto(item);
      });
    } catch (error) {
      throw mapDuplicate(error);
    }
  }

  async updateItem(
    member: Member,
    itemId: string,
    input: UpdateShoppingItemBody,
  ): Promise<ShoppingItemDto> {
    const body = updateShoppingItemBodySchema.parse(input);
    const item = await this.findItem(member, itemId);
    const editsContent = body.name !== undefined || body.quantity !== undefined;
    if (editsContent && !item.isManual) throw notEditable();

    try {
      return await this.db.$transaction(async (tx) => {
        if (body.quantity !== undefined) {
          await tx.shoppingItemQuantity.deleteMany({ where: { itemId } });
          await tx.shoppingItemQuantity.create({
            data: { itemId, ...quantityRow(body.quantity, body.unit ?? null) },
          });
        }
        const updated = await tx.shoppingItem.update({
          where: { id: itemId },
          data: {
            ...(body.name !== undefined ? { label: body.name, key: ingredientKey(body.name) } : {}),
            ...(body.checked !== undefined
              ? body.checked
                ? { checkedAt: this.clock.now(), checkedById: member.id }
                : { checkedAt: null, checkedById: null }
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

  /** Seuls les articles ajoutés à la main se suppriment (les autres viennent des recettes). */
  async deleteItem(member: Member, itemId: string): Promise<void> {
    const item = await this.findItem(member, itemId);
    if (!item.isManual) throw notEditable();
    await this.db.shoppingItem.delete({ where: { id: item.id } });
  }

  private async family(member: Member): Promise<Family> {
    return this.db.family.findUniqueOrThrow({ where: { id: member.familyId } });
  }

  /** Début de la semaine demandée (n'importe quel jour) ou de la semaine en cours. */
  private resolveWeekStart(family: Family, date?: string): string {
    return date
      ? weekStartOfDate(date, family.weekStartsOn)
      : weekStartFor(this.clock.now(), family.timezone, family.weekStartsOn);
  }

  /** Crée la semaine à la première écriture (idempotent, sûr en concurrence). */
  private async ensureWeek(tx: Tx, family: Family, startDate: string): Promise<string> {
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
    return week.id;
  }

  private async findItem(member: Member, itemId: string) {
    const item = await this.db.shoppingItem.findFirst({
      where: { id: itemId, week: { familyId: member.familyId } },
    });
    if (!item) throw AppError.notFound('Article introuvable.');
    return item;
  }
}

function quantityRow(quantity: number | null, unit: Unit | null) {
  return { dimension: unitDimension(unit), unit, amount: quantity };
}

function toItemDto(item: ItemWithRelations): ShoppingItemDto {
  // Articles manuels : une seule quantité. Plusieurs dimensions viendront de la fusion des recettes.
  const quantity = item.quantities[0];
  return {
    id: item.id,
    name: item.label,
    quantity: quantity?.amount == null ? null : Number(quantity.amount),
    unit: quantity?.unit ?? null,
    category: categoryForName(item.label),
    isManual: item.isManual,
    checked: item.checkedAt !== null,
    checkedBy: item.checkedBy,
    addedBy: item.addedBy,
    addedAt: item.createdAt.toISOString(),
  };
}

function notEditable(): AppError {
  return new AppError(
    ApiErrorCode.ITEM_NOT_EDITABLE,
    409,
    'Cet article vient des recettes : modifie plutôt la recette.',
  );
}

/** Violation de l'unicité (semaine, nom normalisé) → article déjà dans la liste. */
function mapDuplicate(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new AppError(
      ApiErrorCode.ITEM_ALREADY_IN_LIST,
      409,
      'Cet article est déjà dans la liste de la semaine.',
    );
  }
  return error;
}
