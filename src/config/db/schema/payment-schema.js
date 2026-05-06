import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const payments = pgTable("payments", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	totalAmount: integer("total_amount").notNull(),
	status: text("status").notNull().default("pending"), // pending, success, failed
})
