import { Resend } from 'resend';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { EMAIL_TEMPLATES } from '../src/lib/email/templates/index.js';
import { EmailType, SendEmailPayload, TemplateData } from '../src/lib/email/email-types.js';

const resend = new Resend(process.env.RESEND_API_KEY);
const DEFAULT_FROM = 'Khoiru Ummah <noreply@keansignature.com>';
// const DEFAULT_FROM = 'Khoiru Ummah <noreply@resend.dev>';

const SUBJECT_MAP: Record<EmailType, (data: TemplateData) => string> = {
  [EmailType.WELCOME]: () => 'Selamat Datang di Platform Kami! 🎉',
  [EmailType.NOTIFICATION]: (data) => ('title' in data ? data.title : 'Ada Notifikasi Untukmu'),
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { type, to, templateData } = req.body as SendEmailPayload;

  const recipients = Array.isArray(to) ? to : [to];

  if (!type || !recipients.length || !templateData) {
    res.status(400).json({ error: "Field 'type', 'to', dan 'templateData' wajib diisi." });
    return;
  }

  if (!Object.values(EmailType).includes(type)) {
    res.status(400).json({ error: `Tipe email '${type}' tidak valid.` });
    return;
  }

  const templateFn = EMAIL_TEMPLATES[type];
  if (!templateFn) {
    res.status(404).json({ error: `Template '${type}' tidak ditemukan.` });
    return;
  }

  const html = templateFn(templateData);
  const subject = SUBJECT_MAP[type](templateData);

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: recipients,
      subject,
      html,
    });

    if (error) {
      console.error('[send-email] Resend error:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ success: true, emailId: data?.id });
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengirim email.' });
  }
}
