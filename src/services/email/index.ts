import { EmailType, SendEmailPayload, NotificationTemplateData } from './emailTypes';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : (import.meta.env.VITE_APP_URL ?? '');
const getAppUrl = (): string => import.meta.env.VITE_APP_URL ?? window.location.origin;

const callSendEmail = async (payload: SendEmailPayload): Promise<{ success: boolean; emailId?: string }> => {
  const response = await fetch(`${API_URL}/api/send-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? 'Gagal mengirim email.');
  }

  return response.json();
};

export const sendWelcomeEmail = (to: string, name: string): Promise<{ success: boolean; emailId?: string }> => {
  return callSendEmail({
    type: EmailType.WELCOME,
    to,
    templateData: { name, appUrl: window.location.origin },
  });
};

export const sendNotificationEmail = (
  to: string | string[],
  title: string,
  message: string,
  options: Pick<NotificationTemplateData, 'ctaUrl' | 'ctaLabel'> = {}
): Promise<{ success: boolean; emailId?: string }> => {
  return callSendEmail({
    type: EmailType.NOTIFICATION,
    to,
    templateData: { title, message, ...options },
  });
};

export const sendFormNotificationEmail = (to: string | string[], formId: string, formTitle: string): Promise<{ success: boolean; emailId?: string }> => {
  return sendNotificationEmail(to, `Formulir Baru: ${formTitle}`, 'Silahkan mengisi formulir dengan mengklik tombol berikut ini.', {
    ctaUrl: `${getAppUrl()}/dashboard/form/${formId}/input`,
    ctaLabel: 'Isi Formulir',
  });
};
