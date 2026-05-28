/**
 * Notification Schema
 * 
 * Menyimpan semua notifikasi untuk user (buyer/seller).
 * Notifikasi dibuat oleh server (webhook, server action) lalu
 * dikirim real-time via WebSocket + disimpan di DB agar bisa
 * dilihat nanti meskipun user offline saat event terjadi.
 */

import { pgTable, serial, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core"

export const notifications = pgTable("notifications", {
	id: serial("id").primaryKey(),

	// User penerima notifikasi
	userId: text("user_id").notNull(),

	// Tipe notifikasi — untuk icon, warna, dan routing di frontend
	// Contoh: "new_order", "order_shipped", "order_delivered", "payment_success", "new_review"
	type: text("type").notNull(),

	// Judul & isi notifikasi (sudah di-format, siap tampil)
	title: text("title").notNull(),
	message: text("message").notNull(),

	// Data tambahan dalam format JSON (orderId, storeId, dll)
	// Digunakan untuk navigasi: klik notifikasi → buka halaman terkait
	data: jsonb("data"),

	// Status baca
	isRead: boolean("is_read").default(false).notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
})
