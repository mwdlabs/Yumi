import {
  registerPushDeviceBodySchema,
  unregisterPushDeviceBodySchema,
  type RegisterPushDeviceBody,
  type UnregisterPushDeviceBody,
} from '@yumi/shared';
import type { Database } from '../../lib/prisma.ts';

/**
 * Enregistre l'appareil de l'utilisateur pour les notifications. Un même jeton ne
 * sert qu'à un compte à la fois : il suit la dernière personne connectée sur l'appareil.
 */
export async function registerPushDevice(
  db: Database,
  userId: string,
  input: RegisterPushDeviceBody,
): Promise<void> {
  const { token, platform } = registerPushDeviceBodySchema.parse(input);
  const now = new Date();
  await db.pushDevice.upsert({
    where: { token },
    update: { userId, platform, lastSeenAt: now, disabledAt: null },
    create: { userId, token, platform, lastSeenAt: now },
  });
}

/** Retire l'appareil (déconnexion). Idempotent. */
export async function unregisterPushDevice(
  db: Database,
  userId: string,
  input: UnregisterPushDeviceBody,
): Promise<void> {
  const { token } = unregisterPushDeviceBodySchema.parse(input);
  await db.pushDevice.deleteMany({ where: { token, userId } });
}
