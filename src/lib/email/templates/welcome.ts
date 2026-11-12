import { WelcomeTemplateData } from '../email-types.js';

export const welcomeTemplate = ({ name, appUrl }: WelcomeTemplateData): string => `
  <!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Selamat Datang!</title>
  </head>
  <body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
    <div style="max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; padding: 32px;">
      <h1 style="color: #1a1a1a;">Halo, ${name}! 👋</h1>
      <p style="color: #555; line-height: 1.6;">
        Selamat datang! Akun kamu sudah aktif dan siap digunakan.
      </p>
      <a href="${appUrl}"
        style="display: inline-block; margin-top: 16px; padding: 12px 24px;
               background: #4F46E5; color: #fff; border-radius: 6px;
               text-decoration: none; font-weight: bold;">
        Mulai Sekarang
      </a>
      <p style="margin-top: 32px; color: #999; font-size: 12px;">
        Jika kamu tidak mendaftar, abaikan email ini.
      </p>
    </div>
  </body>
  </html>
`;
