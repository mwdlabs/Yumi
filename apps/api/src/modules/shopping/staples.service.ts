import {
  ApiErrorCode,
  categoryForName,
  ingredientKey,
  stapleBodySchema,
  staplesBatchBodySchema,
  updateStapleBodySchema,
  type StapleBody,
  type StapleDto,
  type StaplesBatchBody,
  type UpdateStapleBody,
} from '@yumi/shared';
import { Prisma, type FamilyStaple, type Member } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Clock } from '../../lib/clock.ts';
import type { Database } from '../../lib/prisma.ts';
import { addStaplesToWeek, currentWeekStart, quantityRow, toDbDate } from './weeks.ts';

type Tx = Prisma.TransactionClient;

/**
 * Essentiels de la famille : articles ajoutés automatiquement à la liste de
 * chaque semaine (en cours et à venir). Gérés par tous les membres.
 *
 * - Ajouter un essentiel l'ajoute aussi aux listes déjà ouvertes (semaine en
 *   cours et suivantes), sauf si l'article y est déjà.
 * - Modifier un essentiel met à jour ses articles non cochés de ces listes.
 * - Retirer un essentiel le retire des semaines suivantes (non cochés) ; la
 *   liste de la semaine en cours reste telle quelle.
 */
export class StaplesService {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  async list(member: Member): Promise<StapleDto[]> {
    const staples = await this.db.familyStaple.findMany({
      where: { familyId: member.familyId },
      orderBy: { createdAt: 'asc' },
    });
    return staples.map(toStapleDto);
  }

  async create(member: Member, input: StapleBody): Promise<StapleDto> {
    const body = stapleBodySchema.parse(input);
    try {
      return await this.db.$transaction(async (tx) => {
        const staple = await tx.familyStaple.create({
          data: {
            familyId: member.familyId,
            createdById: member.id,
            key: ingredientKey(body.name),
            name: body.name,
            quantity: body.quantity,
            unit: body.unit,
            createdAt: this.clock.now(),
          },
        });
        await this.addToOpenWeeks(tx, member, [staple]);
        return toStapleDto(staple);
      });
    } catch (error) {
      throw mapDuplicate(error);
    }
  }

  /** Ajout groupé (suggestions) : les essentiels déjà présents sont ignorés. */
  async createMany(member: Member, input: StaplesBatchBody): Promise<StapleDto[]> {
    const { staples } = staplesBatchBodySchema.parse(input);
    const now = this.clock.now().getTime();
    await this.db.$transaction(async (tx) => {
      const created = await tx.familyStaple.createManyAndReturn({
        data: staples.map((staple, index) => ({
          familyId: member.familyId,
          createdById: member.id,
          key: ingredientKey(staple.name),
          name: staple.name,
          quantity: staple.quantity,
          unit: staple.unit,
          createdAt: new Date(now + index),
        })),
        skipDuplicates: true,
      });
      await this.addToOpenWeeks(tx, member, created);
    });
    return this.list(member);
  }

  async update(member: Member, stapleId: string, input: UpdateStapleBody): Promise<StapleDto> {
    const body = updateStapleBodySchema.parse(input);
    await this.find(member, stapleId);
    try {
      return await this.db.$transaction(async (tx) => {
        const staple = await tx.familyStaple.update({
          where: { id: stapleId },
          data: {
            ...(body.name !== undefined ? { name: body.name, key: ingredientKey(body.name) } : {}),
            ...(body.quantity !== undefined
              ? { quantity: body.quantity, unit: body.unit ?? null }
              : {}),
          },
        });
        await this.syncOpenItems(tx, member, staple, body);
        return toStapleDto(staple);
      });
    } catch (error) {
      throw mapDuplicate(error);
    }
  }

  async remove(member: Member, stapleId: string): Promise<void> {
    await this.find(member, stapleId);
    const family = await this.db.family.findUniqueOrThrow({ where: { id: member.familyId } });
    const current = currentWeekStart(family, this.clock);
    await this.db.$transaction([
      this.db.shoppingItem.deleteMany({
        where: {
          stapleId,
          checkedAt: null,
          week: { familyId: member.familyId, startDate: { gt: toDbDate(current) } },
        },
      }),
      this.db.familyStaple.delete({ where: { id: stapleId } }),
    ]);
  }

  private async find(member: Member, stapleId: string): Promise<FamilyStaple> {
    const staple = await this.db.familyStaple.findFirst({
      where: { id: stapleId, familyId: member.familyId },
    });
    if (!staple) throw AppError.notFound('Essentiel introuvable.');
    return staple;
  }

  /** Semaines en cours et à venir dont la liste existe déjà (essentiels copiés). */
  private async openWeekIds(tx: Tx, member: Member): Promise<string[]> {
    const family = await tx.family.findUniqueOrThrow({ where: { id: member.familyId } });
    const weeks = await tx.week.findMany({
      where: {
        familyId: member.familyId,
        startDate: { gte: toDbDate(currentWeekStart(family, this.clock)) },
        staplesAppliedAt: { not: null },
      },
      select: { id: true },
    });
    return weeks.map((week) => week.id);
  }

  private async addToOpenWeeks(tx: Tx, member: Member, staples: FamilyStaple[]) {
    for (const weekId of await this.openWeekIds(tx, member)) {
      await addStaplesToWeek(tx, weekId, staples, this.clock);
    }
  }

  /** Reporte nom et quantité sur les articles non cochés des listes ouvertes. */
  private async syncOpenItems(
    tx: Tx,
    member: Member,
    staple: FamilyStaple,
    body: { name?: string | undefined; quantity?: number | null | undefined },
  ) {
    const weekIds = await this.openWeekIds(tx, member);
    const items = await tx.shoppingItem.findMany({
      where: { stapleId: staple.id, checkedAt: null, weekId: { in: weekIds } },
      select: { id: true, weekId: true },
    });
    for (const item of items) {
      if (body.name !== undefined) {
        const clash = await tx.shoppingItem.findFirst({
          where: { weekId: item.weekId, key: staple.key, NOT: { id: item.id } },
          select: { id: true },
        });
        // Un autre article porte déjà ce nom cette semaine : on laisse celui-ci tel quel.
        if (clash) continue;
        await tx.shoppingItem.update({
          where: { id: item.id },
          data: { label: staple.name, key: staple.key },
        });
      }
      if (body.quantity !== undefined) {
        await tx.shoppingItemQuantity.deleteMany({ where: { itemId: item.id } });
        await tx.shoppingItemQuantity.create({
          data: {
            itemId: item.id,
            ...quantityRow(staple.quantity === null ? null : Number(staple.quantity), staple.unit),
          },
        });
      }
    }
  }
}

function toStapleDto(staple: FamilyStaple): StapleDto {
  return {
    id: staple.id,
    name: staple.name,
    quantity: staple.quantity === null ? null : Number(staple.quantity),
    unit: staple.unit,
    category: categoryForName(staple.name),
  };
}

function mapDuplicate(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new AppError(
      ApiErrorCode.STAPLE_ALREADY_EXISTS,
      409,
      'Cet article fait déjà partie des essentiels.',
    );
  }
  return error;
}
