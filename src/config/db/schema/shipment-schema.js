import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const shipments = pgTable("shipments", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	courier: text("courier").notNull(), // "jne", "sicepat", "grab"
	courierType: text("courier_type"), // "reg", "yes", "instant"
	service: text("service"), // "Reguler", "YES", "Instant"
	awbNumber: text("awb_number"), // Resi might be null initially
	biteshipOrderId: text("biteship_order_id"), // ID order di Biteship
	biteshipTrackingId: text("biteship_tracking_id"),
	status: text("status").default("pending"), // pending, confirmed, allocated, picking_up, picked, in_transit, dropping_off, delivered, cancelled, returned
	pickupMethod: text("pickup_method"), // "pickup" atau "drop_off"
	shippingFee: integer("shipping_fee"), // Tarif ongkir final (dari Biteship)
	estimatedDays: text("estimated_days"), // "1-2 hari"
	receiptPdfUrl: text("receipt_pdf_url"),
	createdAt: timestamp("created_at").defaultNow(),
})
