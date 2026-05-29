import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const orders = pgTable("orders", {
	id: serial("id").primaryKey(),
	paymentId: integer("payment_id").notNull(),
	storeId: integer("store_id").notNull(),
	userId: text("user_id").notNull(),
	status: text("status").notNull().default("pending"), // pending, paid, processing, shipped, completed, cancelled, cancelled_by_seller, complained, refunded
	totalShipping: integer("total_shipping").notNull().default(0),
	totalWeightGram: integer("total_weight_gram").notNull().default(0),
	voucherId: integer("voucher_id"), // Voucher Toko
	discountAmount: integer("discount_amount").notNull().default(0),
	grandTotal: integer("grand_total").notNull(),
	platformFee: integer("platform_fee").notNull().default(0), // Komisi platform yang dipotong dari pesanan ini
	shippingAddressId: integer("shipping_address_id"),
	notes: text("notes"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})
