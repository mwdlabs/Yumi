import { z } from 'zod';

/** POST /me/push-devices : enregistre le jeton de notifications de l'appareil. */
export const registerPushDeviceBodySchema = z.object({
  /** Jeton Expo : « ExponentPushToken[…] ». */
  token: z
    .string()
    .trim()
    .regex(/^Expo(nent)?PushToken\[.+\]$/),
  platform: z.enum(['IOS', 'ANDROID']),
});
export type RegisterPushDeviceBody = z.infer<typeof registerPushDeviceBodySchema>;

/** DELETE /me/push-devices : retire le jeton (déconnexion, notifications coupées). */
export const unregisterPushDeviceBodySchema = registerPushDeviceBodySchema.pick({ token: true });
export type UnregisterPushDeviceBody = z.infer<typeof unregisterPushDeviceBodySchema>;

/** Données jointes à une notification : l'écran à ouvrir quand on la touche. */
export interface PushData {
  url: string;
}
