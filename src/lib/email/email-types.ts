export type WelcomeTemplateData = {
  name: string;
  appUrl: string;
};

export type NotificationTemplateData = {
  title: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
};

export type TemplateData = WelcomeTemplateData | NotificationTemplateData;

export type SendEmailPayload = {
  type: EmailType;
  to: string | string[];
  templateData: TemplateData;
};

export type EmailResult = {
  success: boolean;
  data?: { id: string };
  error?: string;
};

export enum EmailType {
  WELCOME = 'WELCOME',
  NOTIFICATION = 'NOTIFICATION',
}
