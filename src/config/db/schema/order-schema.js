import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const orders = pgTable("orders", {
	id: serial("id").primaryKey(),
	paymentId: integer("payment_id").notNull(),
	storeId: integer("store_id").notNull(),
	userId: text("user_id").notNull(),
	status: text("status").notNull().default("pending"), // pending, paid, shipped, completed
	totalShipping: integer("total_shipping").notNull().default(0),
	grandTotal: integer("grand_total").notNull(),
})
