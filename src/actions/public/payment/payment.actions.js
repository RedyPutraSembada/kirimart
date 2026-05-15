/**
 * Payment Server Actions
 * 
 * Semua operasi database terkait pembayaran Midtrans.
 * Mengikuti pola yang sama dengan actions lain di project ini.
 */
"use server"

import { db } from "@/config/db"
import { payments, orders, orderItems } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { createSnapTransaction, mapTransactionStatus } from "@/lib/midtrans"
import { eq, and, desc } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// CREATE PAYMENT TRANSACTION
// ============================================

/**
 * Membuat transaksi pembayaran baru:
 * 1. Insert payment record (status=pending, metadata_local=semua data checkout)
 * 2. Insert orders (1 per toko)
 * 3. Insert order_items (per item dengan price snapshot)
 * 4. Panggil Midtrans Snap API untuk dapat snapToken
 * 5. Update payment dengan snapToken
 * 
 * @param {Object} checkoutData - Data checkout dari frontend
 * @returns {{ success: boolean, snapToken?: string, orderId?: string, error?: string }}
 */
export async function createPaymentTransaction(checkoutData) {
	try {
		// 1. Cek autentikasi
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Anda harus login untuk melakukan pembayaran." }
		}

		const { address, stores, voucherCode, subtotal, totalShipping, serviceFee, grandTotal } = checkoutData

		// 2. Validasi dasar
		if (!stores || stores.length === 0) {
			return { success: false, error: "Tidak ada item untuk di-checkout." }
		}

		if (!grandTotal || grandTotal <= 0) {
			return { success: false, error: "Total pembayaran tidak valid." }
		}

		// 3. Buat payment record dan orders dalam transaction
		const result = await db.transaction(async (tx) => {
			// A. Generate temporary orderId (akan di-update setelah dapat payment.id)
			const tempOrderId = `KM-TEMP-${Date.now()}`

			// B. Insert payment record
			const [newPayment] = await tx.insert(payments).values({
				orderId: tempOrderId,
				userId: session.user.id,
				totalAmount: grandTotal,
				status: "pending",
				metadataLocal: {
					user: {
						id: session.user.id,
						name: session.user.name,
						email: session.user.email,
					},
					address,
					stores: stores.map(store => ({
						storeId: store.id,
						storeName: store.name,
						items: store.items.map(item => ({
							productId: item.id,
							name: item.name,
							variant: item.variant,
							price: item.price,
							quantity: item.qty,
							image: item.img,
						})),
						selectedShipping: store.selectedShipping,
						notes: store.notes || '',
					})),
					voucherCode: voucherCode || null,
					subtotal,
					totalShipping,
					serviceFee,
					grandTotal,
					createdAt: new Date().toISOString(),
				},
			}).returning()

			// C. Generate final orderId: KM-{paymentId}-{timestamp}
			const finalOrderId = `KM-${newPayment.id}-${Date.now()}`
			await tx.update(payments)
				.set({ orderId: finalOrderId })
				.where(eq(payments.id, newPayment.id))

			// D. Insert orders (1 per toko) + order_items
			for (const store of stores) {
				const storeItemsTotal = store.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
				const shippingCost = store.selectedShipping?.price || 0
				const storeGrandTotal = storeItemsTotal + shippingCost

				const [newOrder] = await tx.insert(orders).values({
					paymentId: newPayment.id,
					storeId: store.id,
					userId: session.user.id,
					status: "pending",
					totalShipping: shippingCost,
					totalWeightGram: store.items.reduce((sum, item) => sum + ((item.weight || 0) * item.qty), 0),
					grandTotal: storeGrandTotal,
					notes: store.notes || null,
				}).returning()

				// E. Insert order items (snapshot harga saat checkout)
				if (store.items.length > 0) {
					await tx.insert(orderItems).values(
						store.items.map(item => ({
							orderId: newOrder.id,
							productId: item.id,
							productNameSnapshot: item.name,
							priceSnapshot: item.price,
							quantity: item.qty,
						}))
					)
				}
			}

			return { paymentId: newPayment.id, orderId: finalOrderId }
		})

		// 4. Panggil Midtrans Snap API
		// Susun item_details: semua produk + ongkir per toko + biaya layanan
		const midtransItems = []

		for (const store of stores) {
			for (const item of store.items) {
				midtransItems.push({
					id: `ITEM-${item.id}`,
					price: item.price,
					quantity: item.qty,
					name: item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name,
				})
			}

			// Ongkir per toko
			const shippingCost = store.selectedShipping?.price || 0
			if (shippingCost > 0) {
				const shipName = `Ongkir ${store.name}`
				midtransItems.push({
					id: `SHIP-${store.id}`,
					price: shippingCost,
					quantity: 1,
					name: shipName.length > 50 ? shipName.substring(0, 47) + '...' : shipName,
				})
			}
		}

		// Biaya layanan
		if (serviceFee > 0) {
			midtransItems.push({
				id: 'SERVICE-FEE',
				price: serviceFee,
				quantity: 1,
				name: 'Biaya Layanan',
			})
		}

		const midtransParameter = {
			transaction_details: {
				order_id: result.orderId,
				gross_amount: grandTotal,
			},
			customer_details: {
				first_name: session.user.name,
				email: session.user.email,
				phone: session.user.phoneNumber || '',
			},
			item_details: midtransItems,
			// Set expiry 24 jam — tanpa ini Midtrans pakai default yang bisa sangat singkat
			expiry: {
				unit: 'hours',
				duration: 24,
			},
		}

		const snapResponse = await createSnapTransaction(midtransParameter)

		// 5. Update payment dengan snapToken + redirect URL + expiresAt
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 jam dari sekarang
		await db.update(payments).set({
			snapToken: snapResponse.token,
			snapRedirectUrl: snapResponse.redirect_url,
			expiresAt,
		}).where(eq(payments.id, result.paymentId))

		return {
			success: true,
			snapToken: snapResponse.token,
			orderId: result.orderId,
		}
	} catch (error) {
		console.error("[CREATE_PAYMENT_ERROR]", error)
		return {
			success: false,
			error: error.message || "Terjadi kesalahan saat membuat transaksi pembayaran.",
		}
	}
}

// ============================================
// GET MY PENDING PAYMENTS
// ============================================

/**
 * Mengambil transaksi pending milik user yang sedang login.
 * Berguna ketika user menutup Snap popup sebelum selesai bayar —
 * mereka bisa re-open Snap dengan snapToken yang sama.
 * 
 * Snap token biasanya valid ~24 jam.
 */
export async function getMyPendingPayments() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const pendingPayments = await db
			.select({
				id: payments.id,
				orderId: payments.orderId,
				totalAmount: payments.totalAmount,
				snapToken: payments.snapToken,
				expiresAt: payments.expiresAt,
				createdAt: payments.createdAt,
				metadataLocal: payments.metadataLocal,
			})
			.from(payments)
			.where(
				and(
					eq(payments.userId, session.user.id),
					eq(payments.status, "pending")
				)
			)
			.orderBy(desc(payments.createdAt))
			.limit(5)

		// Filter: hanya tampilkan yang belum expired
		const now = new Date()
		const activePayments = pendingPayments.filter(p => {
			if (p.expiresAt) return new Date(p.expiresAt) > now
			// Fallback: jika tidak ada expiresAt, anggap 24 jam dari createdAt
			const fallbackExpiry = new Date(p.createdAt)
			fallbackExpiry.setHours(fallbackExpiry.getHours() + 24)
			return fallbackExpiry > now
		})

		return { success: true, data: activePayments }
	} catch (error) {
		console.error("[GET_PENDING_PAYMENTS_ERROR]", error)
		return { success: false, error: "Gagal mengambil transaksi pending." }
	}
}

// ============================================
// GET PAYMENT BY ORDER ID
// ============================================

/**
 * Mengambil data payment berdasarkan orderId.
 * Berguna untuk halaman status pembayaran.
 */
export async function getPaymentByOrderId(orderId) {
	try {
		const payment = await db.query.payments.findFirst({
			where: eq(payments.orderId, orderId),
			with: {
				orders: {
					with: {
						items: true,
					},
				},
			},
		})

		if (!payment) {
			return { success: false, error: "Pembayaran tidak ditemukan." }
		}

		return { success: true, data: payment }
	} catch (error) {
		console.error("[GET_PAYMENT_ERROR]", error)
		return { success: false, error: "Gagal mengambil data pembayaran." }
	}
}

// ============================================
// UPDATE PAYMENT FROM WEBHOOK
// ============================================

/**
 * Dipanggil oleh webhook handler setelah signature terverifikasi.
 * Update status payment + simpan seluruh response webhook ke metadata_pg.
 * 
 * @param {Object} notification - Raw JSON dari webhook Midtrans
 * @returns {{ success: boolean, error?: string }}
 */
export async function updatePaymentFromWebhook(notification) {
	try {
		const {
			order_id,
			transaction_status,
			fraud_status,
			transaction_id,
			payment_type,
			settlement_time,
		} = notification

		// Cari payment berdasarkan order_id
		const [existingPayment] = await db
			.select()
			.from(payments)
			.where(eq(payments.orderId, order_id))
			.limit(1)

		if (!existingPayment) {
			console.error(`[WEBHOOK] Payment not found for order_id: ${order_id}`)
			return { success: false, error: "Payment not found" }
		}

		// Map status Midtrans ke status internal
		const newStatus = mapTransactionStatus(transaction_status, fraud_status)

		// Tentukan payment method yang lebih spesifik
		let paymentMethod = null
		if (notification.va_numbers?.length > 0) {
			paymentMethod = notification.va_numbers[0].bank
		} else if (notification.issuer) {
			paymentMethod = notification.issuer
		} else if (notification.acquirer) {
			paymentMethod = notification.acquirer
		} else if (notification.store) {
			paymentMethod = notification.store
		}

		// Update payment record
		const updateData = {
			status: newStatus,
			midtransTransactionId: transaction_id || existingPayment.midtransTransactionId,
			paymentType: payment_type || existingPayment.paymentType,
			paymentMethod: paymentMethod || existingPayment.paymentMethod,
			metadataPg: notification, // Simpan SELURUH webhook payload
			updatedAt: new Date(),
		}

		// Set paidAt jika status berubah menjadi paid
		if (newStatus === 'paid' && !existingPayment.paidAt) {
			updateData.paidAt = settlement_time ? new Date(settlement_time) : new Date()
		}

		await db.update(payments)
			.set(updateData)
			.where(eq(payments.id, existingPayment.id))

		// Update status semua orders terkait
		const orderStatus = newStatus === 'paid' ? 'paid'
			: newStatus === 'cancelled' ? 'cancelled'
				: newStatus === 'refunded' ? 'refunded'
					: 'pending'

		await db.update(orders)
			.set({ status: orderStatus })
			.where(eq(orders.paymentId, existingPayment.id))

		// === SELLER REGISTRATION: upgrade role jika pembayaran seller berhasil ===
		if (newStatus === 'paid' && existingPayment.metadataLocal?.type === 'seller_registration') {
			const { upgradeUserToSeller } = await import('@/actions/protected/seller-registration.actions')
			await upgradeUserToSeller(existingPayment.userId)
			console.log(`[WEBHOOK] User ${existingPayment.userId} upgraded to seller after payment ${order_id}`)
		}

		console.log(`[WEBHOOK] Payment ${order_id} updated: ${existingPayment.status} → ${newStatus}`)

		return { success: true }
	} catch (error) {
		console.error("[UPDATE_PAYMENT_WEBHOOK_ERROR]", error)
		return { success: false, error: "Gagal update payment dari webhook." }
	}
}
