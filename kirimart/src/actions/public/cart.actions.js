/**
 * Cart Server Actions
 *
 * Semua operasi CRUD keranjang belanja.
 * MEMERLUKAN autentikasi — hanya user yang login bisa mengakses.
 *
 * Prinsip Zero-Trust:
 * - Klien hanya mengirim productId, variantId, dan qty.
 * - Server yang menentukan harga, stok, dan validasi.
 */
"use server"

import { db } from "@/config/db"
import { carts, cartItems, products, productVariants, productOptions } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, sql } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Get atau Create Cart untuk user
// ============================================

async function getOrCreateCart(userId, tx = db) {
	let cart = await tx.query.carts.findFirst({
		where: eq(carts.userId, userId),
	})

	if (!cart) {
		const [newCart] = await tx.insert(carts).values({ userId }).returning()
		cart = newCart
	}

	return cart
}

// ============================================
// HELPER: Get session (reusable)
// ============================================

async function getAuthSession() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null
	return session
}

// ============================================
// GET CART SUMMARY (untuk badge Navbar)
// ============================================

/**
 * Mengembalikan total jumlah item di keranjang user.
 * Dipakai oleh Navbar untuk menampilkan badge angka.
 */
export async function getCartSummary() {
	try {
		const session = await getAuthSession()
		if (!session) return { success: true, data: { totalItems: 0 } }

		const cart = await db.query.carts.findFirst({
			where: eq(carts.userId, session.user.id),
		})

		if (!cart) return { success: true, data: { totalItems: 0 } }

		const result = await db
			.select({ total: sql`COALESCE(SUM(${cartItems.quantity}), 0)` })
			.from(cartItems)
			.where(eq(cartItems.cartId, cart.id))

		return {
			success: true,
			data: { totalItems: Number(result[0]?.total || 0) },
		}
	} catch (error) {
		console.error("[getCartSummary]", error)
		return { success: false, error: "Gagal mengambil ringkasan keranjang." }
	}
}

// ============================================
// ADD TO CART
// ============================================

/**
 * Menambahkan produk ke keranjang.
 * - Jika produk memiliki varian, variantId WAJIB diisi.
 * - Jika produk tanpa varian, variantId harus null.
 * - Jika item sudah ada di keranjang (productId + variantId sama), qty ditambahkan.
 *
 * @param {{ productId: number, variantId?: number|null, qty?: number }} params
 */
export async function addToCart({ productId, variantId = null, qty = 1 }) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		// 1. Validasi produk ada dan aktif
		const product = await db.query.products.findFirst({
			where: and(
				eq(products.id, Number(productId)),
				eq(products.status, "active")
			),
			with: {
				options: true,
				variants: true,
			},
		})

		if (!product) {
			return { success: false, error: "Produk tidak ditemukan atau tidak aktif." }
		}

		// 2. Cek apakah produk ini memiliki varian
		const hasVariants = product.options.length > 0 && product.variants.length > 0

		let availableStock = 0

		if (hasVariants) {
			// Produk memiliki varian → variantId WAJIB
			if (!variantId) {
				return { success: false, error: "Silakan pilih varian terlebih dahulu." }
			}

			// Validasi varian ada dan milik produk ini
			const variant = product.variants.find(v => v.id === Number(variantId))
			if (!variant) {
				return { success: false, error: "Varian tidak ditemukan." }
			}
			if (variant.status !== "active") {
				return { success: false, error: "Varian ini tidak tersedia." }
			}
			availableStock = variant.stock
		} else {
			// Produk tanpa varian → paksa variantId null
			variantId = null
			availableStock = product.baseStock || 0
		}

		// 3. Validasi stok
		if (availableStock <= 0) {
			return { success: false, error: "Stok produk habis." }
		}

		if (qty > availableStock) {
			return { success: false, error: `Stok tersedia hanya ${availableStock}.` }
		}

		// 4. Get atau create cart
		const cart = await getOrCreateCart(session.user.id)

		// 5. Cek apakah item sudah ada di keranjang
		const whereConditions = [
			eq(cartItems.cartId, cart.id),
			eq(cartItems.productId, Number(productId)),
		]

		// Handle null vs non-null variantId
		if (variantId) {
			whereConditions.push(eq(cartItems.variantId, Number(variantId)))
		} else {
			whereConditions.push(sql`${cartItems.variantId} IS NULL`)
		}

		const existingItem = await db.query.cartItems.findFirst({
			where: and(...whereConditions),
		})

		if (existingItem) {
			// Update qty (tambahkan, tapi jangan melebihi stok)
			const newQty = Math.min(existingItem.quantity + qty, availableStock)

			await db.update(cartItems)
				.set({ quantity: newQty })
				.where(eq(cartItems.id, existingItem.id))

			return { success: true, cartItemId: existingItem.id, message: "Jumlah barang di keranjang diperbarui." }
		}

		// 6. Insert item baru
		const [newItem] = await db.insert(cartItems).values({
			cartId: cart.id,
			productId: Number(productId),
			variantId: variantId ? Number(variantId) : null,
			quantity: Math.min(qty, availableStock),
		}).returning()

		return { success: true, cartItemId: newItem.id, message: "Berhasil ditambahkan ke keranjang!" }
	} catch (error) {
		console.error("[addToCart]", error)
		return { success: false, error: "Gagal menambahkan ke keranjang." }
	}
}

// ============================================
// GET CART DETAILS (untuk halaman /cart)
// ============================================

/**
 * Mengambil isi keranjang beserta data produk LIVE (harga terbaru).
 * Data dikelompokkan per toko (seperti Tokopedia/Shopee).
 */
export async function getCartDetails() {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

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
									columns: { id: true, name: true, domainSlug: true, isStar: true, logoUrl: true },
								},
								options: true,
								variants: true,
							},
						},
						variant: true,
					},
				},
			},
		})

		if (!cart || !cart.items || cart.items.length === 0) {
			return { success: true, data: { stores: [] } }
		}

		// Kelompokkan items per toko
		const storeMap = new Map()

		for (const item of cart.items) {
			const product = item.product
			if (!product || product.status !== "active") continue

			const store = product.store
			if (!store) continue

			if (!storeMap.has(store.id)) {
				storeMap.set(store.id, {
					id: store.id,
					name: store.name,
					slug: store.domainSlug,
					logo: store.logoUrl,
					isStar: store.isStar,
					items: [],
				})
			}

			// Hitung harga LIVE (bukan snapshot)
			const hasVariant = !!item.variantId && !!item.variant
			const livePrice = hasVariant ? item.variant.price : product.basePrice
			const liveStock = hasVariant ? item.variant.stock : (product.baseStock || 0)

			// Buat label varian dari atribut
			let variantLabel = null
			if (hasVariant && item.variant.attributes) {
				variantLabel = Object.values(item.variant.attributes).join(", ")
			}

			// Ambil gambar utama
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
				originalPrice: product.originalPrice,
				qty: item.quantity,
				stock: liveStock,
				weight: product.weightGram || 0,
				// Data untuk fitur ubah varian
				options: product.options?.map(o => ({
					id: o.id,
					name: o.name,
					values: o.values,
					displayType: o.displayType,
				})) || [],
				allVariants: product.variants?.map(v => ({
					id: v.id,
					attributes: v.attributes,
					price: v.price,
					stock: v.stock,
					status: v.status,
					imageUrl: v.imageUrl,
				})) || [],
			})
		}

		return {
			success: true,
			data: {
				stores: Array.from(storeMap.values()).filter(s => s.items.length > 0),
			},
		}
	} catch (error) {
		console.error("[getCartDetails]", error)
		return { success: false, error: "Gagal mengambil data keranjang." }
	}
}

// ============================================
// UPDATE CART ITEM QTY
// ============================================

/**
 * Update kuantitas item di keranjang.
 * @param {number} cartItemId
 * @param {'increase' | 'decrease' | number} action - 'increase', 'decrease', atau angka eksplisit
 */
export async function updateCartItemQty(cartItemId, action) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		// Ambil cart item dan validasi kepemilikan
		const item = await db.query.cartItems.findFirst({
			where: eq(cartItems.id, cartItemId),
			with: {
				cart: true,
				product: true,
				variant: true,
			},
		})

		if (!item || item.cart.userId !== session.user.id) {
			return { success: false, error: "Item tidak ditemukan." }
		}

		// Hitung stok terbaru
		const maxStock = item.variant ? item.variant.stock : (item.product.baseStock || 0)

		let newQty
		if (action === "increase") {
			newQty = item.quantity + 1
		} else if (action === "decrease") {
			newQty = item.quantity - 1
		} else {
			newQty = Number(action)
		}

		// Validasi
		if (newQty <= 0) {
			// Hapus item jika qty 0
			await db.delete(cartItems).where(eq(cartItems.id, cartItemId))
			return { success: true, message: "Item dihapus dari keranjang." }
		}

		if (newQty > maxStock) {
			return { success: false, error: `Stok tersedia hanya ${maxStock}.` }
		}

		await db.update(cartItems)
			.set({ quantity: newQty })
			.where(eq(cartItems.id, cartItemId))

		return { success: true, message: "Kuantitas diperbarui." }
	} catch (error) {
		console.error("[updateCartItemQty]", error)
		return { success: false, error: "Gagal memperbarui kuantitas." }
	}
}

// ============================================
// UPDATE CART ITEM VARIANT
// ============================================

/**
 * Mengubah varian item di keranjang.
 * Jika item dengan varian baru sudah ada, qty akan digabung.
 *
 * @param {number} cartItemId
 * @param {number} newVariantId
 */
export async function updateCartItemVariant(cartItemId, newVariantId) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const item = await db.query.cartItems.findFirst({
			where: eq(cartItems.id, cartItemId),
			with: {
				cart: true,
				product: {
					with: { variants: true },
				},
			},
		})

		if (!item || item.cart.userId !== session.user.id) {
			return { success: false, error: "Item tidak ditemukan." }
		}

		// Validasi varian baru
		const newVariant = item.product.variants.find(v => v.id === Number(newVariantId))
		if (!newVariant) {
			return { success: false, error: "Varian tidak ditemukan." }
		}
		if (newVariant.status !== "active") {
			return { success: false, error: "Varian ini tidak tersedia." }
		}

		// Cek apakah sudah ada item dengan varian baru di keranjang
		const existingItem = await db.query.cartItems.findFirst({
			where: and(
				eq(cartItems.cartId, item.cartId),
				eq(cartItems.productId, item.productId),
				eq(cartItems.variantId, Number(newVariantId)),
			),
		})

		if (existingItem && existingItem.id !== cartItemId) {
			// Merge: gabungkan qty, lalu hapus item lama
			const mergedQty = Math.min(existingItem.quantity + item.quantity, newVariant.stock)
			await db.update(cartItems)
				.set({ quantity: mergedQty })
				.where(eq(cartItems.id, existingItem.id))
			await db.delete(cartItems).where(eq(cartItems.id, cartItemId))
			return { success: true, message: "Varian diubah dan jumlah digabung." }
		}

		// Update varian pada item yang sama
		const newQty = Math.min(item.quantity, newVariant.stock)
		await db.update(cartItems)
			.set({ variantId: Number(newVariantId), quantity: newQty })
			.where(eq(cartItems.id, cartItemId))

		return { success: true, message: "Varian berhasil diubah." }
	} catch (error) {
		console.error("[updateCartItemVariant]", error)
		return { success: false, error: "Gagal mengubah varian." }
	}
}

// ============================================
// REMOVE CART ITEM
// ============================================

/**
 * Menghapus item dari keranjang.
 * @param {number} cartItemId
 */
export async function removeCartItem(cartItemId) {
	try {
		const session = await getAuthSession()
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const item = await db.query.cartItems.findFirst({
			where: eq(cartItems.id, cartItemId),
			with: { cart: true },
		})

		if (!item || item.cart.userId !== session.user.id) {
			return { success: false, error: "Item tidak ditemukan." }
		}

		await db.delete(cartItems).where(eq(cartItems.id, cartItemId))

		return { success: true, message: "Item dihapus dari keranjang." }
	} catch (error) {
		console.error("[removeCartItem]", error)
		return { success: false, error: "Gagal menghapus item." }
	}
}
