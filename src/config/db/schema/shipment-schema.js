import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const shipments = pgTable("shipments", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	courier: text("courier").notNull(),
	service: text("service"),
	awbNumber: text("awb_number"), // Resi might be null initially
	kiriminajaOrderId: text("kiriminaja_order_id"),
	status: text("status").default("pending"),
	pickupMethod: text("pickup_method"),
	receiptPdfUrl: text("receipt_pdf_url"),
})
