import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const wishlists = pgTable("wishlists", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	productId: integer("product_id").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})
