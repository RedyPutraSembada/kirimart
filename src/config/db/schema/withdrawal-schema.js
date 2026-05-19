import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const withdrawals = pgTable("withdrawals", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id").notNull(),
	amount: integer("amount").notNull(),
	// Snapshot info rekening saat request (agar tidak berubah jika seller update rekening)
	bankName: text("bank_name").notNull(),
	bankAccountNumber: text("bank_account_number").notNull(),
	bankAccountHolder: text("bank_account_holder").notNull(),
	status: text("status").notNull().default("pending"), // pending, completed, rejected
	rejectedReason: text("rejected_reason"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	completedAt: timestamp("completed_at"),
})
