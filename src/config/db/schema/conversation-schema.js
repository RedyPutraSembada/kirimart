import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const conversations = pgTable("conversations", {
	id: serial("id").primaryKey(),
	buyerId: text("buyer_id").notNull(),
	storeId: integer("store_id").notNull(),
	// Product context — disimpan saat buyer buka chat dari halaman produk
	productId: integer("product_id"),
	productName: text("product_name"),
	productImage: text("product_image"),
	productPrice: integer("product_price"),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
