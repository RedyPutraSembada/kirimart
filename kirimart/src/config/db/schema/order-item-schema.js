import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const orderItems = pgTable("order_items", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	productId: integer("product_id").notNull(),
	variantId: integer("variant_id"), // null = produk tanpa varian
	productNameSnapshot: text("product_name_snapshot").notNull(),
	variantNameSnapshot: text("variant_name_snapshot"), // e.g. "Jet Black, M"
	priceSnapshot: integer("price_snapshot").notNull(),
	quantity: integer("quantity").notNull().default(1),
})
