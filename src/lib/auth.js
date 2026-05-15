import { betterAuth } from "better-auth";
import { Resend } from 'resend'
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/config/env";
import * as schema from '@/config/db/schema'
import { db } from "@/config/db";
import { admin as adminPlugin } from 'better-auth/plugins'
import { emailOTP } from 'better-auth/plugins'
import { ac, admin, user, member, seller } from '@/lib/permissions'

const resend = new Resend(env.RESEND_API_KEY)
const appName = env.NEXT_PUBLIC_APP_NAME

export const auth = betterAuth({
    appName: appName ? appName : 'My App',
    baseURL: env.NEXT_PUBLIC_APP_URL,
    basePath: '/api/auth',
    trustedOrigins: async () => {
        const trustedOriginList = env.TRUSTED_ORIGINS
            ? env.TRUSTED_ORIGINS.split(',').map((origin) => origin.trim())
            : []
        return trustedOriginList
    },
    database: drizzleAdapter(db, {
        provider: 'pg',
        schema: schema,
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            console.log(`[RESET_PASSWORD] Sending reset link to ${user.email}`)
            await resend.emails.send({
                from: 'support@kawanbelanja.com',
                to: user.email,
                subject: `Reset Password — ${appName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 450px; margin: 0 auto; padding: 24px;">
                        <h2 style="color: #333; margin-bottom: 8px;">Reset Password Anda</h2>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            Halo <strong>${user.name || 'Pengguna'}</strong>,<br/>
                            Kami menerima permintaan untuk mereset password akun <strong>${appName}</strong> Anda. 
                            Klik tombol di bawah untuk membuat password baru:
                        </p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${url}" style="display: inline-block; padding: 12px 32px; background: #c2410c; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">
                                Reset Password
                            </a>
                        </div>
                        <p style="color: #999; font-size: 12px;">
                            Link ini berlaku selama 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.
                        </p>
                    </div>
                `,
            })
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: false, // Jangan auto-login setelah verifikasi — user harus login manual
        sendVerificationEmail: async ({ user, url, token }, request) => {
            console.log(`[EMAIL_VERIFY] Sending verification to ${user.email}`)

            await resend.emails.send({
                from: 'support@kawanbelanja.com',
                to: user.email,
                subject: `Verifikasi Email — ${appName}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 450px; margin: 0 auto; padding: 24px;">
                        <h2 style="color: #333; margin-bottom: 8px;">Verifikasi Email Anda</h2>
                        <p style="color: #666; font-size: 14px; line-height: 1.6;">
                            Halo <strong>${user.name || 'Pengguna'}</strong>,<br/>
                            Terima kasih telah mendaftar di <strong>${appName}</strong>. 
                            Klik tombol di bawah untuk memverifikasi email Anda:
                        </p>
                        <div style="text-align: center; margin: 24px 0;">
                            <a href="${url}" style="display: inline-block; padding: 12px 32px; background: #c2410c; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px;">
                                Verifikasi Email
                            </a>
                        </div>
                        <p style="color: #999; font-size: 12px;">
                            Jika Anda tidak mendaftar, abaikan email ini.
                        </p>
                    </div>
                `,
            })
        },
    },
    socialProviders: {
        google: {
            clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: 'select_account consent',
        },
    },
    plugins: [
        adminPlugin({
            ac,
            roles: {
                admin,
                user,
                member,
                seller
            },
            defaultRole: 'user',
        }),
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                console.log(`[EMAIL_OTP] Sending OTP to ${email}: ${otp} (type: ${type})`)
                await resend.emails.send({
                    from: 'support@kawanbelanja.com',
                    to: email,
                    subject: `Kode Verifikasi ${appName}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #333; margin-bottom: 8px;">Kode Verifikasi Anda</h2>
                            <p style="color: #666; font-size: 14px;">Gunakan kode berikut untuk masuk ke akun ${appName} Anda:</p>
                            <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin: 16px 0;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${otp}</span>
                            </div>
                            <p style="color: #999; font-size: 12px;">Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun.</p>
                        </div>
                    `,
                })
            },
        }),
    ],
    user: {
        additionalFields: {
            phoneNumber: {
                type: "string",
                required: false,
            },
            phoneNumberVerified: {
                type: "boolean",
                required: false,
            }
        },
    },
})