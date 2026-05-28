/**
 * Tracking Server Actions
 *
 * Menyediakan fungsi untuk melacak status pengiriman paket melalui Biteship API.
 * Digunakan oleh buyer dan seller untuk melihat posisi paket secara real-time.
 */
"use server"

import { db } from "@/config/db"
import { shipments, orders, stores } from "@/config/db/schema"
import { eq, and } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { env } from "@/config/env"

const BITESHIP_API_URL = "https://api.biteship.com"

/**
 * Helper: fetch ke Biteship API dengan auth header
 */
async function biteshipFetch(path) {
	const url = `${BITESHIP_API_URL}${path}`
	const res = await fetch(url, {
		headers: {
			"Content-Type": "application/json",
			"authorization": env.BITESHIP_API_KEY,
		},
		next: { revalidate: 60 }, // Cache 60 detik agar tidak spam API
	})

	const data = await res.json()
	if (!res.ok) {
		throw new Error(data?.error || data?.message || `Biteship API error: ${res.status}`)
	}
	return data
}

/**
 * Lacak paket berdasarkan Order ID.
 * Mengambil AWB dan courier code dari tabel shipments,
 * lalu menembak Biteship Tracking API.
 *
 * Bisa dipanggil oleh buyer (validasi userId) maupun seller (validasi storeId).
 *
 * @param {number} orderId
 * @returns {{ success: boolean, data?: { awbNumber, courier, timeline[], status }, error?: string }}
 */
export async function trackOrderShipment(orderId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		// Ambil order beserta shipment
		const order = await db.query.orders.findFirst({
			where: eq(orders.id, parseInt(orderId)),
			with: {
				shipment: true,
			},
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan." }
		}

		// Validasi: user harus pemilik pesanan ATAU pemilik toko
		if (order.userId !== session.user.id) {
			// Cek apakah user adalah seller dari toko ini
			const store = await db.query.stores.findFirst({
				where: eq(stores.userId, session.user.id),
			})
			if (!store || store.id !== order.storeId) {
				return { success: false, error: "Unauthorized" }
			}
		}

		const shipment = order.shipment
		if (!shipment || !shipment.awbNumber) {
			return { success: false, error: "Nomor resi belum tersedia untuk pesanan ini." }
		}

		if (!shipment.courier) {
			return { success: false, error: "Data kurir tidak ditemukan." }
		}

		// Hit Biteship Tracking API
		const trackingData = await biteshipFetch(
			`/v1/trackings/${shipment.awbNumber}/couriers/${shipment.courier}`
		)

		// Helper untuk translate note dari Biteship
		const translateNote = (note) => {
			if (!note) return "";
			let n = note;
			n = n.replace(/Order has been delivered/gi, "Pesanan telah sampai di tujuan");
			n = n.replace(/Courier is dropping off item to destination/gi, "Kurir sedang mengantar paket ke alamat tujuan");
			n = n.replace(/Item has been picked by courier/gi, "Paket telah diambil oleh kurir");
			n = n.replace(/Courier is on the way to pick up location/gi, "Kurir sedang menuju ke lokasi penjemputan");
			n = n.replace(/Courier is allocated and ready to pick up/gi, "Kurir telah dialokasikan dan siap menjemput");
			n = n.replace(/Courier order is confirmed/gi, "Pesanan kurir telah dikonfirmasi");
			n = n.replace(/has been notified to pick up/gi, "telah diberitahu untuk melakukan penjemputan");
			n = n.replace(/Pickup Number/gi, "Nomor Penjemputan");
			n = n.replace(/Item is in transit/gi, "Paket dalam perjalanan");
			n = n.replace(/Order is confirmed/gi, "Pesanan dikonfirmasi");
			n = n.replace(/Item is being returned/gi, "Paket sedang dikembalikan");
			n = n.replace(/Item has been returned/gi, "Paket telah dikembalikan");
			n = n.replace(/Courier is allocated/gi, "Kurir dialokasikan");
			return n;
		};

		// Format timeline dari response Biteship
		const history = trackingData?.history || []
		const timeline = history.map((h) => ({
			status: h.status || "",
			note: translateNote(h.note || h.description || ""),
			date: h.updated_at || h.date || null,
			location: h.service_type || "",
		}))

		// Sort: terbaru di atas
		timeline.sort((a, b) => new Date(b.date) - new Date(a.date))

		return {
			success: true,
			data: {
				orderId: order.id,
				awbNumber: shipment.awbNumber,
				courier: shipment.courier,
				courierType: shipment.courierType,
				service: shipment.service,
				status: trackingData?.status || shipment.status || "unknown",
				timeline,
				// Data summary
				origin: trackingData?.origin || null,
				destination: trackingData?.destination || null,
			},
		}
	} catch (error) {
		console.error("[trackOrderShipment] Error:", error.message)

		// Jika API Biteship error (misal sandbox), kembalikan data lokal dari DB
		try {
			const order = await db.query.orders.findFirst({
				where: eq(orders.id, parseInt(orderId)),
				with: { shipment: true },
			})

			if (order?.shipment) {
						const statusTextMap = {
							"pending": "Menunggu Proses",
							"confirmed": "Menunggu Penjemputan",
							"allocated": "Kurir Dialokasikan",
							"picking_up": "Kurir Sedang Menjemput",
							"picked": "Paket Dijemput",
							"in_transit": "Dalam Perjalanan",
							"dropping_off": "Kurir Mengantar",
							"delivered": "Tiba di Tujuan",
							"returned": "Dikembalikan",
							"cancelled": "Dibatalkan",
						};
						const st = order.shipment.status || "confirmed";
						const stText = statusTextMap[st] || st;

						return {
							success: true,
							data: {
								orderId: order.id,
								awbNumber: order.shipment.awbNumber || "-",
								courier: order.shipment.courier || "-",
								courierType: order.shipment.courierType || "-",
								service: order.shipment.service || "-",
								status: st,
								timeline: [
									{
										status: st,
										note: `Pesanan telah diproses melalui ${order.shipment.courier?.toUpperCase() || "kurir"}. Status: ${stText}.`,
										date: order.createdAt,
										location: "",
									},
								],
								_fallback: true, // Flag bahwa ini data lokal, bukan dari Biteship
							},
						}
			}
		} catch { }

		return { success: false, error: "Gagal melacak paket. Silakan coba beberapa saat lagi." }
	}
}
