import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const shipments = pgTable("shipments", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	courier: text("courier").notNull(),
	awbNumber: text("awb_number"), // Resi might be null initially
})
