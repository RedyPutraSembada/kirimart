import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core"

export const payments = pgTable("payments", {
	id: serial("id").primaryKey(),
	orderId: text("order_id").notNull().unique(),                    // ID unik untuk Midtrans: KM-{id}-{timestamp}
	userId: text("user_id").notNull(),
	totalAmount: integer("total_amount").notNull(),
	status: text("status").notNull().default("pending"),             // pending, settlement, capture, deny, cancel, expire, refund

	// Midtrans Data
	snapToken: text("snap_token"),                                   // Token dari Snap API
	snapRedirectUrl: text("snap_redirect_url"),                      // URL redirect Snap
	midtransTransactionId: text("midtrans_transaction_id"),          // Transaction ID dari Midtrans
	paymentType: text("payment_type"),                               // bank_transfer, gopay, credit_card, qris, dll
	paymentMethod: text("payment_method"),                           // bca, bni, gopay, dll (detail spesifik)

	// Metadata JSONB
	metadataLocal: jsonb("metadata_local"),                          // Semua data checkout saat dibuat (items, address, shipping, totals)
	metadataPg: jsonb("metadata_pg"),                                // Response webhook dari Midtrans (raw JSON)

	// Timestamps
	expiresAt: timestamp("expires_at"),                              // Batas waktu pembayaran
	paidAt: timestamp("paid_at"),                                    // Waktu pembayaran berhasil
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
