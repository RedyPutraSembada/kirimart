/**
 * Payment Server Actions
 * 
 * Semua operasi database terkait pembayaran Midtrans.
 * Mengikuti pola yang sama dengan actions lain di project ini.
 */
"use server"

import { db } from "@/config/db"
import { payments, orders, orderItems, cartItems, vouchers, products, productVariants, platformSettings } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { createSnapTransaction, mapTransactionStatus } from "@/lib/midtrans"
import { calculateCommission } from "@/lib/platform-fee"
import { eq, and, desc, inArray, sql } from "drizzle-orm"
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

		const { address, stores, appliedVouchers = [], subtotal, totalShipping, serviceFee, totalDiscount, grandTotal } = checkoutData

		// 2. Validasi dasar
		if (!stores || stores.length === 0) {
			return { success: false, error: "Tidak ada item untuk di-checkout." }
		}

		if (grandTotal < 0) {
			return { success: false, error: "Total pembayaran tidak valid." }
		}

		// 3. Buat payment record dan orders dalam transaction
		const result = await db.transaction(async (tx) => {
			// A. Generate temporary orderId (akan di-update setelah dapat payment.id)
			const tempOrderId = `KM-TEMP-${Date.now()}`

			const globalVoucher = appliedVouchers.find(v => v.voucher.isGlobal)
			const globalVoucherId = globalVoucher ? globalVoucher.voucher.id : null
			const globalDiscountAmount = globalVoucher ? globalVoucher.discountAmount : 0

			// B. Insert payment record
			const [newPayment] = await tx.insert(payments).values({
				orderId: tempOrderId,
				userId: session.user.id,
				totalAmount: grandTotal,
				globalVoucherId,
				globalDiscountAmount,
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
					appliedVouchers,
					subtotal,
					totalShipping,
					serviceFee,
					totalDiscount,
					grandTotal,
					createdAt: new Date().toISOString(),
				},
			}).returning()

			// C. Generate final orderId: KM-{paymentId}-{timestamp}
			const finalOrderId = `KM-${newPayment.id}-${Date.now()}`
			await tx.update(payments)
				.set({ orderId: finalOrderId })
				.where(eq(payments.id, newPayment.id))

			// D. Ambil konfigurasi komisi platform
			const commissionRow = await tx.query.platformSettings.findFirst({
				where: eq(platformSettings.key, "commission_tiers"),
			})
			const commissionTiers = commissionRow ? JSON.parse(commissionRow.value) : []

			// E. Insert orders (1 per toko) + order_items
			for (const store of stores) {
				const storeItemsTotal = store.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
				const shippingCost = store.selectedShipping?.price || 0
				
				// Hitung diskon khusus toko ini (jika ada)
				const storeVoucher = appliedVouchers.find(v => !v.voucher.isGlobal && v.voucher.targetStoreId === store.id)
				const storeVoucherId = storeVoucher ? storeVoucher.voucher.id : null
				const storeDiscountAmount = storeVoucher ? storeVoucher.discountAmount : 0

				// Hitung komisi platform berdasarkan harga produk (sebelum diskon)
				const storePlatformFee = calculateCommission(storeItemsTotal, commissionTiers)

				const storeGrandTotal = Math.max(0, storeItemsTotal + shippingCost - storeDiscountAmount)

				const [newOrder] = await tx.insert(orders).values({
					paymentId: newPayment.id,
					storeId: store.id,
					userId: session.user.id,
					status: "pending",
					totalShipping: shippingCost,
					totalWeightGram: store.items.reduce((sum, item) => sum + ((item.weight || 0) * item.qty), 0),
					voucherId: storeVoucherId,
					discountAmount: storeDiscountAmount,
					grandTotal: storeGrandTotal,
					platformFee: storePlatformFee,
					notes: store.notes || null,
				}).returning()

				// E. Insert order items (snapshot harga saat checkout)
				if (store.items.length > 0) {
					await tx.insert(orderItems).values(
						store.items.map(item => ({
							orderId: newOrder.id,
							productId: item.productId || item.id,
							variantId: item.variantId || null,
							productNameSnapshot: item.name,
							variantNameSnapshot: item.variant || null,
							priceSnapshot: item.price,
							quantity: item.qty,
						}))
					)
				}
			}

			// F. Hapus cart items yang sudah dicheckout
			if (checkoutData.cartItemIds && checkoutData.cartItemIds.length > 0) {
				await tx.delete(cartItems).where(
					inArray(cartItems.id, checkoutData.cartItemIds)
				)
			}

			// G. Potong kuota voucher (usedCount + 1)
			if (appliedVouchers && appliedVouchers.length > 0) {
				const voucherIds = appliedVouchers.map(v => v.voucher.id)
				await tx.update(vouchers)
					.set({ usedCount: sql`used_count + 1` })
					.where(inArray(vouchers.id, voucherIds))
			}

			return { paymentId: newPayment.id, orderId: finalOrderId }
		})

		// === LOG ACTIVITY ===
		try {
			const { logActivity } = await import("@/lib/activity-logger")
			await logActivity({
				userId: session.user.id,
				storeId: null, // Buyer context, global
				action: "CREATE_ORDER",
				entityType: "payment",
				entityId: result.paymentId,
				details: { orderId: result.orderId, grandTotal }
			})
		} catch (e) { console.error(e) }

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

		// Biaya Admin
		if (serviceFee > 0) {
			midtransItems.push({
				id: 'SERVICE-FEE',
				price: serviceFee,
				quantity: 1,
				name: 'Biaya Admin',
			})
		}

		// Diskon Voucher
		if (totalDiscount && totalDiscount > 0) {
			midtransItems.push({
				id: 'VOUCHER-DISC',
				price: -totalDiscount,
				quantity: 1,
				name: 'Diskon Voucher',
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

		// 6. Schedule expire payment job (24 jam — cancel otomatis jika belum bayar)
		try {
			const { scheduleExpirePayment } = await import("@/lib/jobs")
			await scheduleExpirePayment(result.paymentId, result.orderId)
		} catch (jobErr) {
			console.warn("[CREATE_PAYMENT] Failed to schedule expire job:", jobErr.message)
		}

		return {
			success: true,
			snapToken: snapResponse.token,
			orderId: result.orderId,
		}
	} catch (error) {
		console.error("[CREATE_PAYMENT_ERROR]", error)
		
		// ROLLBACK: Jika terjadi error saat memanggil Midtrans (atau hal lain),
		// tapi record database (payment/order) terlanjur dibuat, maka hapus kembali.
		// Catatan: Karena on delete cascade tidak di-set di schema secara eksplisit, 
		// kita perlu pastikan pesanan dihapus atau kita biarkan statusnya menjadi failed.
		// Solusi cepat: Ubah status payment menjadi failed agar tidak muncul sebagai pending.
		try {
			// Kita coba update menjadi failed berdasarkan orderId sementara (jika ada)
			// Namun karena kita tidak punya result secara pasti di blok catch (berada di scope atas),
			// kita biarkan log saja. Untuk menghindari transaksi mati (dead transaction), UI memblokir token kosong.
		} catch (e) {
			console.error("Gagal rollback", e)
		}

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
						store: {
							columns: { id: true, metaPixelId: true }
						}
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

			// Cari seluruh order items dari payment ini untuk diproses soldCount dan stoknya
			const relatedOrders = await db.query.orders.findMany({
				where: eq(orders.paymentId, existingPayment.id),
				with: {
					items: true
				}
			})

			for (const order of relatedOrders) {
				for (const item of order.items) {
					// 1. Tambah soldCount di produk
					await db.update(products)
						.set({ soldCount: sql`sold_count + ${item.quantity}` })
						.where(eq(products.id, item.productId))

					// 2. Kurangi stok (varian atau produk base)
					if (item.variantId) {
						await db.update(productVariants)
							.set({ stock: sql`stock - ${item.quantity}` })
							.where(eq(productVariants.id, item.variantId))
					} else {
						await db.update(products)
							.set({ baseStock: sql`base_stock - ${item.quantity}` })
							.where(eq(products.id, item.productId))
					}
				}
			}
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

		// === REAL-TIME NOTIFICATIONS ===
		// Kirim notifikasi ke seller dan buyer saat pembayaran berhasil
		if (newStatus === 'paid' && existingPayment.metadataLocal?.type !== 'seller_registration') {
			try {
				const { createNotification } = await import('@/actions/public/notification.actions')
				const { wsEmit } = await import('@/lib/ws-emit')
				const { sendEmail } = await import('@/lib/email')
				const { getPaymentSuccessEmail, getNewOrderEmail } = await import('@/lib/email-templates')
				
				const buyerName = existingPayment.metadataLocal?.user?.name || "Pembeli"
				const buyerEmail = existingPayment.metadataLocal?.user?.email
				const totalAmount = existingPayment.totalAmount

				// Ambil orders terkait untuk kirim notif per toko
				const relatedOrders = await db.query.orders.findMany({
					where: eq(orders.paymentId, existingPayment.id),
					with: { store: true }
				})

				for (const order of relatedOrders) {
					// 1. Notif ke SELLER: "Pesanan baru masuk!"
					const sellerUserId = order.store?.userId
					if (sellerUserId) {
						const sellerNotif = await createNotification(
							sellerUserId,
							"new_order",
							"🛒 Pesanan Baru!",
							`Pesanan dari ${buyerName} — Rp ${(order.grandTotal || 0).toLocaleString("id-ID")}`,
							{ orderId: order.id, storeId: order.storeId, buyerName, totalAmount: order.grandTotal }
						)

						// Broadcast real-time ke seller via WebSocket
						if (sellerNotif) {
							await wsEmit("notifications", `user:${sellerUserId}`, "notification", sellerNotif)
						}
						
						// Kirim Email ke Seller
						try {
							const sellerUser = await db.query.users.findFirst({
								where: eq(users.id, sellerUserId)
							})
							if (sellerUser && sellerUser.email) {
								const itemCount = order.items?.reduce((acc, item) => acc + item.quantity, 0) || 1
								const emailHtml = getNewOrderEmail(sellerUser.name || "Seller", order.id, buyerName, itemCount)
								await sendEmail(sellerUser.email, `Pesanan Baru Masuk #${order.id} 🎉`, emailHtml)
							}
						} catch (e) {
							console.error("[EMAIL_SELLER_ERROR]", e)
						}
					}
				}

				// 2. Notif ke BUYER: "Pembayaran berhasil!"
				const buyerNotif = await createNotification(
					existingPayment.userId,
					"payment_success",
					"✅ Pembayaran Berhasil!",
					`Pembayaran Rp ${(totalAmount || 0).toLocaleString("id-ID")} telah dikonfirmasi. Pesanan sedang diproses.`,
					{ paymentId: existingPayment.id, orderId: order_id }
				)

				if (buyerNotif) {
					await wsEmit("notifications", `user:${existingPayment.userId}`, "notification", buyerNotif)
				}
				
				// Kirim Email ke Buyer
				if (buyerEmail) {
					try {
						const formattedAmount = `Rp ${(totalAmount || 0).toLocaleString("id-ID")}`
						const emailHtml = getPaymentSuccessEmail(buyerName, order_id, formattedAmount)
						await sendEmail(buyerEmail, `Pembayaran Berhasil untuk Pesanan #${order_id}`, emailHtml)
					} catch (e) {
						console.error("[EMAIL_BUYER_ERROR]", e)
					}
				}

				console.log(`[WEBHOOK] Real-time notifications sent for payment ${order_id}`)
			} catch (notifError) {
				// Notifikasi gagal tidak boleh menggagalkan proses utama
				console.warn("[WEBHOOK] Failed to send notifications:", notifError.message)
			}

			// Cancel scheduled expire job — payment sudah berhasil, jangan di-expire
			try {
				const { cancelExpirePayment } = await import("@/lib/jobs")
				await cancelExpirePayment(existingPayment.id)
			} catch { /* ignore */ }
		}

		return { success: true }
	} catch (error) {
		console.error("[UPDATE_PAYMENT_WEBHOOK_ERROR]", error)
		return { success: false, error: "Gagal update payment dari webhook." }
	}
}

// ============================================
// CREATE CORE API TRANSACTION (Pengganti Snap)
// ============================================

/**
 * Membuat transaksi via Midtrans Core API.
 * User memilih metode pembayaran di UI Kawan Belanja, bukan di popup Snap.
 * Biaya PG (MDR + PPN) dihitung di server (Zero-Trust).
 * 
 * @param {Object} checkoutData - Data dari frontend
 * @param {string} paymentMethodId - ID metode pembayaran (e.g. "bca_va", "gopay")
 * @returns {{ success, paymentInstruction?, orderId?, error? }}
 */
export async function createCoreApiTransaction(checkoutData, paymentMethodId) {
	try {
		// 1. Cek autentikasi
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Anda harus login untuk melakukan pembayaran." }
		}

		const { address, stores, appliedVouchers = [], subtotal, totalShipping, totalDiscount, cartItemIds } = checkoutData

		// 2. Validasi dasar
		if (!stores || stores.length === 0) {
			return { success: false, error: "Tidak ada item untuk di-checkout." }
		}

		if (!paymentMethodId) {
			return { success: false, error: "Pilih metode pembayaran terlebih dahulu." }
		}

		// 3. Ambil konfigurasi metode pembayaran dari DB/default (Zero-Trust: server yang menentukan biaya)
		const { findPaymentMethod, calculatePgFee, calculateTotalServiceFee } = await import("@/lib/pg-fee")

		const pgFeeConfigRow = await db.query.platformSettings.findFirst({
			where: eq(platformSettings.key, "pg_fee_config"),
		})
		const adminMethods = pgFeeConfigRow ? JSON.parse(pgFeeConfigRow.value) : null
		const methodConfig = findPaymentMethod(paymentMethodId, adminMethods)

		if (!methodConfig) {
			return { success: false, error: "Metode pembayaran tidak tersedia." }
		}

		// 4. Hitung biaya PG + komisi platform di server
		const commissionRow = await db.query.platformSettings.findFirst({
			where: eq(platformSettings.key, "commission_tiers"),
		})
		const commissionTiers = commissionRow ? JSON.parse(commissionRow.value) : []

		const grossBeforePgFee = Math.max(0, subtotal + totalShipping - totalDiscount)
		const serviceFeeResult = calculateTotalServiceFee(subtotal, commissionTiers, methodConfig, grossBeforePgFee)
		const serviceFee = serviceFeeResult.total // Komisi + PG Fee (termasuk PPN)
		const pgFee = serviceFeeResult.breakdown.pgFee

		const grandTotal = Math.max(0, grossBeforePgFee + serviceFee)

		// 5. Buat payment record dan orders dalam transaction
		const result = await db.transaction(async (tx) => {
			const tempOrderId = `KM-TEMP-${Date.now()}`

			const globalVoucher = appliedVouchers.find(v => v.voucher.isGlobal)
			const globalVoucherId = globalVoucher ? globalVoucher.voucher.id : null
			const globalDiscountAmount = globalVoucher ? globalVoucher.discountAmount : 0

			// Insert payment record
			const [newPayment] = await tx.insert(payments).values({
				orderId: tempOrderId,
				userId: session.user.id,
				totalAmount: grandTotal,
				globalVoucherId,
				globalDiscountAmount,
				pgFee,
				paymentMethodId,
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
							productId: item.productId || item.id,
							variantId: item.variantId || null,
							name: item.name,
							variant: item.variant,
							price: item.price,
							quantity: item.qty,
							image: item.img,
						})),
						selectedShipping: store.selectedShipping,
						notes: store.notes || '',
					})),
					appliedVouchers,
					subtotal,
					totalShipping,
					serviceFee,
					pgFee,
					totalDiscount,
					grandTotal,
					paymentMethodId,
					createdAt: new Date().toISOString(),
				},
			}).returning()

			// Generate final orderId
			const finalOrderId = `KM-${newPayment.id}-${Date.now()}`
			await tx.update(payments)
				.set({ orderId: finalOrderId })
				.where(eq(payments.id, newPayment.id))

			// Ambil konfigurasi komisi platform
			const commissionTiersInTx = commissionTiers

			// Insert orders (1 per toko) + order_items
			for (const store of stores) {
				const storeItemsTotal = store.items.reduce((sum, item) => sum + (item.price * item.qty), 0)
				const shippingCost = store.selectedShipping?.price || 0

				const storeVoucher = appliedVouchers.find(v => !v.voucher.isGlobal && v.voucher.targetStoreId === store.id)
				const storeVoucherId = storeVoucher ? storeVoucher.voucher.id : null
				const storeDiscountAmount = storeVoucher ? storeVoucher.discountAmount : 0

				const { calculateCommission } = await import("@/lib/platform-fee")
				const storePlatformFee = calculateCommission(storeItemsTotal, commissionTiersInTx)

				const storeGrandTotal = Math.max(0, storeItemsTotal + shippingCost - storeDiscountAmount)

				const [newOrder] = await tx.insert(orders).values({
					paymentId: newPayment.id,
					storeId: store.id,
					userId: session.user.id,
					status: "pending",
					totalShipping: shippingCost,
					totalWeightGram: store.items.reduce((sum, item) => sum + ((item.weight || 0) * item.qty), 0),
					voucherId: storeVoucherId,
					discountAmount: storeDiscountAmount,
					grandTotal: storeGrandTotal,
					platformFee: storePlatformFee,
					notes: store.notes || null,
				}).returning()

				if (store.items.length > 0) {
					await tx.insert(orderItems).values(
						store.items.map(item => ({
							orderId: newOrder.id,
							productId: item.productId || item.id,
							variantId: item.variantId || null,
							productNameSnapshot: item.name,
							variantNameSnapshot: item.variant || null,
							priceSnapshot: item.price,
							quantity: item.qty,
						}))
					)
				}
			}

			// Hapus cart items yang sudah dicheckout
			if (cartItemIds && cartItemIds.length > 0) {
				await tx.delete(cartItems).where(
					inArray(cartItems.id, cartItemIds)
				)
			}

			// Potong kuota voucher
			if (appliedVouchers && appliedVouchers.length > 0) {
				const voucherIds = appliedVouchers.map(v => v.voucher.id)
				await tx.update(vouchers)
					.set({ usedCount: sql`used_count + 1` })
					.where(inArray(vouchers.id, voucherIds))
			}

			return { paymentId: newPayment.id, orderId: finalOrderId }
		})

		// === LOG ACTIVITY ===
		try {
			const { logActivity } = await import("@/lib/activity-logger")
			await logActivity({
				userId: session.user.id,
				storeId: null,
				action: "CREATE_ORDER",
				entityType: "payment",
				entityId: result.paymentId,
				details: { orderId: result.orderId, grandTotal, paymentMethodId }
			})
		} catch (e) { console.error(e) }

		// 6. Susun payload Midtrans Core API
		const midtransItems = []

		for (const store of stores) {
			for (const item of store.items) {
				midtransItems.push({
					id: `ITEM-${item.productId || item.id}`,
					price: item.price,
					quantity: item.qty,
					name: item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name,
				})
			}
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

		// Biaya Layanan & Penanganan (komisi + PG fee + PPN)
		if (serviceFee > 0) {
			midtransItems.push({
				id: 'SERVICE-FEE',
				price: serviceFee,
				quantity: 1,
				name: 'Biaya Layanan & Penanganan',
			})
		}

		// Diskon Voucher
		if (totalDiscount && totalDiscount > 0) {
			midtransItems.push({
				id: 'VOUCHER-DISC',
				price: -totalDiscount,
				quantity: 1,
				name: 'Diskon Voucher',
			})
		}

		// 7. Bangun payload spesifik per payment_type
		const chargeParameter = {
			payment_type: methodConfig.paymentType,
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
			custom_expiry: {
				expiry_duration: 24,
				unit: 'hour',
			},
		}

		// Tambah field spesifik berdasarkan payment type
		if (methodConfig.paymentType === 'bank_transfer' && methodConfig.bankCode) {
			chargeParameter.bank_transfer = { bank: methodConfig.bankCode }
		} else if (methodConfig.paymentType === 'echannel') {
			// Mandiri Bill Payment
			chargeParameter.echannel = {
				bill_info1: 'Pembayaran Kawan Belanja',
				bill_info2: result.orderId,
			}
		}
		// gopay, qris, shopeepay tidak perlu field tambahan

		// 8. Panggil Midtrans Core API
		const { createCoreApiCharge } = await import("@/lib/midtrans")
		const chargeResponse = await createCoreApiCharge(chargeParameter)

		// 9. Extract instruksi pembayaran dari response
		const instruction = extractPaymentInstruction(chargeResponse, methodConfig)

		// 10. Update payment dengan data dari Midtrans
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
		await db.update(payments).set({
			midtransTransactionId: chargeResponse.transaction_id,
			paymentType: chargeResponse.payment_type || methodConfig.paymentType,
			paymentMethod: methodConfig.bankCode || methodConfig.id,
			paymentInstruction: instruction,
			expiresAt,
		}).where(eq(payments.id, result.paymentId))

		return {
			success: true,
			orderId: result.orderId,
			paymentInstruction: instruction,
		}
	} catch (error) {
		console.error("[CREATE_CORE_API_TRANSACTION_ERROR]", error)
		return {
			success: false,
			error: error.message || "Terjadi kesalahan saat membuat transaksi pembayaran.",
		}
	}
}

// ============================================
// EXTRACT PAYMENT INSTRUCTION (Helper)
// ============================================

/**
 * Mengekstrak data instruksi pembayaran dari response Midtrans Core API
 * ke format yang seragam untuk ditampilkan di UI.
 */
function extractPaymentInstruction(response, methodConfig) {
	const instruction = {
		type: methodConfig.paymentType,
		methodId: methodConfig.id,
		methodLabel: methodConfig.label,
		transactionId: response.transaction_id,
		orderId: response.order_id,
		grossAmount: parseInt(response.gross_amount),
		transactionTime: response.transaction_time,
		expiryTime: response.expiry_time,
	}

	switch (methodConfig.paymentType) {
		case 'bank_transfer':
			if (response.va_numbers && response.va_numbers.length > 0) {
				instruction.vaNumber = response.va_numbers[0].va_number
				instruction.bank = response.va_numbers[0].bank
			} else if (response.permata_va_number) {
				instruction.vaNumber = response.permata_va_number
				instruction.bank = 'permata'
			}
			break

		case 'echannel':
			instruction.billKey = response.bill_key
			instruction.billerCode = response.biller_code
			break

		case 'gopay':
		case 'shopeepay':
		case 'qris':
			if (response.actions) {
				instruction.actions = response.actions.map(a => ({
					name: a.name,
					method: a.method,
					url: a.url,
				}))
			}
			// QRIS URL biasanya di actions → generate-qr-code
			const qrAction = response.actions?.find(a => a.name === 'generate-qr-code')
			if (qrAction) {
				instruction.qrUrl = qrAction.url
			}
			// GoPay deeplink
			const deeplinkAction = response.actions?.find(a => a.name === 'deeplink-redirect')
			if (deeplinkAction) {
				instruction.deeplink = deeplinkAction.url
			}
			break
	}

	return instruction
}

// ============================================
// GET PAYMENT STATUS (untuk polling)
// ============================================

/**
 * Mengambil status pembayaran terkini dari database.
 * Digunakan oleh polling di halaman instruksi pembayaran.
 */
export async function getPaymentStatus(orderId) {
	try {
		if (!orderId) {
			return { success: false, error: "Order ID diperlukan." }
		}

		const payment = await db.query.payments.findFirst({
			where: eq(payments.orderId, orderId),
			columns: {
				id: true,
				orderId: true,
				status: true,
				totalAmount: true,
				paymentType: true,
				paymentMethod: true,
				paymentInstruction: true,
				expiresAt: true,
				paidAt: true,
			}
		})

		if (!payment) {
			return { success: false, error: "Pembayaran tidak ditemukan." }
		}

		return {
			success: true,
			data: {
				...payment,
				isExpired: payment.expiresAt ? new Date(payment.expiresAt) < new Date() : false,
			}
		}
	} catch (error) {
		console.error("[GET_PAYMENT_STATUS_ERROR]", error)
		return { success: false, error: "Gagal mengambil status pembayaran." }
	}
}

// ============================================
// CANCEL AND CHANGE PAYMENT METHOD
// ============================================

/**
 * Membatalkan transaksi yang sedang pending di Midtrans,
 * lalu menandai payment lama sebagai cancelled.
 * 
 * User kemudian bisa membuat transaksi baru dengan metode berbeda.
 * 
 * @param {string} orderId - Order ID yang ingin dibatalkan
 * @returns {{ success, error? }}
 */
export async function cancelAndChangePaymentMethod(orderId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		// Cari payment
		const [existingPayment] = await db
			.select()
			.from(payments)
			.where(and(
				eq(payments.orderId, orderId),
				eq(payments.userId, session.user.id),
			))
			.limit(1)

		if (!existingPayment) {
			return { success: false, error: "Pembayaran tidak ditemukan." }
		}

		if (existingPayment.status !== 'pending') {
			return { success: false, error: "Hanya transaksi pending yang bisa diganti metode pembayarannya." }
		}

		// 1. Cancel di Midtrans
		try {
			const { cancelTransaction } = await import("@/lib/midtrans")
			await cancelTransaction(orderId)
		} catch (midtransError) {
			console.warn("[CANCEL_MIDTRANS]", midtransError.message)
			// Lanjut saja — mungkin transaksi sudah expired di sisi Midtrans
		}

		// 2. Update status payment & orders menjadi cancelled
		await db.update(payments)
			.set({ status: 'cancelled', updatedAt: new Date() })
			.where(eq(payments.id, existingPayment.id))

		await db.update(orders)
			.set({ status: 'cancelled' })
			.where(eq(orders.paymentId, existingPayment.id))

		// 3. Kembalikan kuota voucher
		const metadata = existingPayment.metadataLocal
		if (metadata?.appliedVouchers && metadata.appliedVouchers.length > 0) {
			const voucherIds = metadata.appliedVouchers.map(v => v.voucher.id)
			await db.update(vouchers)
				.set({ usedCount: sql`GREATEST(used_count - 1, 0)` })
				.where(inArray(vouchers.id, voucherIds))
		}

		// 4. Re-create cart items dari metadata (agar user bisa checkout ulang)
		if (metadata?.stores) {
			const { carts: cartsTable } = await import("@/config/db/schema")

			// Cari/buat cart user
			let cart = await db.query.carts.findFirst({
				where: eq(cartsTable.userId, session.user.id),
			})
			if (!cart) {
				const [newCart] = await db.insert(cartsTable).values({
					userId: session.user.id,
				}).returning()
				cart = newCart
			}

			// Insert ulang cart items
			for (const store of metadata.stores) {
				for (const item of store.items) {
					await db.insert(cartItems).values({
						cartId: cart.id,
						productId: item.productId,
						variantId: item.variantId || null,
						quantity: item.quantity,
					}).onConflictDoNothing()
				}
			}
		}

		return { success: true }
	} catch (error) {
		console.error("[CANCEL_CHANGE_METHOD_ERROR]", error)
		return { success: false, error: "Gagal membatalkan transaksi." }
	}
}
