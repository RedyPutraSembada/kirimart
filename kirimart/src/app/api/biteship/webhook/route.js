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

				// === REAL-TIME NOTIFICATION ke buyer ===
				try {
					const { createNotification } = await import("@/actions/public/notification.actions")
					const { wsEmit } = await import("@/lib/ws-emit")

					// Ambil order beserta user (buyer)
					const order = await db.query.orders.findFirst({
						where: eq(orders.id, shipment.orderId),
						with: {
							user: true
						}
					})
					
					if (order) {
						const statusLabels = {
							"confirmed": "📦 Pesanan Dikonfirmasi",
							"allocated": "📦 Kurir Dialokasikan",
							"picking_up": "🏃 Kurir Menuju Penjual",
							"picked": "📦 Paket Diambil Kurir",
							"in_transit": "🚚 Paket Dalam Perjalanan",
							"dropping_off": "🚚 Kurir Menuju Alamat Anda",
							"delivered": "✅ Paket Telah Sampai!",
							"return_in_transit": "↩️ Paket Dikembalikan",
							"returned": "↩️ Paket Telah Dikembalikan",
						}

						const statusText = {
							"confirmed": "Dikonfirmasi",
							"allocated": "Kurir Dialokasikan",
							"picking_up": "Menuju Penjual",
							"picked": "Diambil Kurir",
							"in_transit": "Dalam Perjalanan",
							"dropping_off": "Menuju Alamat Anda",
							"delivered": "Telah Sampai",
							"return_in_transit": "Proses Retur",
							"returned": "Telah Diretur",
							"rejected": "Ditolak",
							"cancelled": "Dibatalkan",
						}[status] || status;

						const title = statusLabels[status] || `📦 Update Pengiriman`
						const message = courier_waybill_id 
							? `Resi: ${courier_waybill_id} — Status: ${statusText}`
							: `Status pengiriman berubah menjadi: ${statusText}`

						const notif = await createNotification(
							order.userId,
							status === "delivered" ? "order_delivered" : "order_status_changed",
							title,
							message,
							{ orderId: order.id, status, awbNumber: courier_waybill_id || null }
						)

						if (notif) {
							await wsEmit("notifications", `user:${order.userId}`, "notification", notif)
						}

						// === SCHEDULE AUTO-COMPLETE (7 hari setelah delivered) ===
						if (status === "delivered") {
							const { scheduleAutoComplete } = await import("@/lib/jobs")
							await scheduleAutoComplete(order.id)
						}
						
						// === EMAIL NOTIFICATIONS ===
						if (order.user && order.user.email) {
							const { sendEmail } = await import("@/lib/email")
							const { getOrderShippedEmail, getOrderDeliveredEmail } = await import("@/lib/email-templates")
							
							try {
								// Kirim email "Pesanan Dikirim" saat status allocated
								if (status === "allocated") {
									const awb = courier_waybill_id || shipment.awbNumber || "-"
									const emailHtml = getOrderShippedEmail(order.user.name || "Pembeli", order.id, shipment.courier || "kurir", awb)
									await sendEmail(order.user.email, `Pesanan #${order.id} Sedang Dikirim 🚚`, emailHtml)
								} 
								// Kirim email "Pesanan Diterima" saat status delivered
								else if (status === "delivered") {
									const emailHtml = getOrderDeliveredEmail(order.user.name || "Pembeli", order.id)
									await sendEmail(order.user.email, `Paket Pesanan #${order.id} Telah Sampai! 📦`, emailHtml)
								}
							} catch (e) {
								console.error("[EMAIL_SHIPPING_ERROR]", e)
							}
						}
					}
				} catch (notifError) {
					console.warn("[BITESHIP WEBHOOK] Failed to send notification:", notifError.message)
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
