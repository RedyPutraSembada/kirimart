import {
    bigint,
    boolean,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 })
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
    role: text('role'),
    banned: boolean('banned').default(false),
    banReason: text('ban_reason'),
    banExpires: timestamp('ban_expires', { fsp: 3 }),
    phoneNumber: varchar('phone_number', { length: 255 }).unique(),
    phoneNumberVerified: boolean('phone_number_verified'),
})

export const session = pgTable(
    'session',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
        token: varchar('token', { length: 255 }).notNull().unique(),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 })
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text('ip_address'),
        userAgent: text('user_agent'),
        userId: varchar('user_id', { length: 36 })
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        impersonatedBy: text('impersonated_by'),
    },
    (table) => [index('session_userId_idx').on(table.userId)],
)

export const account = pgTable(
    'account',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        accountId: text('account_id').notNull(),
        providerId: text('provider_id').notNull(),
        userId: varchar('user_id', { length: 36 })
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        idToken: text('id_token'),
        accessTokenExpiresAt: timestamp('access_token_expires_at', { fsp: 3 }),
        refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { fsp: 3 }),
        scope: text('scope'),
        password: text('password'),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 })
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index('account_userId_idx').on(table.userId)],
)

export const verification = pgTable(
    'verification',
    {
        id: varchar('id', { length: 36 }).primaryKey(),
        identifier: varchar('identifier', { length: 255 }).notNull(),
        value: text('value').notNull(),
        expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
        createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
        updatedAt: timestamp('updated_at', { fsp: 3 })
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index('verification_identifier_idx').on(table.identifier)],
)

export const rateLimit = pgTable('rate_limit', {
    id: varchar('id', { length: 36 }).primaryKey(),
    key: varchar('key', { length: 255 }).notNull().unique(),
    count: integer('count').notNull(),
    lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
})
