/**
 * Notification Server Actions
 * 
 * CRUD untuk notifikasi real-time.
 * Notifikasi dibuat oleh server (webhook/server action), disimpan ke DB,
 * lalu dikirim real-time ke browser via WebSocket.
 * 
 * Tipe notifikasi:
 * - new_order       → Seller: ada pesanan baru masuk
 * - payment_success → Buyer: pembayaran berhasil
 * - order_processing → Buyer: pesanan sedang dikemas seller
 * - order_shipped   → Buyer: pesanan dikirim + nomor resi
 * - order_delivered  → Buyer: pesanan sampai tujuan
 * - new_review      → Seller: review baru dari buyer
 */
"use server"

import { db } from "@/config/db"
import { notifications } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, desc, sql } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// CREATE NOTIFICATION (dipanggil dari server)
// ============================================

/**
 * Buat notifikasi baru dan simpan ke DB.
 * Dipanggil dari webhook atau server action (BUKAN dari client).
 *
 * @param {string} userId - ID user penerima
 * @param {string} type - Tipe notifikasi
 * @param {string} title - Judul
 * @param {string} message - Pesan detail
 * @param {Object} data - Data tambahan (orderId, storeId, dll)
 * @returns {Object} Notifikasi yang baru dibuat
 */
export async function createNotification(userId, type, title, message, data = {}) {
	try {
		const [notif] = await db.insert(notifications).values({
			userId,
			type,
			title,
			message,
			data,
		}).returning()

		return notif
	} catch (error) {
		console.error("[createNotification]", error)
		return null
	}
}

// ============================================
// GET MY NOTIFICATIONS
// ============================================

/**
 * Ambil notifikasi untuk user yang sedang login.
 * - Notif BELUM dibaca: selalu tampil
 * - Notif SUDAH dibaca: hilang setelah 24 jam
 * - Auto-delete notif > 7 hari dari DB
 *
 * @returns {{ success: boolean, data?: Array }}
 */
export async function getMyNotifications() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		// Auto-cleanup: hapus notif > 7 hari
		try {
			await db.delete(notifications).where(and(
				eq(notifications.userId, session.user.id),
				sql`${notifications.createdAt} < NOW() - INTERVAL '7 days'`
			))
		} catch { /* cleanup gagal tidak masalah */ }

		// Ambil notif: unread semua + read yang < 24 jam
		const result = await db.select()
			.from(notifications)
			.where(and(
				eq(notifications.userId, session.user.id),
				sql`(${notifications.isRead} = false OR ${notifications.createdAt} > NOW() - INTERVAL '24 hours')`
			))
			.orderBy(desc(notifications.createdAt))
			.limit(30)

		return { success: true, data: result }
	} catch (error) {
		console.error("[getMyNotifications]", error)
		return { success: false, error: "Gagal mengambil notifikasi." }
	}
}

// ============================================
// GET UNREAD NOTIFICATION COUNT
// ============================================

/**
 * Hitung jumlah notifikasi yang belum dibaca.
 *
 * @returns {{ success: boolean, data?: number }}
 */
export async function getUnreadNotifCount() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: true, data: 0 }
		}

		const [result] = await db.select({
			count: sql`COUNT(*)::int`
		})
			.from(notifications)
			.where(and(
				eq(notifications.userId, session.user.id),
				eq(notifications.isRead, false)
			))

		return { success: true, data: result?.count || 0 }
	} catch (error) {
		console.error("[getUnreadNotifCount]", error)
		return { success: true, data: 0 }
	}
}

// ============================================
// MARK AS READ
// ============================================

/**
 * Tandai satu notifikasi sebagai sudah dibaca.
 *
 * @param {number} notifId
 * @returns {{ success: boolean }}
 */
export async function markNotifAsRead(notifId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Silakan login." }
		}

		await db.update(notifications)
			.set({ isRead: true })
			.where(and(
				eq(notifications.id, parseInt(notifId)),
				eq(notifications.userId, session.user.id)
			))

		return { success: true }
	} catch (error) {
		console.error("[markNotifAsRead]", error)
		return { success: false, error: "Gagal update notifikasi." }
	}
}

// ============================================
// MARK ALL AS READ
// ============================================

/**
 * Tandai semua notifikasi user sebagai sudah dibaca.
 *
 * @returns {{ success: boolean }}
 */
export async function markAllNotifsAsRead() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Silakan login." }
		}

		await db.update(notifications)
			.set({ isRead: true })
			.where(and(
				eq(notifications.userId, session.user.id),
				eq(notifications.isRead, false)
			))

		return { success: true }
	} catch (error) {
		console.error("[markAllNotifsAsRead]", error)
		return { success: false, error: "Gagal update notifikasi." }
	}
}
