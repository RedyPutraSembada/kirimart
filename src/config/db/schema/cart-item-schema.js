import { pgTable, serial, integer } from "drizzle-orm/pg-core"

export const cartItems = pgTable("cart_items", {
	id: serial("id").primaryKey(),
	cartId: integer("cart_id").notNull(),
	productId: integer("product_id").notNull(),
	quantity: integer("quantity").notNull().default(1),
})
