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

const CHECKOUT_COOKIE = "km_checkout_items"

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
									columns: { id: true, name: true, domainSlug: true, isStar: true, logoUrl: true, addressId: true },
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
					// Alamat asal toko (untuk ongkir)
					originCityId: store.address?.cityId || null,
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

		// 5. Hitung opsi ongkos kirim mock per toko (berdasarkan berat total)
		const storesData = Array.from(storeMap.values()).filter(s => s.items.length > 0).map(store => {
			const totalWeight = store.items.reduce((sum, item) => sum + (item.weight * item.qty), 0)
			return {
				...store,
				shipping: generateMockShipping(totalWeight),
			}
		})

		// 6. Ambil semua alamat user
		const userAddresses = await db.select().from(addresses).where(
			and(
				eq(addresses.userId, session.user.id),
				// Hanya alamat user (bukan alamat toko)
			)
		)

		// Filter hanya alamat user (storeId null)
		const personalAddresses = userAddresses.filter(a => !a.storeId)

		return {
			success: true,
			data: {
				stores: storesData,
				addresses: personalAddresses,
				selectedAddressId: personalAddresses[0]?.id || null,
			},
		}
	} catch (error) {
		console.error("[getCheckoutData]", error)
		return { success: false, error: "Gagal mengambil data checkout." }
	}
}

// ============================================
// MOCK SHIPPING CALCULATOR
// ============================================

/**
 * Menghitung opsi ongkos kirim berdasarkan berat.
 * Struktur data meniru response KiriminAja agar mudah diganti nanti.
 *
 * @param {number} weightGram - Total berat dalam gram
 * @returns {Array} Daftar opsi pengiriman
 */
function generateMockShipping(weightGram) {
	// Hitung berat dalam kg (pembulatan ke atas)
	const weightKg = Math.ceil(weightGram / 1000) || 1

	// Base rates per kg (meniru tarif umum ekspedisi Indonesia)
	return [
		{
			id: "reguler",
			name: "Reguler",
			courier: "J&T Express",
			service: "EZ",
			price: 9000 * weightKg,
			eta: "3-5 hari",
			etaDays: { min: 3, max: 5 },
		},
		{
			id: "express",
			name: "Express",
			courier: "JNE",
			service: "YES",
			price: 18000 * weightKg,
			eta: "1-2 hari",
			etaDays: { min: 1, max: 2 },
		},
		{
			id: "same_day",
			name: "Same Day",
			courier: "GoSend",
			service: "Instant",
			price: 25000 + (5000 * weightKg),
			eta: "Hari ini",
			etaDays: { min: 0, max: 0 },
		},
	]
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

		const { platformSettings } = await import("@/config/db/schema")

		const pgRow = await db.query.platformSettings.findFirst({
			where: eq(platformSettings.key, "pg_fee_config"),
		})

		const { DEFAULT_PAYMENT_METHODS } = await import("@/lib/pg-fee")
		const methods = pgRow ? JSON.parse(pgRow.value) : DEFAULT_PAYMENT_METHODS

		// Juga ambil commission tiers untuk kalkulasi total service fee
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
	} catch (error) {
		console.error("[getPaymentMethodsConfig]", error)
		return { success: false, error: "Gagal mengambil data metode pembayaran." }
	}
}
