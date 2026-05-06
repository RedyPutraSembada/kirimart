import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const reviews = pgTable("reviews", {
	id: serial("id").primaryKey(),
	orderItemId: integer("order_item_id").notNull(),
	userId: text("user_id").notNull(),
	rating: integer("rating").notNull(), // 1-5
	comment: text("comment"),
	imageUrl: text("image_url"),
})
