import nodemailer from 'nodemailer';
import type { Env } from '../config/env.ts';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** Abstraction d'envoi de courriel : SMTP en dev/prod, implémentation mémoire en test. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

/** Envoi via SMTP (Mailpit en local, fournisseur transactionnel en production). */
export function createSmtpMailer(env: Env): Mailer {
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } } : {}),
  });
  return {
    async send(message) {
      await transport.sendMail({ from: env.MAIL_FROM, ...message });
    },
  };
}
