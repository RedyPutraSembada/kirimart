/**
 * Search Server Actions
 *
 * Aksi server khusus untuk fitur pencarian produk.
 * - searchProductsAutocomplete: ringan, max 5 hasil untuk dropdown navbar
 * - searchProducts: lengkap dengan pagination untuk halaman katalog
 */
"use server"

import { db } from "@/config/db"
import { products } from "@/config/db/schema"
import { and, eq, ilike, desc, count } from "drizzle-orm"
import { headers } from "next/headers"
import { checkRateLimit } from "@/lib/rate-limit"

// ============================================
// AUTOCOMPLETE (Navbar Search Bar)
// ============================================

/**
 * Mencari produk untuk autocomplete dropdown di navbar.
 * Sangat ringan — hanya mengambil max 5 produk (id, nama, harga, gambar).
 *
 * @param {string} keyword - Kata kunci pencarian
 * @returns {{ success: boolean, data: Array }}
 */
export async function searchProductsAutocomplete(keyword) {
	try {
		const ip = (await headers()).get("x-forwarded-for") || "unknown-ip"
		const rateLimit = await checkRateLimit(`search_ac:${ip}`, 30, 60)
		if (!rateLimit.success) {
			return { success: false, data: [], error: "Terlalu banyak pencarian" }
		}

		if (!keyword || keyword.trim().length < 2) {
			return { success: true, data: [] }
		}

		const result = await db.query.products.findMany({
			where: and(
				eq(products.status, "active"),
				ilike(products.name, `%${keyword.trim()}%`)
			),
			columns: {
				id: true,
				name: true,
				basePrice: true,
				originalPrice: true,
			},
			with: {
				images: {
					where: (img, { eq }) => eq(img.isPrimary, true),
					limit: 1,
					columns: { imageUrl: true },
				},
				store: {
					columns: { name: true, domainSlug: true },
				},
			},
			orderBy: [desc(products.visibilityScore)],
			limit: 5,
		})

		return { success: true, data: result }
	} catch (error) {
		console.error("[searchProductsAutocomplete]", error)
		return { success: false, error: "Gagal mencari produk", data: [] }
	}
}

// ============================================
// FULL SEARCH WITH PAGINATION (Katalog Page)
// ============================================

/**
 * Mencari produk dengan pagination untuk halaman katalog.
 * Digunakan bersama useInfiniteQuery.
 *
 * @param {{ keyword: string, page: number, perPage: number }} params
 * @returns {{ success: boolean, data: Array, total: number, nextPage: number|null }}
 */
export async function searchProducts({ keyword = "", page = 1, perPage = 20 } = {}) {
	try {
		const ip = (await headers()).get("x-forwarded-for") || "unknown-ip"
		const rateLimit = await checkRateLimit(`search:${ip}`, 20, 60)
		if (!rateLimit.success) {
			return { success: false, data: [], error: "Terlalu banyak pencarian. Harap tunggu sebentar." }
		}

		const offset = (page - 1) * perPage

		const whereConditions = [eq(products.status, "active")]
		if (keyword.trim()) {
			whereConditions.push(ilike(products.name, `%${keyword.trim()}%`))
		}

		const finalWhere = and(...whereConditions)

		// Count total
		const totalResult = await db.select({ value: count() }).from(products).where(finalWhere)
		const total = totalResult[0].value

		// Fetch data
		const result = await db.query.products.findMany({
			where: finalWhere,
			with: {
				images: true,
				store: {
					columns: { id: true, name: true, domainSlug: true, isStar: true },
					with: {
						address: { columns: { cityId: true } },
					},
				},
				category: {
					columns: { id: true, name: true, slug: true },
				},
			},
			orderBy: [desc(products.visibilityScore)],
			limit: perPage,
			offset,
		})

		const nextPage = offset + perPage < total ? page + 1 : null

		return { success: true, data: result, total, page, perPage, nextPage }
	} catch (error) {
		console.error("[searchProducts]", error)
		return { success: false, error: "Gagal mencari produk", data: [], total: 0, nextPage: null }
	}
}
