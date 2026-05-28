/**
 * Public Storefront Server Actions
 *
 * Semua operasi read-only untuk storefront publik.
 * TIDAK memerlukan autentikasi — data terbuka untuk semua pengunjung.
 */
"use server"

import { db } from "@/config/db"
import { products, categories, stores } from "@/config/db/schema"
import { and, eq, gte, lte, ilike, desc, asc, count, isNull, isNotNull, ne } from "drizzle-orm"

// ============================================
// GET PUBLIC CATEGORIES
// ============================================

/**
 * Mengambil semua kategori aktif (root / level-1 saja).
 * Untuk tampilan di homepage dan sidebar katalog.
 */
export async function getPublicCategories() {
	try {
		const allCategories = await db.query.categories.findMany({
			where: eq(categories.isActive, true),
			columns: {
				id: true,
				name: true,
				slug: true,
				iconUrl: true,
				parentId: true,
			},
		})

		return { success: true, data: allCategories }
	} catch (error) {
		console.error("[getPublicCategories]", error)
		return { success: false, error: "Gagal mengambil kategori", data: [] }
	}
}

// ============================================
// GET PUBLIC PRODUCTS (Homepage — curated lists)
// ============================================

/**
 * Mengambil produk untuk homepage: flash sale, rekomendasi, dll.
 *
 * @param {{ type: 'flash_sale' | 'recommended', limit?: number }} options
 */
export async function getHomepageProducts(options = {}) {
	try {
		const { type = "recommended", limit = 15 } = options

		const baseWhere = eq(products.status, "active")

		let orderByClause
		let extraWhere

		switch (type) {
			case "flash_sale":
				// Produk yang punya originalPrice (sedang diskon)
				extraWhere = and(baseWhere, isNotNull(products.originalPrice))
				orderByClause = (p, { desc }) => [desc(p.soldCount)]
				break
			case "recommended":
			default:
				extraWhere = baseWhere
				orderByClause = (p, { desc }) => [desc(p.soldCount)]
				break
		}

		const result = await db.query.products.findMany({
			where: extraWhere,
			with: {
				images: true,
				store: {
					columns: { id: true, name: true, domainSlug: true, isStar: true },
					with: {
						address: {
							columns: { cityId: true },
						},
					},
				},
				category: {
					columns: { id: true, name: true, slug: true },
				},
			},
			orderBy: orderByClause,
			limit,
		})

		// Transform ke shape yang cocok untuk ProductCard
		const transformed = result.map(transformProductForCard)

		return { success: true, data: transformed }
	} catch (error) {
		console.error("[getHomepageProducts]", error)
		return { success: false, error: "Gagal mengambil produk", data: [] }
	}
}

// ============================================
// GET CATALOG PRODUCTS (Katalog — with filters)
// ============================================

/**
 * Mengambil produk untuk halaman katalog dengan filter, sort, pagination.
 *
 * @param {{
 *   search?: string,
 *   categoryId?: number,
 *   priceMin?: number,
 *   priceMax?: number,
 *   isStar?: boolean,
 *   hasDiscount?: boolean,
 *   sort?: 'popular' | 'newest' | 'price_asc' | 'price_desc',
 *   page?: number,
 *   perPage?: number,
 * }} filters
 */
export async function getCatalogProducts(filters = {}) {
	try {
		const {
			search,
			categoryId,
			priceMin,
			priceMax,
			sort = "popular",
			page = 1,
			perPage = 20,
		} = filters

		const offset = (page - 1) * perPage

		// Build where conditions
		const whereConditions = [eq(products.status, "active")]

		if (search) {
			whereConditions.push(ilike(products.name, `%${search}%`))
		}
		if (categoryId) {
			whereConditions.push(eq(products.categoryId, Number(categoryId)))
		}
		if (priceMin) {
			whereConditions.push(gte(products.basePrice, Number(priceMin)))
		}
		if (priceMax) {
			whereConditions.push(lte(products.basePrice, Number(priceMax)))
		}

		const finalWhere = and(...whereConditions)

		// Count total
		const totalResult = await db.select({ value: count() }).from(products).where(finalWhere)
		const total = totalResult[0].value

		// Sort
		let orderByClause
		switch (sort) {
			case "price_asc":
				orderByClause = (p, helpers) => [helpers.asc(p.basePrice)]
				break
			case "price_desc":
				orderByClause = (p, helpers) => [helpers.desc(p.basePrice)]
				break
			case "newest":
				orderByClause = (p, helpers) => [helpers.desc(p.id)]
				break
			case "popular":
			default:
				orderByClause = (p, helpers) => [helpers.desc(p.soldCount)]
				break
		}

		// Query
		const result = await db.query.products.findMany({
			where: finalWhere,
			with: {
				images: true,
				store: {
					columns: { id: true, name: true, domainSlug: true, isStar: true },
					with: {
						address: {
							columns: { cityId: true },
						},
					},
				},
				category: {
					columns: { id: true, name: true, slug: true },
				},
			},
			orderBy: orderByClause,
			limit: perPage,
			offset,
		})

		const transformed = result.map(transformProductForCard)
		const nextPage = offset + perPage < total ? page + 1 : null

		return { success: true, data: transformed, total, page, perPage, nextPage }
	} catch (error) {
		console.error("[getCatalogProducts]", error)
		return { success: false, error: "Gagal mengambil produk katalog", data: [], total: 0 }
	}
}

// ============================================
// GET PUBLIC PRODUCT BY ID (Detail page)
// ============================================

/**
 * Mengambil detail lengkap produk untuk halaman /product/[id].
 * Termasuk: images, options, variants, store + address, category.
 *
 * @param {number} id - Product ID
 */
export async function getPublicProductById(id) {
	try {
		const product = await db.query.products.findFirst({
			where: and(
				eq(products.id, Number(id)),
				eq(products.status, "active")
			),
			with: {
				category: true,
				images: true,
				options: {
					orderBy: (o, { asc }) => [asc(o.position)],
				},
				variants: true,
				store: {
					with: {
						address: true,
					},
				},
			},
		})

		if (!product) {
			return { success: false, error: "Produk tidak ditemukan" }
		}

		return { success: true, data: product }
	} catch (error) {
		console.error("[getPublicProductById]", error)
		return { success: false, error: "Gagal mengambil detail produk" }
	}
}

// ============================================
// HELPER: Transform product for ProductCard
// ============================================

function transformProductForCard(product) {
	const primaryImage = product.images?.find(img => img.isPrimary)
	const firstImage = product.images?.[0]

	return {
		id: product.id,
		name: product.name,
		price: product.basePrice,
		originalPrice: product.originalPrice,
		img: primaryImage?.imageUrl || firstImage?.imageUrl || null,
		isStar: product.store?.isStar || false,
		rating: product.rating || "5.0",
		totalReviews: product.totalReviews || 0,
		sold: formatSoldCount(product.soldCount || 0),
		soldCount: product.soldCount || 0,
		location: product.store?.address?.cityId || "Indonesia",
		cat: product.category?.name || "",
		store: product.store ? {
			name: product.store.name,
			slug: product.store.domainSlug,
			isStar: product.store.isStar,
		} : null,
	}
}

function formatSoldCount(n) {
	if (n >= 10000) return `${(n / 1000).toFixed(0)}rb+`
	if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}rb`
}

// ============================================
// GET STORE BY SLUG (Halaman Toko)
// ============================================

/**
 * Mengambil data toko beserta produk-produknya berdasarkan domainSlug.
 * 
 * @param {string} slug - Domain slug toko
 */
export async function getStoreBySlug(slug) {
	try {
		const store = await db.query.stores.findFirst({
			where: and(
				eq(stores.domainSlug, slug),
				eq(stores.status, "active")
			),
			with: {
				address: true,
				products: {
					where: eq(products.status, "active"),
					with: {
						images: true,
						category: true,
					},
					orderBy: (p, { desc }) => [desc(p.id)],
				}
			}
		})

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan" }
		}

		// Transform the products to match ProductCard expected shape
		const transformedProducts = store.products.map(p => {
			const transformed = transformProductForCard(p);
			// Attach store back since it's not nested inside products in this query
			transformed.store = {
				name: store.name,
				slug: store.domainSlug,
				isStar: store.isStar
			};
			return transformed;
		});

		const storeData = { ...store, products: transformedProducts };

		return { success: true, data: storeData }
	} catch (error) {
		console.error("[getStoreBySlug]", error)
		return { success: false, error: "Gagal mengambil data toko" }
	}
}
