/**
 * Seller Order Server Actions
 * 
 * Semua operasi CRUD terkait pesanan dari sudut pandang penjual.
 * Memastikan penjual hanya bisa mengakses pesanan untuk toko miliknya.
 */
"use server"

import { db } from "@/config/db"
import { orders, stores, shipments, addresses } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, desc, sql } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Get current seller's store
// ============================================

async function getSellerStore() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null

	const store = await db.query.stores.findFirst({
		where: eq(stores.userId, session.user.id),
	})
	return store
}

// ============================================
// GET SELLER ORDERS
// ============================================

/**
 * Mengambil semua pesanan masuk ke toko milik penjual yang sedang login.
 * Termasuk relasi: items, payment, shipment, user (pembeli).
 */
export async function getSellerOrders() {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		const result = await db.query.orders.findMany({
			where: eq(orders.storeId, store.id),
			orderBy: [desc(orders.createdAt)],
			with: {
				items: {
					with: {
						product: {
							with: { images: true }
						}
					}
				},
				payment: {
					columns: {
						id: true,
						orderId: true,
						status: true,
						totalAmount: true,
						paidAt: true,
						metadataLocal: true,
					}
				},
				shipment: true,
				user: {
					columns: { id: true, name: true, email: true, image: true }
				}
			}
		})

		return { success: true, data: result }
	} catch (error) {
		console.error("[getSellerOrders]", error)
		return { success: false, error: "Gagal mengambil pesanan." }
	}
}

// ============================================
// UPDATE ORDER STATUS
// ============================================

/**
 * Mengubah status pesanan oleh penjual.
 * 
 * Flow status yang diperbolehkan:
 * - paid → processing (Penjual mulai mengemas)
 * - processing → shipped (Penjual memasukkan resi)
 * 
 * @param {number} orderId
 * @param {string} newStatus - 'processing' | 'shipped'
 * @param {{ courier?: string, awbNumber?: string }} shippingData - Wajib saat shipped
 */
export async function updateOrderStatus(orderId, newStatus, shippingData = {}) {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		// Ambil order dan pastikan milik toko ini
		const order = await db.query.orders.findFirst({
			where: and(
				eq(orders.id, parseInt(orderId)),
				eq(orders.storeId, store.id)
			),
			with: { user: true }
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan." }
		}

		// Validasi transisi status
		const allowedTransitions = {
			paid: ["processing"],
			processing: ["shipped"],
		}

		const allowed = allowedTransitions[order.status]
		if (!allowed || !allowed.includes(newStatus)) {
			return { success: false, error: `Status tidak bisa diubah dari "${order.status}" ke "${newStatus}".` }
		}

		// Jika shipped, wajib ada data pengiriman
		if (newStatus === "shipped") {
			if (!shippingData.awbNumber) {
				return { success: false, error: "Nomor resi wajib diisi." }
			}
			if (!shippingData.courier) {
				return { success: false, error: "Nama kurir wajib diisi." }
			}
		}

		// Lakukan update dalam transaction
		await db.transaction(async (tx) => {
			// Update status order
			await tx.update(orders)
				.set({ status: newStatus })
				.where(eq(orders.id, parseInt(orderId)))

			// Jika shipped, buat atau update record shipment
			if (newStatus === "shipped") {
				// Cek apakah sudah ada shipment record
				const existingShipment = await tx.query.shipments.findFirst({
					where: eq(shipments.orderId, parseInt(orderId))
				})

				if (existingShipment) {
					await tx.update(shipments)
						.set({
							courier: shippingData.courier,
							awbNumber: shippingData.awbNumber,
							status: "shipped",
						})
						.where(eq(shipments.id, existingShipment.id))
				} else {
					await tx.insert(shipments).values({
						orderId: parseInt(orderId),
						courier: shippingData.courier,
						awbNumber: shippingData.awbNumber,
						status: "shipped",
					})
				}
			}
		})

		const statusLabel = newStatus === "processing" ? "Dikemas" : "Dikirim"

		// === REAL-TIME NOTIFICATION ke buyer ===
		try {
			const { createNotification } = await import("@/actions/public/notification.actions")
			const { wsEmit } = await import("@/lib/ws-emit")
			const { sendEmail } = await import("@/lib/email")
			const { getOrderProcessingEmail, getOrderShippedEmail } = await import("@/lib/email-templates")

			const title = newStatus === "processing"
				? "📦 Pesanan Sedang Dikemas"
				: "🚚 Pesanan Dikirim!"
			
			const message = newStatus === "processing"
				? `Penjual sedang mengemas pesanan Anda.`
				: `Pesanan Anda telah dikirim! Resi: ${shippingData.awbNumber}`

			const notif = await createNotification(
				order.userId,
				newStatus === "processing" ? "order_processing" : "order_shipped",
				title,
				message,
				{
					orderId: order.id,
					status: newStatus,
					courier: shippingData.courier || null,
					awbNumber: shippingData.awbNumber || null,
				}
			)

			if (notif) {
				await wsEmit("notifications", `user:${order.userId}`, "notification", notif)
			}
			
			// === KIRIM EMAIL KE PEMBELI ===
			if (order.user?.email) {
				const emailSubject = newStatus === "processing" 
					? `[KiriMart] Pesanan #${order.id} Sedang Dikemas` 
					: `[KiriMart] Pesanan #${order.id} Telah Dikirim`;
				
				const emailHtml = newStatus === "processing"
					? getOrderProcessingEmail(order.user.name || "Pembeli", order.id, store.name)
					: getOrderShippedEmail(order.user.name || "Pembeli", order.id, shippingData.courier, shippingData.awbNumber);
					
				await sendEmail(order.user.email, emailSubject, emailHtml);
			}
		} catch (notifError) {
			console.warn("[updateOrderStatus] Failed to send notification:", notifError.message)
		}

		return { success: true, message: `Pesanan berhasil diperbarui menjadi "${statusLabel}".` }
	} catch (error) {
		console.error("[updateOrderStatus]", error)
		return { success: false, error: "Gagal memperbarui status pesanan." }
	}
}

// ============================================
// GET ORDER SHIPPING DETAIL (Ambil data kurir dari metadataLocal)
// ============================================

/**
 * Mengambil detail pengiriman yang dipilih pembeli saat checkout.
 * Data ini diambil dari payment.metadataLocal (bukan dari kolom order langsung).
 *
 * Digunakan di UI Seller Dashboard sebelum Seller menekan "Kirim Pesanan".
 *
 * @param {number} orderId
 * @returns {{ success: boolean, data?: { courier, courierCode, serviceCode, serviceName, price, collectionMethod, buyerAddress, buyerName, buyerPhone } }}
 */
export async function getOrderShippingDetail(orderId) {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		// Ambil order beserta payment (untuk metadataLocal) dan items
		const order = await db.query.orders.findFirst({
			where: and(
				eq(orders.id, parseInt(orderId)),
				eq(orders.storeId, store.id)
			),
			with: {
				payment: true,
				items: {
					with: {
						product: {
							columns: { weightGram: true },
						},
					},
				},
				shipment: true,
			},
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan." }
		}

		if (order.shipment?.biteshipOrderId) {
			return { success: false, error: "Pesanan ini sudah dikirim via Biteship." }
		}

		// Ambil data dari metadataLocal
		const metadata = order.payment?.metadataLocal
		if (!metadata) {
			return { success: false, error: "Data checkout tidak ditemukan." }
		}

		// Cari store entry yang sesuai dengan order ini
		const storeEntry = metadata.stores?.find(s => s.storeId === store.id)
		if (!storeEntry) {
			return { success: false, error: "Data toko tidak ditemukan di metadata checkout." }
		}

		const selectedShipping = storeEntry.selectedShipping
		if (!selectedShipping) {
			return { success: false, error: "Pembeli tidak memilih kurir untuk toko ini." }
		}

		// Ambil data alamat pembeli
		const buyerAddress = metadata.address || {}

		return {
			success: true,
			data: {
				orderId: order.id,
				orderStatus: order.status,
				// Data kurir yang dipilih pembeli
				courier: selectedShipping.courier || selectedShipping.name || "-",
				courierCode: selectedShipping.courierCode || "",
				serviceCode: selectedShipping.serviceCode || "",
				serviceName: selectedShipping.name || "",
				price: selectedShipping.price || 0,
				collectionMethod: selectedShipping.collectionMethod || [],
				// Data pembeli
				buyerName: buyerAddress.recipientName || metadata.user?.name || "-",
				buyerPhone: buyerAddress.recipientPhone || "-",
				buyerEmail: metadata.user?.email || "",
				buyerDetailAddress: buyerAddress.detailAddress || buyerAddress.detail || "-",
				buyerAreaId: buyerAddress.biteshipAreaId || "",
				buyerZipcode: buyerAddress.zipcode || "",
				buyerCity: buyerAddress.cityName || "",
				buyerProvince: buyerAddress.provinceName || "",
				// Items (untuk payload Biteship)
				items: order.items.map(item => ({
					name: item.productNameSnapshot,
					description: item.variantNameSnapshot || "",
					value: item.priceSnapshot,
					weight: item.product?.weightGram || 200,
					quantity: item.quantity,
				})),
				// Data notes
				notes: storeEntry.notes || order.notes || "",
			},
		}
	} catch (error) {
		console.error("[getOrderShippingDetail]", error)
		return { success: false, error: "Gagal mengambil detail pengiriman." }
	}
}

// ============================================
// SHIP ORDER VIA BITESHIP (Kirim Pesanan Otomatis)
// ============================================

/**
 * Mengirim pesanan melalui Biteship (buat order pengiriman otomatis).
 *
 * Flow:
 * 1. Validasi order (harus status "processing")
 * 2. Ambil data kurir dari payment.metadataLocal
 * 3. Ambil alamat toko (origin) dan alamat pembeli (destination)
 * 4. Panggil createBiteshipOrder() — hit API Biteship
 * 5. Simpan response ke tabel shipments (biteshipOrderId, awbNumber, dll)
 * 6. Update status order → "shipped"
 *
 * @param {number} orderId
 * @param {string} pickupMethod - "pickup" atau "drop_off"
 * @returns {{ success: boolean, data?: { awbNumber, biteshipOrderId }, error?: string }}
 */
export async function shipOrderViaBiteship(orderId, pickupMethod = "pickup") {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		// 1. Ambil order lengkap beserta payment, items, dan shipment
		const order = await db.query.orders.findFirst({
			where: and(
				eq(orders.id, parseInt(orderId)),
				eq(orders.storeId, store.id)
			),
			with: {
				payment: true,
				items: {
					with: {
						product: {
							columns: { weightGram: true },
						},
					},
				},
				shipment: true,
				user: true,
			},
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan." }
		}

		// Validasi status: harus "processing" (sudah dikemas)
		if (order.status !== "processing") {
			return { success: false, error: `Pesanan harus berstatus "Dikemas" untuk dikirim. Status saat ini: "${order.status}".` }
		}

		// Cek apakah sudah pernah dikirim via Biteship
		if (order.shipment?.biteshipOrderId) {
			return { success: false, error: "Pesanan ini sudah dikirim via Biteship." }
		}

		// 2. Ambil data kurir dari metadataLocal
		const metadata = order.payment?.metadataLocal
		if (!metadata) {
			return { success: false, error: "Data checkout tidak ditemukan." }
		}

		const storeEntry = metadata.stores?.find(s => s.storeId === store.id)
		if (!storeEntry) {
			return { success: false, error: "Data toko tidak ditemukan di metadata checkout." }
		}

		const selectedShipping = storeEntry.selectedShipping
		if (!selectedShipping) {
			return { success: false, error: "Pembeli tidak memilih kurir." }
		}

		// 3. Ambil alamat toko (origin)
		const storeAddress = await db.query.addresses.findFirst({
			where: eq(addresses.id, store.addressId),
		})

		if (!storeAddress) {
			return { success: false, error: "Alamat toko belum diatur. Silakan atur di Profil Toko." }
		}

		if (!storeAddress.biteshipAreaId) {
			return { success: false, error: "Alamat toko belum memiliki data wilayah Biteship. Silakan perbarui alamat toko." }
		}

		// 4. Ambil alamat pembeli (destination) dari metadataLocal
		const buyerAddress = metadata.address
		if (!buyerAddress || !buyerAddress.biteshipAreaId) {
			return { success: false, error: "Alamat pembeli tidak valid atau belum memiliki data wilayah Biteship." }
		}

		// 5. Susun payload untuk Biteship createBiteshipOrder
		const { createBiteshipOrder } = await import("@/actions/public/biteship.actions")

		// Tentukan delivery_type berdasarkan pickupMethod
		// "pickup" → "now" (kurir datang jemput)
		// "drop_off" → "later" (seller antar sendiri, kurir pickup dari gerai)
		const deliveryType = pickupMethod === "pickup" ? "now" : "later"

		const biteshipPayload = {
			origin: {
				contactName: storeAddress.recipientName || store.name || "Penjual",
				contactPhone: storeAddress.recipientPhone || "-",
				address: storeAddress.detailAddress || "",
				areaId: storeAddress.biteshipAreaId,
				postalCode: storeAddress.zipcode || "",
			},
			destination: {
				contactName: buyerAddress.recipientName || metadata.user?.name || "Pembeli",
				contactPhone: buyerAddress.recipientPhone || "-",
				contactEmail: metadata.user?.email || "",
				address: buyerAddress.detailAddress || buyerAddress.detail || "",
				areaId: buyerAddress.biteshipAreaId,
				postalCode: buyerAddress.zipcode || "",
				note: storeEntry.notes || order.notes || "",
			},
			courierCode: selectedShipping.courierCode,
			courierType: selectedShipping.serviceCode,
			deliveryType: deliveryType,
			orderNote: `KiriMart Order #${order.id}`,
			items: order.items.map(item => ({
				name: item.productNameSnapshot,
				description: item.variantNameSnapshot || "",
				category: "others",
				value: item.priceSnapshot,
				quantity: item.quantity,
				weight: item.product?.weightGram || 200,
				height: 10,
				length: 10,
				width: 10,
			})),
		}

		console.log("[shipOrderViaBiteship] Payload:", JSON.stringify(biteshipPayload, null, 2))

		// 6. Panggil API Biteship
		const biteshipResult = await createBiteshipOrder(biteshipPayload)

		if (!biteshipResult.success) {
			console.error("[shipOrderViaBiteship] Biteship error:", biteshipResult.error)
			return {
				success: false,
				error: `Gagal membuat order di Biteship: ${typeof biteshipResult.error === "string" ? biteshipResult.error : "Silakan coba lagi."}`,
			}
		}

		// 7. Simpan ke DB dalam transaction
		await db.transaction(async (tx) => {
			// Cek apakah sudah ada shipment record (dari flow lama)
			const existingShipment = await tx.query.shipments.findFirst({
				where: eq(shipments.orderId, parseInt(orderId)),
			})

			const shipmentData = {
				courier: selectedShipping.courierCode,
				courierType: selectedShipping.serviceCode,
				service: selectedShipping.name || selectedShipping.courier,
				awbNumber: biteshipResult.data.courierWaybillId || null,
				biteshipOrderId: biteshipResult.data.id,
				biteshipTrackingId: biteshipResult.data.courierTrackingId || null,
				status: biteshipResult.data.status || "confirmed",
				pickupMethod: pickupMethod,
				shippingFee: selectedShipping.price || order.totalShipping,
				estimatedDays: selectedShipping.eta || null,
			}

			if (existingShipment) {
				await tx.update(shipments)
					.set(shipmentData)
					.where(eq(shipments.id, existingShipment.id))
			} else {
				await tx.insert(shipments).values({
					orderId: parseInt(orderId),
					...shipmentData,
				})
			}

			// Update status order → shipped
			await tx.update(orders)
				.set({ status: "shipped" })
				.where(eq(orders.id, parseInt(orderId)))
		})

		console.log(`[shipOrderViaBiteship] Order #${orderId} shipped via Biteship! AWB: ${biteshipResult.data.courierWaybillId}`)

		// === REAL-TIME NOTIFICATION & EMAIL ke buyer ===
		try {
			const { createNotification } = await import("@/actions/public/notification.actions")
			const { wsEmit } = await import("@/lib/ws-emit")
			const { sendEmail } = await import("@/lib/email")
			const { getOrderShippedEmail } = await import("@/lib/email-templates")

			const awb = biteshipResult.data.courierWaybillId || "(menunggu dari kurir)"
			const courierName = selectedShipping.name || selectedShipping.courier

			const notif = await createNotification(
				order.userId,
				"order_shipped",
				"🚚 Pesanan Dikirim!",
				`Pesanan Anda telah dikirim! Resi: ${awb}`,
				{
					orderId: order.id,
					status: "shipped",
					courier: courierName,
					awbNumber: awb,
				}
			)

			if (notif) {
				await wsEmit("notifications", `user:${order.userId}`, "notification", notif)
			}
			
			// === KIRIM EMAIL KE PEMBELI ===
			if (order.user?.email) {
				const emailSubject = `[KiriMart] Pesanan #${order.id} Telah Dikirim`
				const emailHtml = getOrderShippedEmail(order.user.name || "Pembeli", order.id, courierName, awb)
				await sendEmail(order.user.email, emailSubject, emailHtml)
			}
		} catch (notifError) {
			console.warn("[shipOrderViaBiteship] Failed to send notification:", notifError.message)
		}

		return {
			success: true,
			data: {
				awbNumber: biteshipResult.data.courierWaybillId || "(menunggu dari kurir)",
				biteshipOrderId: biteshipResult.data.id,
				status: biteshipResult.data.status,
			},
			message: "Pesanan berhasil dikirim via Biteship!",
		}
	} catch (error) {
		console.error("[shipOrderViaBiteship] Error:", error)
		return { success: false, error: "Terjadi kesalahan saat mengirim pesanan." }
	}
}
