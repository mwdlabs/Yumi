import {
  ApiErrorCode,
  createMealBodySchema,
  shiftWeek,
  updateMealBodySchema,
  weekEndDate,
  weekQuerySchema,
  weekStartOfDate,
  type AvatarColor,
  type AvatarEmoji,
  type CreateMealBody,
  type MealDto,
  type UpdateMealBody,
  type WeekPlanDto,
} from '@yumi/shared';
import { Prisma, type Family, type Member } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Clock } from '../../lib/clock.ts';
import type { Database } from '../../lib/prisma.ts';
import { syncRecipeItems } from '../shopping/recipe-sync.ts';
import { currentWeekStart, ensureWeek, fromDbDate, toDbDate } from '../shopping/weeks.ts';

type Tx = Prisma.TransactionClient;

const mealInclude = {
  recipe: { select: { id: true, name: true } },
  cook: { select: { id: true, displayName: true, avatarColor: true, avatarEmoji: true } },
} as const satisfies Prisma.MealInclude;
type MealWithRelations = Prisma.MealGetPayload<{ include: typeof mealInclude }>;

/**
 * Plats de la semaine : un plat (une recette, un cuisinier) par jour.
 * Chaque changement met à jour la liste de courses de la semaine concernée,
 * dans la même transaction.
 */
export class MealsService {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock,
  ) {}

  async getWeek(member: Member, query: unknown): Promise<WeekPlanDto> {
    const { date } = weekQuerySchema.parse(query);
    const family = await this.family(member);
    const current = currentWeekStart(family, this.clock);
    const startDate = date ? weekStartOfDate(date, family.weekStartsOn) : current;

    const meals = await this.db.meal.findMany({
      where: { week: { familyId: family.id, startDate: toDbDate(startDate) } },
      include: mealInclude,
    });
    const byDate = new Map(meals.map((meal) => [fromDbDate(meal.date), toMealDto(meal)]));
    const days = Array.from({ length: 7 }, (_, index) => {
      const day = shiftDays(startDate, index);
      return { date: day, meal: byDate.get(day) ?? null };
    });

    return {
      startDate,
      endDate: weekEndDate(startDate),
      isCurrentWeek: startDate === current,
      previousStartDate: shiftWeek(startDate, -1),
      nextStartDate: shiftWeek(startDate, 1),
      days,
    };
  }

  async create(member: Member, input: CreateMealBody): Promise<MealDto> {
    const body = createMealBodySchema.parse(input);
    const family = await this.family(member);
    await this.assertRecipe(member, body.recipeId);
    const cookId = await this.resolveCook(member, body.cookId);

    try {
      return await this.db.$transaction(async (tx) => {
        const weekId = await ensureWeek(
          tx,
          family,
          weekStartOfDate(body.date, family.weekStartsOn),
          this.clock,
        );
        await this.assertDayFree(tx, weekId, body.date);
        const meal = await tx.meal.create({
          data: { weekId, date: toDbDate(body.date), recipeId: body.recipeId, cookId },
          include: mealInclude,
        });
        await syncRecipeItems(tx, weekId, this.clock);
        return toMealDto(meal);
      });
    } catch (error) {
      throw mapDayTaken(error);
    }
  }

  /** Change le plat, le jour (éventuellement d'une autre semaine) ou le cuisinier. */
  async update(member: Member, mealId: string, input: UpdateMealBody): Promise<MealDto> {
    const body = updateMealBodySchema.parse(input);
    const meal = await this.findMeal(member, mealId);
    const family = await this.family(member);
    if (body.recipeId !== undefined) await this.assertRecipe(member, body.recipeId);
    const cookId =
      body.cookId !== undefined ? await this.resolveCook(member, body.cookId) : undefined;

    try {
      return await this.db.$transaction(async (tx) => {
        let weekId = meal.weekId;
        if (body.date !== undefined && body.date !== fromDbDate(meal.date)) {
          weekId = await ensureWeek(
            tx,
            family,
            weekStartOfDate(body.date, family.weekStartsOn),
            this.clock,
          );
          await this.assertDayFree(tx, weekId, body.date);
        }
        const updated = await tx.meal.update({
          where: { id: meal.id },
          data: {
            weekId,
            ...(body.date !== undefined ? { date: toDbDate(body.date) } : {}),
            ...(body.recipeId !== undefined ? { recipeId: body.recipeId } : {}),
            ...(cookId !== undefined ? { cookId } : {}),
          },
          include: mealInclude,
        });
        await syncRecipeItems(tx, weekId, this.clock);
        if (weekId !== meal.weekId) await syncRecipeItems(tx, meal.weekId, this.clock);
        return toMealDto(updated);
      });
    } catch (error) {
      throw mapDayTaken(error);
    }
  }

  async remove(member: Member, mealId: string): Promise<void> {
    const meal = await this.findMeal(member, mealId);
    await this.db.$transaction(async (tx) => {
      await tx.meal.delete({ where: { id: meal.id } });
      await syncRecipeItems(tx, meal.weekId, this.clock);
    });
  }

  private family(member: Member): Promise<Family> {
    return this.db.family.findUniqueOrThrow({ where: { id: member.familyId } });
  }

  private async findMeal(member: Member, mealId: string) {
    const meal = await this.db.meal.findFirst({
      where: { id: mealId, week: { familyId: member.familyId } },
    });
    if (!meal) throw AppError.notFound('Plat introuvable.');
    return meal;
  }

  private async assertRecipe(member: Member, recipeId: string): Promise<void> {
    const recipe = await this.db.recipe.findFirst({
      where: { id: recipeId, familyId: member.familyId, archivedAt: null },
      select: { id: true },
    });
    if (!recipe) throw AppError.notFound('Recette introuvable.');
  }

  /** Cuisinier : un membre actif de la famille (profils enfants compris). */
  private async resolveCook(member: Member, cookId?: string): Promise<string> {
    if (!cookId) return member.id;
    const cook = await this.db.member.findFirst({
      where: { id: cookId, familyId: member.familyId, active: true },
      select: { id: true },
    });
    if (!cook) throw AppError.notFound('Membre introuvable.');
    return cook.id;
  }

  private async assertDayFree(tx: Tx, weekId: string, date: string): Promise<void> {
    const taken = await tx.meal.findUnique({
      where: { weekId_date: { weekId, date: toDbDate(date) } },
      select: { id: true },
    });
    if (taken) throw dayTaken();
  }
}

function shiftDays(isoDate: string, days: number): string {
  const date = toDbDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDbDate(date);
}

function toMealDto(meal: MealWithRelations): MealDto {
  return {
    id: meal.id,
    date: fromDbDate(meal.date),
    recipe: meal.recipe,
    cook: {
      id: meal.cook.id,
      displayName: meal.cook.displayName,
      avatarColor: meal.cook.avatarColor as AvatarColor,
      avatarEmoji: meal.cook.avatarEmoji as AvatarEmoji | null,
    },
  };
}

function dayTaken(): AppError {
  return new AppError(ApiErrorCode.DAY_TAKEN, 409, 'Un plat est déjà prévu ce jour-là.');
}

function mapDayTaken(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return dayTaken();
  }
  return error;
}
