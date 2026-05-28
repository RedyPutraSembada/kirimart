import { Resend } from 'resend';
import { env } from '@/config/env';

// Menggunakan API key dari environment variable
const resend = new Resend(env.RESEND_API_KEY || 're_dummy123');

// Menggunakan domain kawanbelanja.com sesuai dengan auth.js agar resend berhasil jalan
const SENDER_EMAIL = env.EMAIL_FROM || 'support@kawanbelanja.com';

/**
 * Mengirim email transaksional
 * 
 * @param {string} to - Alamat email tujuan (harus terdaftar di resend jika pakai domain sandbox)
 * @param {string} subject - Judul email
 * @param {string} html - Konten email dalam format HTML
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export async function sendEmail(to, subject, html) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EMAIL] RESEND_API_KEY tidak ditemukan. Email batal dikirim.');
      return { success: false, error: 'API Key tidak dikonfigurasi' };
    }

    const data = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [to],
      subject: subject,
      html: html,
    });

    if (data.error) {
      console.error('[EMAIL ERROR]', data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`[EMAIL SUCCESS] Terkirim ke: ${to}, ID: ${data.data?.id}`);
    return { success: true, id: data.data?.id };
  } catch (error) {
    console.error('[EMAIL EXCEPTION]', error);
    return { success: false, error: error.message };
  }
}
