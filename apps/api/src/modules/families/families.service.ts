import type {
  CreateFamilyBody,
  CreateManagedMemberBody,
  FamilyDto,
  MemberDto,
  UpdateFamilyBody,
  UpdateMemberBody,
} from '@yumi/shared';
import {
  createFamilyBodySchema,
  createManagedMemberBodySchema,
  updateFamilyBodySchema,
  updateMemberBodySchema,
} from '@yumi/shared';
import { ApiErrorCode } from '@yumi/shared';
import type { Member } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Database } from '../../lib/prisma.ts';
import { assertFamilyInvariants, lockFamily } from './family-invariants.ts';
import { memberDtoInclude, toFamilyDto, toMemberDto } from './family.mapper.ts';

/**
 * Familles et membres.
 *
 * Droits : un admin peut tout faire ; un membre peut modifier son propre profil
 * (nom, couleur, emoji) et quitter la famille. Le rôle et la responsabilité des
 * courses ne sont modifiables que par un admin.
 */
export class FamiliesService {
  constructor(private readonly db: Database) {}

  /** Crée une famille ; son créateur en devient admin et responsable des courses. */
  async create(userId: string, input: CreateFamilyBody): Promise<FamilyDto> {
    const body = createFamilyBodySchema.parse(input);
    const family = await this.db.family.create({
      data: {
        ...body.family,
        members: {
          create: {
            ...body.profile,
            userId,
            role: 'ADMIN',
            isShoppingResponsible: true,
          },
        },
      },
      select: { id: true },
    });
    return this.get(family.id, userId);
  }

  async get(familyId: string, userId: string): Promise<FamilyDto> {
    const family = await this.db.family.findUniqueOrThrow({
      where: { id: familyId },
      include: {
        members: {
          where: { active: true },
          orderBy: { joinedAt: 'asc' },
          include: memberDtoInclude,
        },
      },
    });
    return toFamilyDto(family, userId);
  }

  async update(admin: Member, input: UpdateFamilyBody): Promise<FamilyDto> {
    const body = updateFamilyBodySchema.parse(input);
    await this.db.family.update({ where: { id: admin.familyId }, data: body });
    return this.get(admin.familyId, admin.userId);
  }

  /** Ajoute un profil géré par un parent (enfant sans courriel, sans connexion). */
  async createManagedMember(admin: Member, input: CreateManagedMemberBody): Promise<MemberDto> {
    const profile = createManagedMemberBodySchema.parse(input);
    const member = await this.db.member.create({
      data: {
        ...profile,
        family: { connect: { id: admin.familyId } },
        user: { create: {} },
      },
      include: memberDtoInclude,
    });
    return toMemberDto(member, admin.userId);
  }

  async updateMember(actor: Member, targetId: string, input: UpdateMemberBody): Promise<MemberDto> {
    const body = updateMemberBodySchema.parse(input);
    const isAdmin = actor.role === 'ADMIN';
    const isSelf = actor.id === targetId;

    if (!isAdmin && !isSelf) throw AppError.forbidden('Tu ne peux modifier que ton profil.');
    if (!isAdmin && (body.role !== undefined || body.isShoppingResponsible !== undefined)) {
      throw AppError.forbidden('Action réservée aux admins.');
    }

    return this.db.$transaction(async (tx) => {
      await lockFamily(tx, actor.familyId);
      const target = await tx.member.findFirst({
        where: { id: targetId, familyId: actor.familyId, active: true },
        include: memberDtoInclude,
      });
      if (!target) throw AppError.notFound('Membre introuvable.');

      if (body.role === 'ADMIN' && target.user.email === null) {
        throw new AppError(
          ApiErrorCode.MANAGED_MEMBER_CANNOT_BE_ADMIN,
          409,
          'Un profil géré ne peut pas être admin.',
        );
      }

      const updated = await tx.member.update({
        where: { id: target.id },
        data: body,
        include: memberDtoInclude,
      });
      await assertFamilyInvariants(tx, actor.familyId);
      return toMemberDto(updated, actor.userId);
    });
  }

  /**
   * Retire un membre (admin) ou quitte la famille (soi-même). Le membre est
   * désactivé et non supprimé : l'historique (repas, recettes) reste intact.
   */
  async removeMember(actor: Member, targetId: string): Promise<void> {
    if (actor.role !== 'ADMIN' && actor.id !== targetId) {
      throw AppError.forbidden('Action réservée aux admins.');
    }
    await this.db.$transaction(async (tx) => {
      await lockFamily(tx, actor.familyId);
      const result = await tx.member.updateMany({
        where: { id: targetId, familyId: actor.familyId, active: true },
        data: { active: false },
      });
      if (result.count === 0) throw AppError.notFound('Membre introuvable.');
      await assertFamilyInvariants(tx, actor.familyId);
    });
  }
}
