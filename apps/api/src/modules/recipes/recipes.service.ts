import {
  ApiErrorCode,
  ingredientKey,
  normalizeText,
  recipeBodySchema,
  type FamilyIngredientDto,
  type RecipeBody,
  type RecipeDto,
  type RecipeSummaryDto,
  type Unit,
} from '@yumi/shared';
import type { Member, Prisma } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Database } from '../../lib/prisma.ts';

const recipeInclude = {
  ingredients: { orderBy: { position: 'asc' } },
  createdBy: { select: { id: true, displayName: true } },
} as const satisfies Prisma.RecipeInclude;

type RecipeWithRelations = Prisma.RecipeGetPayload<{ include: typeof recipeInclude }>;

/**
 * Livre de recettes de la famille. Les recettes appartiennent à toute la
 * famille : chaque membre actif peut en créer, en modifier et en archiver.
 * L'archivage (et non la suppression) préserve l'historique des repas.
 */
export class RecipesService {
  constructor(private readonly db: Database) {}

  async list(member: Member): Promise<RecipeSummaryDto[]> {
    const recipes = await this.db.recipe.findMany({
      where: { familyId: member.familyId, archivedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { ingredients: true } } },
    });
    return recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      ingredientCount: recipe._count.ingredients,
      updatedAt: recipe.updatedAt.toISOString(),
    }));
  }

  async get(member: Member, recipeId: string): Promise<RecipeDto> {
    return toRecipeDto(await this.findActive(this.db, member, recipeId));
  }

  async create(member: Member, input: RecipeBody): Promise<RecipeDto> {
    const body = recipeBodySchema.parse(input);
    return this.db.$transaction(async (tx) => {
      await this.assertNameAvailable(tx, member.familyId, body.name);
      const recipe = await tx.recipe.create({
        data: {
          familyId: member.familyId,
          createdById: member.id,
          name: body.name,
          servings: body.servings,
          ingredients: { create: body.ingredients.map(toIngredientRow) },
        },
        include: recipeInclude,
      });
      return toRecipeDto(recipe);
    });
  }

  /** Remplace entièrement la recette (nom, portions et liste d'ingrédients). */
  async update(member: Member, recipeId: string, input: RecipeBody): Promise<RecipeDto> {
    const body = recipeBodySchema.parse(input);
    return this.db.$transaction(async (tx) => {
      await this.findActive(tx, member, recipeId);
      await this.assertNameAvailable(tx, member.familyId, body.name, recipeId);
      await tx.recipeIngredient.deleteMany({ where: { recipeId } });
      const recipe = await tx.recipe.update({
        where: { id: recipeId },
        data: {
          name: body.name,
          servings: body.servings,
          ingredients: { create: body.ingredients.map(toIngredientRow) },
        },
        include: recipeInclude,
      });
      return toRecipeDto(recipe);
    });
  }

  async archive(member: Member, recipeId: string): Promise<void> {
    const result = await this.db.recipe.updateMany({
      where: { id: recipeId, familyId: member.familyId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (result.count === 0) throw AppError.notFound('Recette introuvable.');
  }

  /**
   * Ingrédients déjà utilisés dans les recettes de la famille, du plus
   * fréquent au moins fréquent : ils sont suggérés en premier à la saisie.
   */
  async familyIngredients(member: Member): Promise<FamilyIngredientDto[]> {
    const rows = await this.db.recipeIngredient.findMany({
      where: { recipe: { familyId: member.familyId, archivedAt: null } },
      select: { name: true, unit: true, recipeId: true },
      orderBy: { recipe: { updatedAt: 'desc' } },
    });

    const byKey = new Map<string, { name: string; unit: Unit | null; recipes: Set<string> }>();
    for (const row of rows) {
      const key = ingredientKey(row.name);
      const entry = byKey.get(key) ?? { name: row.name, unit: row.unit, recipes: new Set() };
      entry.recipes.add(row.recipeId);
      byKey.set(key, entry);
    }
    return [...byKey.values()]
      .map((entry) => ({ name: entry.name, unit: entry.unit, recipeCount: entry.recipes.size }))
      .sort((a, b) => b.recipeCount - a.recipeCount || a.name.localeCompare(b.name, 'fr'))
      .slice(0, 300);
  }

  private async findActive(
    db: Database | Prisma.TransactionClient,
    member: Member,
    recipeId: string,
  ): Promise<RecipeWithRelations> {
    const recipe = await db.recipe.findFirst({
      where: { id: recipeId, familyId: member.familyId, archivedAt: null },
      include: recipeInclude,
    });
    if (!recipe) throw AppError.notFound('Recette introuvable.');
    return recipe;
  }

  /** Évite les doublons : « Yassa poulet » et « yassa  Poulet » sont la même recette. */
  private async assertNameAvailable(
    tx: Prisma.TransactionClient,
    familyId: string,
    name: string,
    exceptRecipeId?: string,
  ): Promise<void> {
    const existing = await tx.recipe.findMany({
      where: {
        familyId,
        archivedAt: null,
        ...(exceptRecipeId ? { NOT: { id: exceptRecipeId } } : {}),
      },
      select: { name: true },
    });
    const wanted = normalizeText(name);
    if (existing.some((recipe) => normalizeText(recipe.name) === wanted)) {
      throw new AppError(
        ApiErrorCode.RECIPE_NAME_TAKEN,
        409,
        'Une recette porte déjà ce nom dans la famille.',
      );
    }
  }
}

function toIngredientRow(
  ingredient: { name: string; quantity: number | null; unit: Unit | null },
  position: number,
) {
  return { position, name: ingredient.name, quantity: ingredient.quantity, unit: ingredient.unit };
}

function toRecipeDto(recipe: RecipeWithRelations): RecipeDto {
  return {
    id: recipe.id,
    name: recipe.name,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity === null ? null : Number(ingredient.quantity),
      unit: ingredient.unit,
    })),
    createdBy: recipe.createdBy,
    updatedAt: recipe.updatedAt.toISOString(),
  };
}
