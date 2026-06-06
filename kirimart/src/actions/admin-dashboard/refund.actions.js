/**
 * Admin Refund Management Server Actions
 * 
 * Operasi untuk admin mengelola permintaan pengembalian dana.
 * Admin mentransfer uang secara manual lalu mencatat bukti di sini.
 */
"use server"

import { db } from "@/config/db"
import { refundRequests, orders, complaints } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, desc } from "drizzle-orm"
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
// GET ALL REFUND REQUESTS
// ============================================

/**
 * Mengambil semua permintaan refund (antrean kerja admin).
 */
export async function getAllRefundRequests() {
	try {
		const session = await verifyAdmin()
		if (!session) {
			return { success: false, error: "Unauthorized." }
		}

		const result = await db.query.refundRequests.findMany({
			orderBy: [desc(refundRequests.createdAt)],
			with: {
				order: {
					with: {
						store: {
							columns: { id: true, name: true, logoUrl: true }
						},
						items: {
							with: {
								product: {
									columns: { id: true, name: true }
								}
							}
						}
					}
				},
				user: {
					columns: { id: true, name: true, email: true }
				},
				complaint: true,
			}
		})

		return { success: true, data: result }
	} catch (error) {
		console.error("[getAllRefundRequests]", error)
		return { success: false, error: "Gagal mengambil data refund." }
	}
}

// ============================================
// PROCESS REFUND (Admin memproses transfer manual)
// ============================================

/**
 * Admin memproses refund — memasukkan nominal final, bukti transfer, dan catatan.
 * 
 * @param {number} refundRequestId
 * @param {number} amountRefunded - Nominal final yang ditransfer
 * @param {string} [proofUrl] - URL bukti transfer
 * @param {string} [notes] - Catatan (misal: "Dikurangi biaya admin Rp 5.000")
 */
export async function processRefund(refundRequestId, amountRefunded, proofUrl = null, notes = "") {
	try {
		const session = await verifyAdmin()
		if (!session) {
			return { success: false, error: "Unauthorized." }
		}

		if (!amountRefunded || amountRefunded <= 0) {
			return { success: false, error: "Nominal refund harus lebih dari 0." }
		}

		const refund = await db.query.refundRequests.findFirst({
			where: eq(refundRequests.id, parseInt(refundRequestId)),
		})

		if (!refund) {
			return { success: false, error: "Permintaan refund tidak ditemukan." }
		}

		if (refund.status !== "pending") {
			return { success: false, error: "Permintaan refund ini sudah diproses sebelumnya." }
		}

		if (!refund.bankName || !refund.bankAccountNumber) {
			return { success: false, error: "Pembeli belum mengisi data rekening bank." }
		}

		await db.transaction(async (tx) => {
			// 1. Update refund request → processed
			await tx.update(refundRequests)
				.set({
					amountRefunded: parseInt(amountRefunded),
					proofUrl: proofUrl || null,
					notes: notes || null,
					status: "processed",
					processedAt: new Date(),
				})
				.where(eq(refundRequests.id, parseInt(refundRequestId)))

			// 2. Update order status → refunded
			await tx.update(orders)
				.set({ status: "refunded" })
				.where(eq(orders.id, refund.orderId))
		})

		// Kirim notifikasi ke pembeli
		try {
			const { createNotification } = await import("@/actions/public/notification.actions")
			const { wsEmit } = await import("@/lib/ws-emit")

			const notif = await createNotification(
				refund.userId,
				"refund_processed",
				"💰 Refund Telah Diproses!",
				`Dana sebesar Rp ${parseInt(amountRefunded).toLocaleString("id-ID")} telah ditransfer ke rekening Anda.${notes ? ` Catatan: ${notes}` : ""}`,
				{
					orderId: refund.orderId,
					refundRequestId: refund.id,
					amountRefunded: parseInt(amountRefunded),
				}
			)

			if (notif) {
				await wsEmit("notifications", `user:${refund.userId}`, "notification", notif)
			}
		} catch (notifError) {
			console.warn("[processRefund] Failed to send notification:", notifError.message)
		}

		return { success: true, message: "Refund berhasil diproses." }
	} catch (error) {
		console.error("[processRefund]", error)
		return { success: false, error: "Gagal memproses refund." }
	}
}
