import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().min(1),
        TRUSTED_ORIGINS: z.string().min(1),
        BETTER_AUTH_SECRET: z.string().min(1),
        BETTER_AUTH_URL: z.string().min(1),
        GOOGLE_CLIENT_SECRET: z.string().min(1),
        RESEND_API_KEY: z.string().min(1),

        // Midtrans Payment Gateway
        MIDTRANS_SERVER_KEY: z.string().min(1),
        MIDTRANS_CLIENT_KEY: z.string().min(1),
        MIDTRANS_IS_PRODUCTION: z.string().default("false"),
        MIDTRANS_MERCHANT_ID: z.string().min(1),

        // REDIS_HOST: z.string().min(1),
        // REDIS_PORT: z.coerce.number().int(),
        // REDIS_PASSWORD: z.string().optional(),
        // REDIS_DB: z.coerce.number().int().default(0),
        // REDIS_MAX_RETRIES_PER_REQUEST: z.coerce.number().nullable().optional(),
        // QUEUE_NAME: z.string().min(1),
    },

    client: {
        NEXT_PUBLIC_APP_URL: z.string().min(1),
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
        NEXT_PUBLIC_APP_NAME: z.string().min(1),
        NEXT_PUBLIC_UPLOAD_URI: z.string().min(1),
        NEXT_PUBLIC_UPLOAD_API_KEY: z.string().min(1),
        NEXT_PUBLIC_MAX_FILE_SIZE_MB: z.string().min(1),

        // Midtrans (client-side)
        NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: z.string().min(1),
        NEXT_PUBLIC_MIDTRANS_SNAP_URL: z.string().min(1),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        RESEND_API_KEY: process.env.RESEND_API_KEY,

        // Midtrans (server)
        MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
        MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY,
        MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION,
        MIDTRANS_MERCHANT_ID: process.env.MIDTRANS_MERCHANT_ID,

        // REDIS_HOST: process.env.REDIS_HOST,
        // REDIS_PORT: process.env.REDIS_PORT,
        // REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        // REDIS_DB: process.env.REDIS_DB,
        // REDIS_MAX_RETRIES_PER_REQUEST: process.env.REDIS_MAX_RETRIES_PER_REQUEST,

        NEXT_PUBLIC_UPLOAD_URI: process.env.NEXT_PUBLIC_UPLOAD_URI,
        NEXT_PUBLIC_UPLOAD_API_KEY: process.env.NEXT_PUBLIC_UPLOAD_API_KEY,
        NEXT_PUBLIC_MAX_FILE_SIZE_MB: process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB,

        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,

        // Midtrans (client)
        NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
        NEXT_PUBLIC_MIDTRANS_SNAP_URL: process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL,

        QUEUE_NAME: process.env.QUEUE_NAME,
    },
})
