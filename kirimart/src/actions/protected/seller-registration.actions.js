/**
 * Seller Registration Server Actions
 * 
 * Membuat pembayaran Rp 50.000 untuk pendaftaran seller.
 * Setelah pembayaran berhasil (webhook), role user diubah menjadi 'seller'.
 */
"use server"

import { db } from "@/config/db"
import { payments } from "@/config/db/schema"
import { user as userTable } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { createSnapTransaction } from "@/lib/midtrans"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

const SELLER_FEE = 50000

// ============================================
// CREATE SELLER PAYMENT
// ============================================

/**
 * Membuat transaksi pembayaran pendaftaran seller (Rp 50.000).
 * metadataLocal.type = 'seller_registration' — digunakan webhook untuk identifikasi.
 */
export async function createSellerPayment() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Anda harus login." }
		}

		// Cek apakah sudah seller
		if (session.user.role === 'seller') {
			return { success: false, error: "Anda sudah terdaftar sebagai seller." }
		}

		// Generate order ID
		const tempOrderId = `KM-SELLER-${Date.now()}`

		// Insert payment record
		const [newPayment] = await db.insert(payments).values({
			orderId: tempOrderId,
			userId: session.user.id,
			totalAmount: SELLER_FEE,
			status: "pending",
			metadataLocal: {
				type: 'seller_registration',
				user: {
					id: session.user.id,
					name: session.user.name,
					email: session.user.email,
				},
				amount: SELLER_FEE,
				description: 'Biaya Pendaftaran Seller Kawanbelanja',
				createdAt: new Date().toISOString(),
			},
		}).returning()

		// Update orderId
		const finalOrderId = `KM-SELLER-${newPayment.id}-${Date.now()}`
		await db.update(payments)
			.set({ orderId: finalOrderId })
			.where(eq(payments.id, newPayment.id))

		// Panggil Midtrans
		const midtransParameter = {
			transaction_details: {
				order_id: finalOrderId,
				gross_amount: SELLER_FEE,
			},
			customer_details: {
				first_name: session.user.name,
				email: session.user.email,
			},
			item_details: [{
				id: 'SELLER-REG',
				price: SELLER_FEE,
				quantity: 1,
				name: 'Biaya Pendaftaran Seller',
			}],
			expiry: {
				unit: 'hours',
				duration: 24,
			},
		}

		const snapResponse = await createSnapTransaction(midtransParameter)

		// Update payment
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
		await db.update(payments).set({
			snapToken: snapResponse.token,
			snapRedirectUrl: snapResponse.redirect_url,
			expiresAt,
		}).where(eq(payments.id, newPayment.id))

		return {
			success: true,
			snapToken: snapResponse.token,
			orderId: finalOrderId,
		}
	} catch (error) {
		console.error("[SELLER_PAYMENT_ERROR]", error)
		return {
			success: false,
			error: error.message || "Gagal membuat pembayaran pendaftaran seller.",
		}
	}
}

// ============================================
// UPGRADE USER TO SELLER (called by webhook)
// ============================================

/**
 * Mengubah role user menjadi 'seller' setelah pembayaran berhasil.
 * Dipanggil dari updatePaymentFromWebhook di payment.actions.js.
 */
export async function upgradeUserToSeller(userId) {
	try {
		await db.update(userTable)
			.set({ role: 'seller' })
			.where(eq(userTable.id, userId))

		console.log(`[SELLER_REG] User ${userId} upgraded to seller`)
		return { success: true }
	} catch (error) {
		console.error("[UPGRADE_SELLER_ERROR]", error)
		return { success: false, error: "Gagal mengupgrade user ke seller." }
	}
}
