/**
 * Complaint Schema
 * 
 * Menyimpan data komplain pesanan dari pembeli.
 * Digunakan saat pembeli menerima barang cacat, salah varian, atau tidak sesuai.
 */

import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const complaints = pgTable("complaints", {
	id: serial("id").primaryKey(),
	orderId: integer("order_id").notNull(),
	userId: text("user_id").notNull(),      // Pembeli yang mengajukan komplain
	storeId: integer("store_id").notNull(),  // Toko yang di-komplain

	// Alasan dan bukti
	reason: text("reason").notNull(),        // Alasan komplain (teks bebas)
	evidenceUrl: text("evidence_url"),       // Foto bukti (URL)

	// Status komplain
	// pending           → baru diajukan, menunggu respon penjual
	// accepted          → penjual setuju refund (dan return_requested pada order)
	// rejected          → penjual menolak komplain
	// resolved_by_admin → admin turun tangan menyelesaikan
	status: text("status").notNull().default("pending"),

	// Info pengiriman retur dari pembeli ke penjual
	returnAwbNumber: text("return_awb_number"),
	returnCourier: text("return_courier"),

	// Info rekening pengembalian dana (diisi oleh pembeli)
	bankName: text("bank_name"),
	bankAccountNumber: text("bank_account_number"),
	bankAccountHolder: text("bank_account_holder"),

	// Respon penjual (jika menolak)
	sellerResponse: text("seller_response"),

	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
})
