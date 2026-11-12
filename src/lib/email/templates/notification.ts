import { NotificationTemplateData } from '../email-types.js';

export const notificationTemplate = ({ title, message, ctaUrl, ctaLabel }: NotificationTemplateData): string => `
  <!DOCTYPE html>
  <html lang="id">
  <body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 32px;">
      <h2 style="color: #1a1a1a;">${title}</h2>
      <p style="color: #555; line-height: 1.6;">${message}</p>
      ${
        ctaUrl
          ? `<a href="${ctaUrl}"
             style="display: inline-block; margin-top: 16px; padding: 12px 24px;
                    background: #0EA5E9; color: #fff; border-radius: 6px;
                    text-decoration: none; font-weight: bold;">
             ${ctaLabel ?? 'Lihat Detail'}
           </a>`
          : ''
      }

        <div style="text-align: center; margin-top: 50px;">
          <a 
            href="https://khoiru-ummah-v2.vercel.app/" 
            style="font-style: italic;"
          >
            Khoiru Ummah
          </a>
      </div>
    </div>
  </body>
  </html>
`;
