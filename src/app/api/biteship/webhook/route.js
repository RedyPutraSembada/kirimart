/**
 * Biteship Webhook Handler
 *
 * Endpoint: POST /api/biteship/webhook
 *
 * Menerima 3 jenis event dari Biteship:
 * 1. order.status   → Update status pengiriman
 * 2. order.waybill_id → Update nomor resi
 * 3. order.price    → Update tarif ongkir jika ada koreksi
 *
 * Webhook ini di-verifikasi menggunakan header signature yang sudah
 * dikonfigurasi di dashboard Biteship & .env (BITESHIP_WEBHOOK_SECRET).
 */

import { db } from "@/config/db"
import { shipments, orders } from "@/config/db/schema"
import { eq } from "drizzle-orm"

export async function POST(request) {
	try {
		// 1. Verifikasi Signature
		const signature = request.headers.get("x-biteship-signature")
		const secret = process.env.BITESHIP_WEBHOOK_SECRET

		if (secret && signature !== secret) {
			console.warn("[BITESHIP WEBHOOK] Invalid signature:", signature)
			return Response.json({ error: "Unauthorized" }, { status: 401 })
		}

		// 2. Parse body
		const body = await request.json()
		const { event, order_id, status, courier_waybill_id, price, shippment_fee } = body

		console.log(`[BITESHIP WEBHOOK] Event: ${event}, Order: ${order_id}, Status: ${status}`)

		if (!order_id) {
			return Response.json({ error: "Missing order_id" }, { status: 400 })
		}

		// 3. Cari shipment berdasarkan biteshipOrderId
		const [shipment] = await db.select()
			.from(shipments)
			.where(eq(shipments.biteshipOrderId, order_id))
			.limit(1)

		if (!shipment) {
			console.warn(`[BITESHIP WEBHOOK] Shipment not found for Biteship order: ${order_id}`)
			// Tetap return 200 agar Biteship tidak retry
			return Response.json({ success: true, message: "Shipment not found, ignored." })
		}

		// 4. Handle berdasarkan event type
		switch (event) {
			case "order.status": {
				// Update status shipment
				await db.update(shipments)
					.set({ status: status })
					.where(eq(shipments.id, shipment.id))

				// Update status order terkait berdasarkan status pengiriman
				// PENTING: "delivered" TIDAK langsung set "completed"!
				// Buyer harus konfirmasi + beri ulasan dulu.
				// Auto-complete via cron job setelah 7 hari jika buyer tidak konfirmasi.
				const orderStatusMap = {
					"confirmed": "shipped",
					"allocated": "shipped",
					"picking_up": "shipped",
					"picked": "shipped",
					"in_transit": "shipped",
					"dropping_off": "shipped",
					"delivered": "shipped", // Tetap shipped — tunggu buyer konfirmasi
					"return_in_transit": "shipped",
					"returned": "shipped",
					"rejected": "cancelled",
					"cancelled": "cancelled",
				}

				const newOrderStatus = orderStatusMap[status]
				if (newOrderStatus) {
					await db.update(orders)
						.set({ status: newOrderStatus })
						.where(eq(orders.id, shipment.orderId))
				}

				break
			}

			case "order.waybill_id": {
				// Update nomor resi
				if (courier_waybill_id) {
					await db.update(shipments)
						.set({ awbNumber: courier_waybill_id })
						.where(eq(shipments.id, shipment.id))
				}
				break
			}

			case "order.price": {
				// Update tarif ongkir jika ada koreksi dari kurir
				const newFee = price || shippment_fee
				if (newFee) {
					await db.update(shipments)
						.set({ shippingFee: newFee })
						.where(eq(shipments.id, shipment.id))
				}
				break
			}

			default:
				console.log(`[BITESHIP WEBHOOK] Unknown event: ${event}`)
		}

		return Response.json({ success: true })
	} catch (error) {
		console.error("[BITESHIP WEBHOOK] Error:", error)
		// Tetap return 200 agar Biteship tidak infinite retry
		return Response.json({ success: false, error: "Internal error" }, { status: 200 })
	}
}
