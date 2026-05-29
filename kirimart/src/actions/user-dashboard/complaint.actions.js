/**
 * Complaint Server Actions (Buyer)
 * 
 * Aksi-aksi terkait komplain pesanan dari sisi pembeli.
 * Mengikuti 7-layer architecture: Action → DB → Notification.
 */
"use server"

import { db } from "@/config/db"
import { complaints, orders, refundRequests } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Get session
// ============================================

async function getAuthSession() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null
	return session
}

// ============================================
// SUBMIT COMPLAINT (Pembeli mengajukan komplain)
// ============================================

/**
 * Pembeli mengajukan komplain terhadap pesanan yang bermasalah.
 * Hanya bisa dilakukan jika status pesanan `shipped` atau `completed`.
 * 
 * @param {number} orderId
 * @param {string} reason - Alasan komplain
 * @param {string} [evidenceUrl] - URL foto bukti
 */
export async function submitComplaint(orderId, reason, evidenceUrl = null) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		if (!reason || reason.trim().length < 10) {
			return { success: false, error: "Alasan komplain minimal 10 karakter." }
		}

		// Ambil order dan pastikan milik user ini
		const order = await db.query.orders.findFirst({
			where: and(
				eq(orders.id, parseInt(orderId)),
				eq(orders.userId, session.user.id)
			),
			with: { complaint: true }
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan." }
		}

		// Hanya bisa komplain jika status shipped atau completed
		if (!["shipped", "completed"].includes(order.status)) {
			return { success: false, error: "Pesanan ini tidak bisa dikomplain. Status saat ini: " + order.status }
		}

		// Cek apakah sudah pernah mengajukan komplain
		if (order.complaint) {
			return { success: false, error: "Anda sudah mengajukan komplain untuk pesanan ini." }
		}

		// Buat komplain
		const [newComplaint] = await db.insert(complaints).values({
			orderId: parseInt(orderId),
			userId: session.user.id,
			storeId: order.storeId,
			reason: reason.trim(),
			evidenceUrl: evidenceUrl || null,
		}).returning()

		// Update status order → complained
		await db.update(orders)
			.set({ status: "complained" })
			.where(eq(orders.id, parseInt(orderId)))

		// Kirim notifikasi real-time ke penjual
		try {
			const { createNotification } = await import("@/actions/public/notification.actions")
			const { wsEmit } = await import("@/lib/ws-emit")
			const { stores } = await import("@/config/db/schema")

			const store = await db.query.stores.findFirst({
				where: eq(stores.id, order.storeId),
			})

			if (store) {
				const notif = await createNotification(
					store.userId,
					"complaint_received",
					"⚠️ Komplain Baru!",
					`Pembeli mengajukan komplain untuk pesanan #${order.id}: "${reason.trim().substring(0, 50)}..."`,
					{
						orderId: order.id,
						complaintId: newComplaint.id,
					}
				)
				if (notif) {
					await wsEmit("notifications", `user:${store.userId}`, "notification", notif)
				}
			}
		} catch (notifError) {
			console.warn("[submitComplaint] Failed to send notification:", notifError.message)
		}

		return { success: true, message: "Komplain berhasil diajukan. Menunggu respon penjual." }
	} catch (error) {
		console.error("[submitComplaint]", error)
		return { success: false, error: "Gagal mengajukan komplain." }
	}
}

// ============================================
// SUBMIT BANK INFO (Pembeli mengisi data rekening untuk refund)
// ============================================

/**
 * Setelah refund disetujui, pembeli harus mengisi data rekening bank
 * agar Admin bisa mentransfer uang pengembalian.
 * 
 * @param {number} orderId
 * @param {{ bankName: string, bankAccountNumber: string, bankAccountHolder: string }} bankInfo
 */
export async function submitRefundBankInfo(orderId, bankInfo) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		if (!bankInfo.bankName || !bankInfo.bankAccountNumber || !bankInfo.bankAccountHolder) {
			return { success: false, error: "Semua data rekening bank wajib diisi." }
		}

		// Cari refund request untuk order ini
		const refund = await db.query.refundRequests.findFirst({
			where: and(
				eq(refundRequests.orderId, parseInt(orderId)),
				eq(refundRequests.userId, session.user.id),
				eq(refundRequests.status, "pending")
			)
		})

		if (!refund) {
			return { success: false, error: "Permintaan refund tidak ditemukan atau sudah diproses." }
		}

		// Update data bank
		await db.update(refundRequests)
			.set({
				bankName: bankInfo.bankName.trim(),
				bankAccountNumber: bankInfo.bankAccountNumber.trim(),
				bankAccountHolder: bankInfo.bankAccountHolder.trim(),
			})
			.where(eq(refundRequests.id, refund.id))

		return { success: true, message: "Data rekening berhasil disimpan. Menunggu proses refund oleh Admin." }
	} catch (error) {
		console.error("[submitRefundBankInfo]", error)
		return { success: false, error: "Gagal menyimpan data rekening." }
	}
}

// ============================================
// GET MY COMPLAINT (Pembeli melihat detail komplain)
// ============================================

/**
 * Mengambil detail komplain untuk pesanan tertentu milik user.
 * @param {number} orderId
 */
export async function getMyComplaint(orderId) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const complaint = await db.query.complaints.findFirst({
			where: and(
				eq(complaints.orderId, parseInt(orderId)),
				eq(complaints.userId, session.user.id)
			)
		})

		// Cari refund request jika ada
		const refund = await db.query.refundRequests.findFirst({
			where: and(
				eq(refundRequests.orderId, parseInt(orderId)),
				eq(refundRequests.userId, session.user.id)
			)
		})

		return { success: true, data: { complaint, refund } }
	} catch (error) {
		console.error("[getMyComplaint]", error)
		return { success: false, error: "Gagal mengambil data komplain." }
	}
}
