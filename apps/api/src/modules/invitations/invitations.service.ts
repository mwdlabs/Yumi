import {
  ApiErrorCode,
  joinFamilyBodySchema,
  previewInvitationBodySchema,
  type CreatedInvitationDto,
  type FamilyDto,
  type InvitationDto,
  type InvitationPreviewDto,
  type JoinFamilyBody,
  type PreviewInvitationBody,
} from '@yumi/shared';
import type { Env } from '../../config/env.ts';
import type { Invitation, Member } from '../../generated/prisma/client.ts';
import { AppError } from '../../http/errors.ts';
import type { Clock } from '../../lib/clock.ts';
import { hmacSha256, randomDigits } from '../../lib/crypto.ts';
import type { Database } from '../../lib/prisma.ts';
import type { FamiliesService } from '../families/families.service.ts';

const MAX_CODE_GENERATION_ATTEMPTS = 10;

interface InvitationsServiceDeps {
  env: Env;
  db: Database;
  clock: Clock;
  families: FamiliesService;
}

/**
 * Invitations par code à 6 chiffres.
 *
 * Un code est réutilisable par plusieurs personnes jusqu'à son expiration
 * (INVITATION_TTL_HOURS) ou sa révocation. Il n'est stocké que haché : il n'est
 * donc visible qu'au moment de sa création. Deux codes actifs ne peuvent pas
 * être identiques, puisque rejoindre une famille ne demande que le code.
 */
export class InvitationsService {
  constructor(private readonly deps: InvitationsServiceDeps) {}

  private hashCode(code: string): string {
    return hmacSha256(this.deps.env.HASH_SECRET, `invite:${code}`);
  }

  async create(admin: Member): Promise<CreatedInvitationDto> {
    const { db, env, clock } = this.deps;
    const now = clock.now();

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      const code = randomDigits(6);
      const codeHash = this.hashCode(code);
      const clash = await db.invitation.findFirst({
        where: { codeHash, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true },
      });
      if (clash) continue;

      const invitation = await db.invitation.create({
        data: {
          familyId: admin.familyId,
          createdById: admin.id,
          codeHash,
          createdAt: now,
          expiresAt: new Date(now.getTime() + env.INVITATION_TTL_HOURS * 60 * 60 * 1000),
        },
      });
      return { ...toInvitationDto(invitation), code };
    }
    throw new Error("Impossible de générer un code d'invitation unique.");
  }

  async listActive(admin: Member): Promise<InvitationDto[]> {
    const invitations = await this.deps.db.invitation.findMany({
      where: {
        familyId: admin.familyId,
        revokedAt: null,
        expiresAt: { gt: this.deps.clock.now() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return invitations.map(toInvitationDto);
  }

  async revoke(admin: Member, invitationId: string): Promise<void> {
    const result = await this.deps.db.invitation.updateMany({
      where: { id: invitationId, familyId: admin.familyId, revokedAt: null },
      data: { revokedAt: this.deps.clock.now() },
    });
    if (result.count === 0) throw AppError.notFound('Invitation introuvable.');
  }

  /** Aperçu avant de rejoindre : « Tu vas rejoindre la famille X ». */
  async preview(input: PreviewInvitationBody): Promise<InvitationPreviewDto> {
    const { code } = previewInvitationBodySchema.parse(input);
    const invitation = await this.findUsable(code);
    const family = await this.deps.db.family.findUniqueOrThrow({
      where: { id: invitation.familyId },
      select: { name: true, _count: { select: { members: { where: { active: true } } } } },
    });
    return { familyName: family.name, memberCount: family._count.members };
  }

  async join(userId: string, input: JoinFamilyBody): Promise<FamilyDto> {
    const { code, profile } = joinFamilyBodySchema.parse(input);
    const invitation = await this.findUsable(code);
    const { db, families } = this.deps;

    await db.$transaction(async (tx) => {
      const existing = await tx.member.findUnique({
        where: { familyId_userId: { familyId: invitation.familyId, userId } },
      });
      if (existing?.active) {
        throw new AppError(
          ApiErrorCode.ALREADY_MEMBER,
          409,
          'Tu fais déjà partie de cette famille.',
        );
      }

      const joinData = {
        ...profile,
        invitationId: invitation.id,
        role: 'MEMBER' as const,
        isShoppingResponsible: false,
        active: true,
      };
      if (existing) {
        // Retour d'un ancien membre : on réactive son profil (historique conservé).
        await tx.member.update({ where: { id: existing.id }, data: joinData });
      } else {
        await tx.member.create({ data: { ...joinData, familyId: invitation.familyId, userId } });
      }
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { useCount: { increment: 1 } },
      });
    });

    return families.get(invitation.familyId, userId);
  }

  /** Invitation active correspondant au code, sinon erreur explicite. */
  private async findUsable(code: string): Promise<Invitation> {
    const now = this.deps.clock.now();
    const candidates = await this.deps.db.invitation.findMany({
      where: { codeHash: this.hashCode(code), revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const active = candidates.find((invitation) => invitation.expiresAt > now);
    if (active) return active;
    if (candidates.length > 0) {
      throw new AppError(ApiErrorCode.INVITATION_EXPIRED, 410, "Ce code d'invitation a expiré.");
    }
    throw new AppError(ApiErrorCode.INVITATION_INVALID, 404, "Code d'invitation invalide.");
  }
}

function toInvitationDto(invitation: Invitation): InvitationDto {
  return {
    id: invitation.id,
    expiresAt: invitation.expiresAt.toISOString(),
    useCount: invitation.useCount,
    createdAt: invitation.createdAt.toISOString(),
  };
}
