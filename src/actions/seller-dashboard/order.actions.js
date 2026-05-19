/**
 * Seller Order Server Actions
 * 
 * Semua operasi CRUD terkait pesanan dari sudut pandang penjual.
 * Memastikan penjual hanya bisa mengakses pesanan untuk toko miliknya.
 */
"use server"

import { db } from "@/config/db"
import { orders, stores, shipments } from "@/config/db/schema"
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
		return { success: true, message: `Pesanan berhasil diperbarui menjadi "${statusLabel}".` }
	} catch (error) {
		console.error("[updateOrderStatus]", error)
		return { success: false, error: "Gagal memperbarui status pesanan." }
	}
}
