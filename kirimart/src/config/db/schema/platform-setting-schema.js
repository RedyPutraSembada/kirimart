import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const platformSettings = pgTable("platform_settings", {
	id: serial("id").primaryKey(),
	key: text("key").notNull().unique(),
	value: text("value").notNull(),
	description: text("description"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
