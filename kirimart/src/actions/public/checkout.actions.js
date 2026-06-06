/**
 * Checkout Server Actions
 *
 * Mengambil data yang dibutuhkan halaman Checkout:
 * - Alamat pengiriman user
 * - Item keranjang yang dipilih (dikelompokkan per toko)
 * - Opsi ongkos kirim (mock, siap diganti KiriminAja)
 *
 * Juga mengelola "selected items" via cookie agar URL tetap bersih (/checkout).
 */
"use server"

import { db } from "@/config/db"
import { carts, cartItems, addresses } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, inArray } from "drizzle-orm"
import { headers, cookies } from "next/headers"
import { cached } from "@/lib/cache"

const CHECKOUT_COOKIE = "km_checkout_items"
const CHECKOUT_ADDRESS_COOKIE = "km_checkout_address"

// ============================================
// HELPER: Get session (reusable)
// ============================================

async function getAuthSession() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null
	return session
}

// ============================================
// SET CHECKOUT ITEMS (dipanggil dari halaman Cart)
// ============================================

/**
 * Menyimpan ID cart items yang dipilih ke cookie.
 * Dipanggil saat user menekan tombol Checkout di halaman /cart.
 *
 * @param {number[]} cartItemIds - Array of cartItem IDs
 */
export async function setCheckoutItems(cartItemIds) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		if (!cartItemIds || cartItemIds.length === 0) {
			return { success: false, error: "Pilih minimal 1 barang untuk checkout." }
		}

		const cookieStore = await cookies()
		cookieStore.set(CHECKOUT_COOKIE, JSON.stringify(cartItemIds), {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60, // 1 jam
			path: "/",
		})

		return { success: true }
	} catch (error) {
		console.error("[setCheckoutItems]", error)
		return { success: false, error: "Gagal menyimpan data checkout." }
	}
}

// ============================================
// SET CHECKOUT ADDRESS (dipanggil saat user ganti alamat)
// ============================================

/**
 * Menyimpan ID alamat pengiriman yang dipilih ke cookie.
 * Dipanggil saat user menekan tombol "Ganti Alamat" di halaman /checkout.
 *
 * @param {number} addressId - ID alamat yang dipilih
 */
export async function setCheckoutAddress(addressId) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		const cookieStore = await cookies()
		cookieStore.set(CHECKOUT_ADDRESS_COOKIE, String(addressId), {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60, // 1 jam
			path: "/",
		})

		return { success: true }
	} catch (error) {
		console.error("[setCheckoutAddress]", error)
		return { success: false, error: "Gagal menyimpan alamat checkout." }
	}
}

// ============================================
// GET CHECKOUT DATA (dipanggil dari halaman Checkout)
// ============================================

/**
 * Mengambil semua data yang dibutuhkan halaman Checkout:
 * 1. Alamat pengiriman user (semua alamat + tandai default/pertama)
 * 2. Item keranjang yang dipilih, dikelompokkan per toko
 * 3. Opsi ongkos kirim mock per toko (berdasarkan berat total)
 *
 * Jika tidak ada cookie (user akses /checkout langsung), ambil SEMUA item di keranjang.
 */
export async function getCheckoutData() {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		// 1. Baca cookie untuk tahu item mana yang dipilih
		const cookieStore = await cookies()
		const checkoutCookie = cookieStore.get(CHECKOUT_COOKIE)
		let selectedItemIds = null

		if (checkoutCookie?.value) {
			try {
				selectedItemIds = JSON.parse(checkoutCookie.value)
			} catch {
				selectedItemIds = null
			}
		}

		// 2. Ambil cart user beserta items
		const cart = await db.query.carts.findFirst({
			where: eq(carts.userId, session.user.id),
			with: {
				items: {
					orderBy: (items, { asc }) => [asc(items.id)],
					with: {
						product: {
							with: {
								images: true,
								store: {
									columns: { id: true, name: true, domainSlug: true, isStar: true, logoUrl: true, addressId: true, enabledCouriers: true, metaPixelId: true },
									with: {
										address: true, // Alamat asal toko (untuk kalkulasi ongkir nanti)
									},
								},
							},
						},
						variant: true,
					},
				},
			},
		})

		if (!cart || !cart.items || cart.items.length === 0) {
			return { success: true, data: { stores: [], addresses: [], selectedAddressId: null } }
		}

		// 3. Filter hanya item yang dipilih (atau semua jika tidak ada cookie)
		let filteredItems = cart.items
		if (selectedItemIds && selectedItemIds.length > 0) {
			filteredItems = cart.items.filter(item => selectedItemIds.includes(item.id))
		}

		// Pastikan item masih valid (produk aktif)
		filteredItems = filteredItems.filter(item => item.product && item.product.status === "active")

		if (filteredItems.length === 0) {
			return { success: true, data: { stores: [], addresses: [], selectedAddressId: null } }
		}

		// 4. Kelompokkan items per toko
		const storeMap = new Map()

		for (const item of filteredItems) {
			const product = item.product
			const store = product.store
			if (!store) continue

			if (!storeMap.has(store.id)) {
				storeMap.set(store.id, {
					id: store.id,
					name: store.name,
					slug: store.domainSlug,
					logo: store.logoUrl,
					isStar: store.isStar,
					// Alamat asal toko (untuk ongkir Biteship)
					originAreaId: store.address?.biteshipAreaId || null,
					originCityId: store.address?.cityId || null,
					originLat: store.address?.latitude || null,
					originLng: store.address?.longitude || null,
					originCityName: store.address?.cityName || null,
					originAddress: store.address?.detailAddress || null,
					enabledCouriers: store.enabledCouriers || "jne,sicepat,jnt,anteraja,ninja,lion,tiki,pos,grab,gojek",
					metaPixelId: store.metaPixelId || null,
					items: [],
				})
			}

			// Hitung harga LIVE (Zero-Trust: server yang menentukan)
			const hasVariant = !!item.variantId && !!item.variant
			const livePrice = hasVariant ? item.variant.price : product.basePrice
			const liveStock = hasVariant ? item.variant.stock : (product.baseStock || 0)

			// Label varian
			let variantLabel = null
			if (hasVariant && item.variant.attributes) {
				variantLabel = Object.values(item.variant.attributes).join(", ")
			}

			// Gambar
			const primaryImage = product.images?.find(img => img.isPrimary)
			const firstImage = product.images?.[0]
			const variantImage = hasVariant ? item.variant.imageUrl : null

			storeMap.get(store.id).items.push({
				cartItemId: item.id,
				productId: product.id,
				variantId: item.variantId,
				name: product.name,
				img: variantImage || primaryImage?.imageUrl || firstImage?.imageUrl || null,
				variant: variantLabel,
				price: livePrice,
				qty: item.quantity,
				stock: liveStock,
				weight: product.weightGram || 0,
			})
		}

		// 5. Ambil semua alamat user (untuk dipilih sebagai tujuan)
		const userAddresses = await db.select().from(addresses).where(
			and(
				eq(addresses.userId, session.user.id),
				// Hanya alamat user (bukan alamat toko)
			)
		)

		// Filter hanya alamat user (storeId null)
		const personalAddresses = userAddresses.filter(a => !a.storeId)

		// Cek cookie apakah user sudah pilih alamat tertentu
		const addressCookie = cookieStore.get(CHECKOUT_ADDRESS_COOKIE)
		let selectedAddress = null

		if (addressCookie?.value) {
			const savedAddrId = parseInt(addressCookie.value)
			selectedAddress = personalAddresses.find(a => a.id === savedAddrId) || null
		}

		// Fallback ke alamat pertama jika cookie tidak valid
		if (!selectedAddress) {
			selectedAddress = personalAddresses[0] || null
		}

		const destAreaId = selectedAddress?.biteshipAreaId || null

		// 6. Hitung opsi ongkir LIVE per toko dari Biteship
		const { getBiteshipRates } = await import("@/actions/public/biteship.actions")

		const storesData = []
		for (const store of Array.from(storeMap.values()).filter(s => s.items.length > 0)) {
			let shipping = []
			let shippingError = null

			if (destAreaId && store.originAreaId) {
				// Siapkan koordinat untuk kurir instan (Grab, Gojek)
				const originCoord = store.originLat && store.originLng
					? { lat: store.originLat, lng: store.originLng }
					: null
				const destCoord = selectedAddress?.latitude && selectedAddress?.longitude
					? { lat: selectedAddress.latitude, lng: selectedAddress.longitude }
					: null

				// Panggil Biteship Rates API (1 hit = Rp 5 per toko)
				const ratesResult = await getBiteshipRates(
					store.originAreaId,
					destAreaId,
					store.items,
					store.enabledCouriers,
					originCoord,
					destCoord
				)
				if (ratesResult.success) {
					shipping = ratesResult.data
				} else {
					shippingError = ratesResult.error
				}
			}

			storesData.push({ ...store, shipping, shippingError })
		}

		return {
			success: true,
			data: {
				stores: storesData,
				addresses: personalAddresses,
				selectedAddressId: selectedAddress?.id || null,
			},
		}
	} catch (error) {
		console.error("[getCheckoutData]", error)
		return { success: false, error: "Gagal mengambil data checkout." }
	}
}

// ============================================
// GET SHIPPING RATES (dipanggil saat user ganti alamat)
// ============================================

/**
 * Mengambil ulang tarif ongkir saat user mengganti alamat tujuan.
 * Dipanggil secara terpisah agar tidak perlu reload seluruh data checkout.
 *
 * @param {number} addressId - ID alamat tujuan yang dipilih
 * @param {Array} storeShippingRequests - [{ storeId, originAreaId, enabledCouriers, items }]
 * @returns {{ success: boolean, data?: Object<storeId, shipping[]> }}
 */
export async function getShippingRatesForAddress(addressId, storeShippingRequests) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		// Ambil alamat tujuan
		const [destAddress] = await db.select()
			.from(addresses)
			.where(eq(addresses.id, addressId))
			.limit(1)

		if (!destAddress?.biteshipAreaId) {
			return { success: false, error: "Alamat tujuan belum memiliki data wilayah Biteship." }
		}

		const { getBiteshipRates } = await import("@/actions/public/biteship.actions")

		const ratesMap = {}
		for (const req of storeShippingRequests) {
			if (!req.originAreaId) {
				ratesMap[req.storeId] = []
				continue
			}

			const result = await getBiteshipRates(
				req.originAreaId,
				destAddress.biteshipAreaId,
				req.items,
				req.enabledCouriers || "jne,sicepat,jnt,anteraja,ninja,lion,tiki,pos,grab,gojek"
			)
			ratesMap[req.storeId] = result.success ? result.data : []
		}

		return { success: true, data: ratesMap }
	} catch (error) {
		console.error("[getShippingRatesForAddress]", error)
		return { success: false, error: "Gagal mengambil tarif ongkir." }
	}
}

// ============================================
// GET PLATFORM FEE CONFIG (untuk checkout)
// ============================================

/**
 * Mengambil konfigurasi biaya platform (komisi & service fee)
 * agar bisa ditampilkan di halaman checkout sebelum pembayaran.
 */
export async function getPlatformFeeConfig() {
	try {
		// Cache 1 jam — platform settings jarang berubah
		return await cached("platform:fee-config", async () => {
			const { platformSettings } = await import("@/config/db/schema")

			const commissionRow = await db.query.platformSettings.findFirst({
				where: eq(platformSettings.key, "commission_tiers"),
			})

			const serviceFeeRow = await db.query.platformSettings.findFirst({
				where: eq(platformSettings.key, "service_fee"),
			})

			return {
				success: true,
				data: {
					commissionTiers: commissionRow ? JSON.parse(commissionRow.value) : [],
					serviceFeeConfig: serviceFeeRow ? JSON.parse(serviceFeeRow.value) : { type: "flat", value: 1000 },
				}
			}
		}, 3600) // 1 jam
	} catch (error) {
		console.error("[getPlatformFeeConfig]", error)
		return {
			success: true,
			data: {
				commissionTiers: [],
				serviceFeeConfig: { type: "flat", value: 1000 },
			}
		}
	}
}

// ============================================
// GET PAYMENT METHODS CONFIG (untuk halaman pilih metode)
// ============================================

/**
 * Mengambil daftar metode pembayaran yang aktif beserta biaya MDR.
 * Data diambil dari platform_settings (key: pg_fee_config).
 * Jika belum disetting admin, gunakan DEFAULT_PAYMENT_METHODS dari pg-fee.js.
 */
export async function getPaymentMethodsConfig() {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		// Cache 1 jam — payment methods jarang berubah
		return await cached("platform:payment-methods", async () => {
			const { platformSettings } = await import("@/config/db/schema")

			const pgRow = await db.query.platformSettings.findFirst({
				where: eq(platformSettings.key, "pg_fee_config"),
			})

			const { DEFAULT_PAYMENT_METHODS } = await import("@/lib/pg-fee")
			const methods = pgRow ? JSON.parse(pgRow.value) : DEFAULT_PAYMENT_METHODS

			const commissionRow = await db.query.platformSettings.findFirst({
				where: eq(platformSettings.key, "commission_tiers"),
			})
			const commissionTiers = commissionRow ? JSON.parse(commissionRow.value) : []

			return {
				success: true,
				data: {
					methods: methods.filter(m => m.enabled),
					commissionTiers,
				}
			}
		}, 3600) // 1 jam
	} catch (error) {
		console.error("[getPaymentMethodsConfig]", error)
		return { success: false, error: "Gagal mengambil data metode pembayaran." }
	}
}
