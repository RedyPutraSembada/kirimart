import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const orders = pgTable("orders", {
	id: serial("id").primaryKey(),
	paymentId: integer("payment_id").notNull(),
	storeId: integer("store_id").notNull(),
	userId: text("user_id").notNull(),
	status: text("status").notNull().default("pending"), // pending, paid, shipped, completed, cancelled
	totalShipping: integer("total_shipping").notNull().default(0),
	totalWeightGram: integer("total_weight_gram").notNull().default(0),
	grandTotal: integer("grand_total").notNull(),
	shippingAddressId: integer("shipping_address_id"),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})
