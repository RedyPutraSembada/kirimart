/**
 * Refund Request Schema
 * 
 * Tabel antrean kerja untuk Admin memproses pengembalian dana secara manual.
 * Record dibuat otomatis saat:
 * 1. Penjual membatalkan pesanan yang sudah dibayar (cancelled_by_seller)
 * 2. Komplain disetujui (accepted) dan perlu refund
 * 
 * Admin akan mentransfer uang secara manual ke rekening pembeli,
 * lalu mencatat nominal final dan bukti transfer di sini.
 */

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const refundRequests = pgTable("refund_requests", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	userId: text("user_id").notNull(),       // Pembeli yang berhak menerima refund
	complaintId: integer("complaint_id"),     // Null jika refund karena cancel seller (bukan komplain)

	// Data rekening pembeli (diisi oleh pembeli setelah refund disetujui)
	bankName: text("bank_name"),
	bankAccountNumber: text("bank_account_number"),
	bankAccountHolder: text("bank_account_holder"),

	// Nominal
	amountRequested: integer("amount_requested").notNull(),  // Grand total pesanan asal (sebelum potongan)
	amountRefunded: integer("amount_refunded"),               // Nominal final yang ditransfer admin (setelah potongan biaya)

	// Bukti transfer dari admin
	proofUrl: text("proof_url"),

	// Status
	// pending    → menunggu data bank dari pembeli atau menunggu admin transfer
	// processed  → admin sudah mentransfer
	status: text("status").notNull().default("pending"),

	// Catatan dari admin (misal: "Dikurangi biaya admin Rp 5.000")
	notes: text("notes"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	processedAt: timestamp("processed_at"),
})
