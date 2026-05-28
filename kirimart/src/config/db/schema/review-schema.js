import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const reviews = pgTable("reviews", {
	id: serial("id").primaryKey(),
	orderItemId: integer("order_item_id").notNull(),
	productId: integer("product_id").notNull(),
	userId: text("user_id").notNull(),
	rating: integer("rating").notNull(), // 1-5
	comment: text("comment"),
	imageUrl: text("image_url"),
	sellerReply: text("seller_reply"),
	sellerReplyAt: timestamp("seller_reply_at"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})
