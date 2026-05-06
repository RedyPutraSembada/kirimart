import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const conversations = pgTable("conversations", {
	id: serial("id").primaryKey(),
	buyerId: text("buyer_id").notNull(),
	storeId: integer("store_id").notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
