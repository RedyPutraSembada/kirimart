import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const storeFollowers = pgTable("store_followers", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	storeId: integer("store_id").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})
