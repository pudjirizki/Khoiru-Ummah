import { welcomeTemplate } from './welcome.js';
import { notificationTemplate } from './notification.js';
import { EmailType, TemplateData } from '../email-types.js';

export const EMAIL_TEMPLATES: Record<EmailType, (data: TemplateData) => string> = {
  [EmailType.WELCOME]: welcomeTemplate as (data: TemplateData) => string,
  [EmailType.NOTIFICATION]: notificationTemplate as (data: TemplateData) => string,
};
