import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core"

export const payments = pgTable("payments", {
	id: serial("id").primaryKey(),
	orderId: text("order_id").notNull().unique(),                    // ID unik untuk Midtrans: KM-{id}-{timestamp}
	userId: text("user_id").notNull(),
	globalVoucherId: integer("global_voucher_id"), // Voucher Global (Bebas Ongkir/Diskon Platform)
	globalDiscountAmount: integer("global_discount_amount").notNull().default(0),
	totalAmount: integer("total_amount").notNull(),
	status: text("status").notNull().default("pending"),             // pending, settlement, capture, deny, cancel, expire, refund

	// Biaya PG (dibebankan ke buyer, sudah termasuk PPN)
	pgFee: integer("pg_fee").notNull().default(0),
	paymentMethodId: text("payment_method_id"),                      // ID metode: bca_va, gopay, qris, dll

	// Midtrans Data
	snapToken: text("snap_token"),                                   // Token dari Snap API (legacy, bisa null)
	snapRedirectUrl: text("snap_redirect_url"),                      // URL redirect Snap (legacy)
	midtransTransactionId: text("midtrans_transaction_id"),          // Transaction ID dari Midtrans
	paymentType: text("payment_type"),                               // bank_transfer, gopay, credit_card, qris, dll
	paymentMethod: text("payment_method"),                           // bca, bni, gopay, dll (detail spesifik)
	// Data instruksi pembayaran dari Core API (VA number, QR URL, deep link, dll)
	paymentInstruction: jsonb("payment_instruction"),

	// Metadata JSONB
	metadataLocal: jsonb("metadata_local"),                          // Semua data checkout saat dibuat (items, address, shipping, totals)
	metadataPg: jsonb("metadata_pg"),                                // Response webhook dari Midtrans (raw JSON)

	// Timestamps
	expiresAt: timestamp("expires_at"),                              // Batas waktu pembayaran
	paidAt: timestamp("paid_at"),                                    // Waktu pembayaran berhasil
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
