import { betterAuth } from "better-auth";
import { Resend } from 'resend'
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/config/env";
import * as schema from '@/config/db/schema'
import { db } from "@/config/db";
import { admin as adminPlugin } from 'better-auth/plugins'
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
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }, request) => {
            console.log('Test Send Email')
            console.log(user, url, token)

            await resend.emails.send({
                from: 'support@goxpay.id',
                to: user.email,
                subject: 'Verified Email',
                html: `<p>Klik link ini untuk verifikasi: <a href="${url}">${url}</a></p>`,
                // react: VerifyEmail({
                //     userEmail: user.email,
                //     verifyLink: url,
                // }),
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