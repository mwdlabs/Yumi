import type { TFunction } from 'i18next';
import type { MailMessage } from '../mailer.ts';

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Courriel contenant le code de connexion. Texte brut + HTML sobre (compatible clients mobiles). */
export function renderOtpEmail(
  t: TFunction,
  params: { to: string; code: string; appName: string; minutes: number },
): MailMessage {
  const vars = { appName: params.appName, minutes: params.minutes, code: params.code };
  const lines = {
    greeting: t('mail.otp.greeting', vars),
    intro: t('mail.otp.intro', vars),
    expiry: t('mail.otp.expiry', vars),
    ignore: t('mail.otp.ignore', vars),
    signature: t('mail.otp.signature', vars),
  };
  const e = (key: keyof typeof lines) => escapeHtml(lines[key]);

  return {
    to: params.to,
    subject: t('mail.otp.subject', vars),
    text: [
      lines.greeting,
      '',
      lines.intro,
      '',
      params.code,
      '',
      lines.expiry,
      lines.ignore,
      '',
      lines.signature,
    ].join('\n'),
    html: `<!doctype html>
<html lang="fr-CA"><body style="margin:0;background:#FFF8F1;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2B1D16">
<span style="display:none">${escapeHtml(t('mail.otp.preheader', vars))}</span>
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<p style="font-size:18px;margin:0 0 16px">${e('greeting')}</p>
<p style="margin:0 0 24px">${e('intro')}</p>
<p style="font-size:36px;font-weight:700;letter-spacing:8px;background:#FFFFFF;border-radius:22px;padding:20px;text-align:center;margin:0 0 24px">${escapeHtml(params.code)}</p>
<p style="margin:0 0 8px;color:#6E5B50">${e('expiry')}</p>
<p style="margin:0 0 24px;color:#6E5B50">${e('ignore')}</p>
<p style="margin:0">${e('signature')}</p>
</div></body></html>`,
  };
}
