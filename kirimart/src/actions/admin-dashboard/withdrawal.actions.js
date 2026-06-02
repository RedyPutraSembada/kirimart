/**
 * Admin Withdrawal Management Server Actions
 * 
 * Operasi untuk admin mengelola permintaan penarikan dana dari penjual.
 */
"use server"

import { db } from "@/config/db"
import { withdrawals, stores } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, desc, sql } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Verify admin role
// ============================================

async function verifyAdmin() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session || session.user.role !== "admin") return null
	return session
}

// ============================================
// GET ALL WITHDRAWALS
// ============================================

/**
 * Mengambil semua permintaan penarikan dana dari semua toko.
 */
export async function getAllWithdrawals() {
	try {
		const session = await verifyAdmin()
		if (!session) {
			return { success: false, error: "Unauthorized." }
		}

		const result = await db.query.withdrawals.findMany({
			orderBy: [desc(withdrawals.createdAt)],
			with: {
				store: {
					columns: { id: true, name: true, logoUrl: true, domainSlug: true }
				}
			}
		})

		return { success: true, data: result }
	} catch (error) {
		console.error("[getAllWithdrawals]", error)
		return { success: false, error: "Gagal mengambil data penarikan." }
	}
}

// ============================================
// PROCESS WITHDRAWAL (Approve / Reject)
// ============================================

/**
 * Admin menyetujui atau menolak permintaan penarikan.
 * - Jika approve: status -> completed, update withdrawnAmount di store
 * - Jika reject: status -> rejected, kembalikan saldo ke store
 * 
 * @param {number} withdrawalId
 * @param {'completed' | 'rejected'} action
 * @param {string} [reason] - Alasan penolakan (wajib jika reject)
 */
export async function processWithdrawal(withdrawalId, action, reason = "") {
	try {
		const session = await verifyAdmin()
		if (!session) {
			return { success: false, error: "Unauthorized." }
		}

		if (!["completed", "rejected"].includes(action)) {
			return { success: false, error: "Aksi tidak valid." }
		}

		const withdrawal = await db.query.withdrawals.findFirst({
			where: eq(withdrawals.id, parseInt(withdrawalId)),
		})

		if (!withdrawal) {
			return { success: false, error: "Penarikan tidak ditemukan." }
		}

		if (withdrawal.status !== "pending") {
			return { success: false, error: "Penarikan ini sudah diproses sebelumnya." }
		}

		if (action === "rejected" && !reason) {
			return { success: false, error: "Alasan penolakan wajib diisi." }
		}

		await db.transaction(async (tx) => {
			if (action === "completed") {
				// Approve: tandai selesai + tambah total ditarik
				await tx.update(withdrawals)
					.set({ status: "completed", completedAt: new Date() })
					.where(eq(withdrawals.id, parseInt(withdrawalId)))

				await tx.update(stores)
					.set({ withdrawnAmount: sql`withdrawn_amount + ${withdrawal.amount}` })
					.where(eq(stores.id, withdrawal.storeId))
			} else {
				// Reject: kembalikan saldo ke toko
				await tx.update(withdrawals)
					.set({ status: "rejected", rejectedReason: reason })
					.where(eq(withdrawals.id, parseInt(withdrawalId)))

				await tx.update(stores)
					.set({ balance: sql`balance + ${withdrawal.amount}` })
					.where(eq(stores.id, withdrawal.storeId))
			}
		})

		const label = action === "completed" ? "disetujui" : "ditolak"

		// === LOG ACTIVITY ===
		try {
			const { logActivity } = await import("@/lib/activity-logger")
			await logActivity({
				userId: session.user.id, // Admin
				storeId: null, // Global context
				action: action === "completed" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
				entityType: "withdrawal",
				entityId: withdrawal.id,
				details: { storeId: withdrawal.storeId, amount: withdrawal.amount, reason }
			})
		} catch (e) { console.error(e) }
		
		// Kirim email notifikasi penarikan dana
		try {
			const { sendEmail } = await import("@/lib/email")
			const { getWithdrawalProcessedEmail } = await import("@/lib/email-templates")
			const store = await db.query.stores.findFirst({
				where: eq(stores.id, withdrawal.storeId),
				with: { user: true }
			})
			if (store && store.user && store.user.email) {
				const emailHtml = getWithdrawalProcessedEmail(store.name, withdrawal.amount, action, reason)
				await sendEmail(store.user.email, `Penarikan Dana Rp ${withdrawal.amount.toLocaleString("id-ID")} ${label.toUpperCase()}`, emailHtml)
			}
		} catch (e) {
			console.error("[EMAIL_WITHDRAWAL_ERROR]", e)
		}

		return { success: true, message: `Penarikan berhasil ${label}.` }
	} catch (error) {
		console.error("[processWithdrawal]", error)
		return { success: false, error: "Gagal memproses penarikan." }
	}
}
