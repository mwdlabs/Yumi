import type { PushData } from '@yumi/shared';
import type { TFunction } from 'i18next';
import type { Clock } from '../lib/clock.ts';
import type { Logger } from '../lib/logger.ts';
import type { Database } from '../lib/prisma.ts';
import type { PushMessage, PushSender } from './push-sender.ts';

const HOUR_MS = 60 * 60 * 1000;
/** Le rappel « choisis ton plat » part 24 h avant l'échéance de la semaine. */
const COOK_REMINDER_LEAD_MS = 24 * HOUR_MS;
/** Au-delà, une échéance manquée (serveur arrêté) ne déclenche plus « liste prête ». */
const LIST_READY_GRACE_MS = 12 * HOUR_MS;

interface Recipient {
  userId: string;
  title: string;
  body: string;
  data: PushData;
}

interface RemindersDeps {
  db: Database;
  push: PushSender;
  t: TFunction;
  clock: Clock;
  logger: Logger;
}

/**
 * Rappels de la semaine, lancés chaque minute par le serveur (`run`).
 *
 * - 24 h avant l'échéance : chaque jour réservé sans plat (« à choisir ») vaut un rappel
 *   à son cuisinier ; pour un profil enfant, aux admins de la famille.
 * - À l'échéance : « liste prête » aux responsables des courses, s'il reste des articles.
 *
 * Chaque envoi est réservé une seule fois par semaine (`*SentAt`), même si plusieurs
 * exécutions se chevauchent.
 */
export class RemindersService {
  constructor(private readonly deps: RemindersDeps) {}

  async run(): Promise<void> {
    await this.sendCookReminders();
    await this.sendListReady();
  }

  private async sendCookReminders(): Promise<void> {
    const { db, clock, t } = this.deps;
    const now = clock.now();
    const weeks = await db.week.findMany({
      where: {
        cookReminderSentAt: null,
        deadlineAt: { gt: now, lte: new Date(now.getTime() + COOK_REMINDER_LEAD_MS) },
      },
      select: { id: true, deadlineAt: true, family: { select: { id: true, timezone: true } } },
    });

    for (const week of weeks) {
      if (!(await this.claim(week.id, 'cookReminderSentAt'))) continue;

      const meals = await db.meal.findMany({
        where: { weekId: week.id, recipeId: null, cook: { active: true } },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          date: true,
          cook: { select: { displayName: true, userId: true, user: { select: { email: true } } } },
        },
      });
      if (meals.length === 0) continue;

      const deadline = formatDeadline(week.deadlineAt, week.family.timezone);
      const admins = await db.member.findMany({
        where: { familyId: week.family.id, active: true, role: 'ADMIN' },
        select: { userId: true },
      });

      const recipients: Recipient[] = meals.flatMap((meal) => {
        const isoDate = meal.date.toISOString().slice(0, 10);
        const day = formatDay(meal.date);
        const data = { url: `/choisir?date=${isoDate}&mealId=${meal.id}` };
        if (meal.cook.user.email !== null) {
          return [
            {
              userId: meal.cook.userId,
              title: t('push.cookReminder.title', { day }),
              body: t('push.cookReminder.body', { day, deadline }),
              data,
            },
          ];
        }
        const name = meal.cook.displayName;
        return admins.map((admin) => ({
          userId: admin.userId,
          title: t('push.managedCookReminder.title', { name }),
          body: t('push.managedCookReminder.body', { name, day, deadline }),
          data,
        }));
      });
      await this.deliver(recipients);
    }
  }

  private async sendListReady(): Promise<void> {
    const { db, clock, t } = this.deps;
    const now = clock.now();
    const weeks = await db.week.findMany({
      where: {
        listReadyNotifiedAt: null,
        deadlineAt: { lte: now, gt: new Date(now.getTime() - LIST_READY_GRACE_MS) },
      },
      select: { id: true, familyId: true },
    });

    for (const week of weeks) {
      if (!(await this.claim(week.id, 'listReadyNotifiedAt'))) continue;

      const count = await db.shoppingItem.count({ where: { weekId: week.id, checkedAt: null } });
      if (count === 0) continue;

      const shoppers = await db.member.findMany({
        where: { familyId: week.familyId, active: true, isShoppingResponsible: true },
        select: { userId: true },
      });
      await this.deliver(
        shoppers.map((shopper) => ({
          userId: shopper.userId,
          title: t('push.listReady.title'),
          body: t('push.listReady.body', { count }),
          data: { url: '/courses' },
        })),
      );
    }
  }

  /** Réserve l'envoi : vrai pour une seule exécution, même en concurrence. */
  private async claim(
    weekId: string,
    field: 'cookReminderSentAt' | 'listReadyNotifiedAt',
  ): Promise<boolean> {
    const claimed = await this.deps.db.week.updateMany({
      where: { id: weekId, [field]: null },
      data: { [field]: this.deps.clock.now() },
    });
    return claimed.count === 1;
  }

  /** Envoie à tous les appareils actifs des destinataires ; oublie les jetons invalides. */
  private async deliver(recipients: readonly Recipient[]): Promise<void> {
    const { db, push, logger } = this.deps;
    if (recipients.length === 0) return;

    const devices = await db.pushDevice.findMany({
      where: { userId: { in: [...new Set(recipients.map((r) => r.userId))] }, disabledAt: null },
      select: { id: true, token: true, userId: true },
    });
    const sends = recipients.flatMap((recipient) =>
      devices
        .filter((device) => device.userId === recipient.userId)
        .map((device) => ({
          deviceId: device.id,
          message: {
            to: device.token,
            title: recipient.title,
            body: recipient.body,
            data: recipient.data,
          } satisfies PushMessage,
        })),
    );
    if (sends.length === 0) return;

    const results = await push.send(sends.map((s) => s.message));
    const invalid = sends.filter((_, index) => {
      const result = results[index];
      return result && !result.ok && result.invalidToken;
    });
    if (invalid.length > 0) {
      await db.pushDevice.updateMany({
        where: { id: { in: invalid.map((s) => s.deviceId) } },
        data: { disabledAt: this.deps.clock.now() },
      });
    }
    const failed = results.filter((result) => !result.ok).length;
    logger.info({ sent: results.length - failed, failed }, 'Notifications envoyées');
  }
}

/** « dimanche 23 novembre » ; `date` est une date locale stockée à minuit UTC. */
function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

/** « vendredi 18 h 00 » dans le fuseau de la famille. */
function formatDeadline(instant: Date, timezone: string): string {
  return new Intl.DateTimeFormat('fr-CA', {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(instant);
}
