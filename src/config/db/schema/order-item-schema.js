import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const orderItems = pgTable("order_items", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	productId: integer("product_id").notNull(),
	productNameSnapshot: text("product_name_snapshot").notNull(),
	priceSnapshot: integer("price_snapshot").notNull(),
	quantity: integer("quantity").notNull().default(1),
})
