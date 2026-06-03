/**
 * Biteship API Server Actions
 *
 * File ini merupakan satu-satunya titik interaksi antara Kawan Belanja dan Biteship API.
 * Semua fungsi mengikuti kontrak standar: { success: boolean, data?: any, error?: string }
 *
 * Fungsi:
 * 1. searchBiteshipArea(query)           → Autocomplete wilayah (untuk form alamat)
 * 2. getBiteshipRates(origin, dest, items, couriers) → Cek ongkir (untuk checkout)
 * 3. createBiteshipOrder(orderData)      → Buat order pengiriman (setelah bayar sukses)
 * 4. cancelBiteshipOrder(biteshipOrderId) → Batalkan order pengiriman
 */
"use server"

import { env } from "@/config/env"
import { cached } from "@/lib/cache"

const BITESHIP_API_URL = "https://api.biteship.com"

/**
 * Helper: fetch ke Biteship API dengan auth header
 */
async function biteshipFetch(path, options = {}) {
	const url = `${BITESHIP_API_URL}${path}`
	const res = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			"authorization": env.BITESHIP_API_KEY,
			...options.headers,
		},
	})
	return res.json()
}

// ============================================
// 1. SEARCH AREA (Autocomplete Wilayah)
// ============================================

/**
 * Mencari wilayah berdasarkan input teks (autocomplete).
 * Digunakan di form alamat (Buyer & Seller).
 *
 * Biaya: Rp 5 per hit. Gunakan debounce 1 detik di client.
 *
 * @param {string} query - Teks pencarian (misal: "Pesanggrahan Jakarta")
 * @returns {{ success: boolean, data?: Array<{ id, name, postal_code, ... }> }}
 */
export async function searchBiteshipArea(query) {
	try {
		if (!query || query.trim().length < 3) {
			return { success: true, data: [] }
		}

		const result = await biteshipFetch(
			`/v1/maps/areas?countries=ID&input=${encodeURIComponent(query.trim())}&type=single`
		)

		if (!result.success && result.error) {
			console.error("[searchBiteshipArea] Biteship error:", result.error)
			return { success: false, error: "Gagal mencari wilayah." }
		}

		// Map response ke format yang konsisten
		const areas = (result.areas || []).map(area => ({
			id: area.id, // Biteship Area ID (simpan ke DB)
			name: area.name, // Full formatted name
			provinceName: area.administrative_division_level_1_name || "",
			cityName: area.administrative_division_level_2_name || "",
			kecamatanName: area.administrative_division_level_3_name || "",
			postalCode: area.postal_code || "",
		}))

		return { success: true, data: areas }
	} catch (error) {
		console.error("[searchBiteshipArea] Error:", error)
		return { success: false, error: "Gagal mencari wilayah." }
	}
}

// ============================================
// 2. GET RATES (Cek Ongkos Kirim)
// ============================================

/**
 * Mengambil tarif ongkos kirim dari berbagai kurir.
 * Digunakan di halaman checkout saat user sudah memilih alamat.
 *
 * Biaya: Rp 5 per hit. Hanya dipanggil 1x per toko per checkout.
 *
 * @param {string} originAreaId - Biteship Area ID toko (dari DB addresses.biteshipAreaId)
 * @param {string} destAreaId - Biteship Area ID pembeli (dari DB addresses.biteshipAreaId)
 * @param {Array} items - Daftar barang [{ name, value, weight, quantity, length?, width?, height? }]
 * @param {string} couriers - Kode kurir dipisah koma (misal: "jne,sicepat,jnt")
 * @returns {{ success: boolean, data?: Array<{ id, courier, name, service, price, eta, etaDays }> }}
 */
export async function getBiteshipRates(originAreaId, destAreaId, items, couriers = "jne,sicepat,jnt,anteraja,ninja,lion,tiki,pos,grab,gojek") {
	try {
		if (!originAreaId || !destAreaId) {
			return { success: false, error: "Alamat asal atau tujuan belum lengkap." }
		}

		// Format items sesuai Biteship API spec
		const biteshipItems = items.map(item => ({
			name: item.name || "Produk",
			description: item.variant || "",
			value: item.price || 0,
			weight: (item.weight || 200) * (item.qty || item.quantity || 1),
			quantity: item.qty || item.quantity || 1,
			length: item.length || 10,
			width: item.width || 10,
			height: item.height || 10,
		}))

		// Cache key berdasarkan rute + total weight (ongkir sama untuk rute yang sama)
		const totalWeight = biteshipItems.reduce((sum, i) => sum + i.weight, 0)
		const cacheKey = `ongkir:${originAreaId}:${destAreaId}:${totalWeight}:${couriers}`

		// Cache 30 menit — ongkir per rute jarang berubah dalam waktu singkat
		return await cached(cacheKey, async () => {
			const requestBody = {
				origin_area_id: originAreaId,
				destination_area_id: destAreaId,
				couriers: couriers,
				items: biteshipItems,
			}

			console.log("[getBiteshipRates] Request (cache MISS):", JSON.stringify(requestBody, null, 2))

			const result = await biteshipFetch("/v1/rates/couriers", {
				method: "POST",
				body: JSON.stringify(requestBody),
			})

			if (result.error) {
				console.error("[getBiteshipRates] Biteship error:", result.error)
				return { success: false, error: typeof result.error === "string" ? result.error : "Gagal mengambil tarif ongkir." }
			}

			const pricing = (result.pricing || []).map((rate, idx) => ({
				id: `${rate.courier_code}_${rate.courier_service_code}_${idx}`,
				courier: rate.courier_name || rate.company,
				courierCode: rate.courier_code,
				name: rate.courier_service_name || rate.courier_service_code,
				serviceCode: rate.courier_service_code,
				price: rate.price || 0,
				shippingFee: rate.shipment_fee || rate.price || 0,
				insuranceFee: rate.insurance_fee || 0,
				eta: rate.duration || "-",
				etaDays: rate.shipment_duration_range ? {
					min: rate.shipment_duration_range.min_day || 0,
					max: rate.shipment_duration_range.max_day || 0,
				} : null,
				collectionMethod: rate.available_collection_method || [],
			}))

			console.log(`[getBiteshipRates] Found ${pricing.length} rates`)
			return { success: true, data: pricing }
		}, 1800) // 30 menit
	} catch (error) {
		console.error("[getBiteshipRates] Error:", error)
		return { success: false, error: "Gagal mengambil tarif ongkir." }
	}
}

// ============================================
// 3. CREATE ORDER (Buat Pengiriman)
// ============================================

/**
 * Membuat order pengiriman ke Biteship.
 * Dipanggil SETELAH pembayaran Midtrans berhasil (bukan saat checkout).
 *
 * Biaya: Rp 5 per hit.
 *
 * @param {Object} orderData
 * @param {Object} orderData.origin - { contactName, contactPhone, address, areaId, postalCode }
 * @param {Object} orderData.destination - { contactName, contactPhone, contactEmail, address, areaId, postalCode, note }
 * @param {string} orderData.courierCode - "jne"
 * @param {string} orderData.courierType - "reg"
 * @param {string} orderData.deliveryType - "now" | "later"
 * @param {Array} orderData.items - [{ name, description, value, weight, quantity, height, length, width }]
 * @param {string} orderData.orderNote - Catatan pengiriman
 * @returns {{ success: boolean, data?: { id, courier_tracking_id, courier_waybill_id, status } }}
 */
export async function createBiteshipOrder(orderData) {
	try {
		const payload = {
			origin_contact_name: orderData.origin.contactName,
			origin_contact_phone: orderData.origin.contactPhone,
			origin_address: orderData.origin.address,
			origin_area_id: orderData.origin.areaId,
			origin_postal_code: orderData.origin.postalCode ? Number(orderData.origin.postalCode) : undefined,
			destination_contact_name: orderData.destination.contactName,
			destination_contact_phone: orderData.destination.contactPhone,
			destination_contact_email: orderData.destination.contactEmail || "",
			destination_address: orderData.destination.address,
			destination_area_id: orderData.destination.areaId,
			destination_postal_code: orderData.destination.postalCode ? Number(orderData.destination.postalCode) : undefined,
			destination_note: orderData.destination.note || "",
			courier_company: orderData.courierCode,
			courier_type: orderData.courierType,
			delivery_type: orderData.deliveryType || "now",
			order_note: orderData.orderNote || "",
			items: (orderData.items || []).map(item => ({
				name: item.name || "Produk",
				description: item.description || "",
				category: item.category || "others",
				value: item.value || 0,
				quantity: item.quantity || 1,
				weight: item.weight || 200,
				height: item.height || 10,
				length: item.length || 10,
				width: item.width || 10,
			})),
		}

		const result = await biteshipFetch("/v1/orders", {
			method: "POST",
			body: JSON.stringify(payload),
		})

		if (!result.success && result.error) {
			console.error("[createBiteshipOrder] Biteship error:", result.error)
			return { success: false, error: result.error || "Gagal membuat order pengiriman." }
		}

		return {
			success: true,
			data: {
				id: result.id,
				courierTrackingId: result.courier?.tracking_id || null,
				courierWaybillId: result.courier?.waybill_id || null,
				status: result.status || "confirmed",
			},
		}
	} catch (error) {
		console.error("[createBiteshipOrder] Error:", error)
		return { success: false, error: "Gagal membuat order pengiriman." }
	}
}

// ============================================
// 4. CANCEL ORDER (Batalkan Pengiriman)
// ============================================

/**
 * Membatalkan order pengiriman di Biteship.
 * PENTING: Hanya bisa dilakukan sebelum status "picked" (paket sudah dijemput kurir).
 *
 * @param {string} biteshipOrderId - ID order Biteship
 * @param {string} reason - Alasan pembatalan
 * @returns {{ success: boolean, error?: string }}
 */
export async function cancelBiteshipOrder(biteshipOrderId, reason = "Dibatalkan oleh sistem") {
	try {
		if (!biteshipOrderId) {
			return { success: false, error: "ID order Biteship tidak ditemukan." }
		}

		// PENTING: Gunakan POST bukan DELETE (DELETE sudah deprecated!)
		const result = await biteshipFetch(`/v1/orders/${biteshipOrderId}/cancel`, {
			method: "POST",
			body: JSON.stringify({ reason }),
		})

		if (!result.success && result.error) {
			console.error("[cancelBiteshipOrder] Biteship error:", result.error)
			return { success: false, error: result.error || "Gagal membatalkan pengiriman." }
		}

		return { success: true }
	} catch (error) {
		console.error("[cancelBiteshipOrder] Error:", error)
		return { success: false, error: "Gagal membatalkan pengiriman." }
	}
}

// ============================================
// 5. GET COURIERS (Daftar Kurir)
// ============================================

/**
 * Mengambil daftar kurir yang tersedia dari Biteship.
 * Dikelompokkan berdasarkan courier_code agar mudah ditampilkan di UI (misal: "jne" -> "JNE Reguler, JNE YES").
 *
 * @returns {{ success: boolean, data?: Array<{ code, name, desc }> }}
 */
export async function getBiteshipCouriers() {
	try {
		// Cache 24 jam (86400 detik) karena daftar kurir sangat jarang berubah
		return await cached("biteship_couriers_grouped", async () => {
			const result = await biteshipFetch("/v1/couriers", { method: "GET" })

			if (!result || result.error) {
				console.error("[getBiteshipCouriers] Biteship error:", result?.error)
				return { success: false, error: "Gagal mengambil daftar kurir." }
			}

			// Biteship mengembalikan { success: true, object: "courier", couriers: [...] }
			const couriersList = result.couriers || []

			// Kelompokkan berdasarkan courier_code
			const grouped = couriersList.reduce((acc, curr) => {
				const code = curr.courier_code
				if (!acc[code]) {
					// Format nama kurir (capitalize first letter/uppercase jika pendek)
					const name = code.length <= 3 ? code.toUpperCase() : code.charAt(0).toUpperCase() + code.slice(1)
					acc[code] = {
						code: code,
						name: name === "Sicepat" ? "SiCepat" : name === "Jnt" ? "J&T" : name, // special mapping
						services: [],
					}
				}
				acc[code].services.push(curr.courier_service_name || curr.courier_service_code)
				return acc
			}, {})

			const data = Object.values(grouped).map(c => ({
				code: c.code,
				name: c.name,
				desc: c.services.join(", "),
			}))

			return { success: true, data }
		}, 86400)
	} catch (error) {
		console.error("[getBiteshipCouriers] Error:", error)
		return { success: false, error: "Gagal mengambil daftar kurir." }
	}
}
