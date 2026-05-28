"use server"

import { db } from "@/config/db"
import { reviews, products } from "@/config/db/schema"
import { eq, desc, sql } from "drizzle-orm"

// ============================================
// GET PRODUCT REVIEWS (public, paginated)
// ============================================

/**
 * Mengambil daftar ulasan sebuah produk.
 * Nama pembeli di-masking untuk privasi (misalnya "Budi" → "B***i").
 *
 * @param {number} productId
 * @param {{ page?: number, limit?: number }} options
 */
export async function getProductReviews(productId, options = {}) {
	try {
		const { page = 1, limit = 5 } = options
		const offset = (page - 1) * limit

		const result = await db.query.reviews.findMany({
			where: eq(reviews.productId, Number(productId)),
			orderBy: [desc(reviews.createdAt)],
			with: {
				user: {
					columns: { id: true, name: true, image: true },
				},
			},
			limit,
			offset,
		})

		// Count total
		const [countResult] = await db
			.select({ total: sql`COUNT(*)::int` })
			.from(reviews)
			.where(eq(reviews.productId, Number(productId)))

		const total = countResult?.total || 0
		const totalPages = Math.ceil(total / limit)

		// Masking nama pembeli untuk privasi
		const masked = result.map((r) => ({
			id: r.id,
			rating: r.rating,
			comment: r.comment,
			imageUrl: r.imageUrl,
			sellerReply: r.sellerReply,
			sellerReplyAt: r.sellerReplyAt,
			createdAt: r.createdAt,
			user: {
				name: maskName(r.user?.name),
				image: r.user?.image || null,
			},
		}))

		return {
			success: true,
			data: masked,
			total,
			page,
			totalPages,
			hasMore: page < totalPages,
		}
	} catch (error) {
		console.error("[getProductReviews]", error)
		return { success: false, error: "Gagal mengambil ulasan", data: [] }
	}
}

// ============================================
// GET PRODUCT REVIEW STATS (histogram bintang)
// ============================================

/**
 * Mengambil distribusi bintang (1-5) untuk sebuah produk.
 * Digunakan untuk menampilkan histogram rating di detail produk.
 *
 * @param {number} productId
 */
export async function getProductReviewStats(productId) {
	try {
		// Ambil rating dan totalReviews dari tabel produk (sudah di-cache)
		const product = await db.query.products.findFirst({
			where: eq(products.id, Number(productId)),
			columns: { rating: true, totalReviews: true },
		})

		// Hitung distribusi per bintang
		const distribution = await db
			.select({
				rating: reviews.rating,
				count: sql`COUNT(*)::int`,
			})
			.from(reviews)
			.where(eq(reviews.productId, Number(productId)))
			.groupBy(reviews.rating)

		// Transform ke format { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
		const stars = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
		for (const row of distribution) {
			stars[row.rating] = row.count
		}

		return {
			success: true,
			data: {
				avgRating: parseFloat(product?.rating || "5.0"),
				totalReviews: product?.totalReviews || 0,
				stars,
			},
		}
	} catch (error) {
		console.error("[getProductReviewStats]", error)
		return { success: false, error: "Gagal mengambil statistik ulasan" }
	}
}

// ============================================
// HELPER: Masking nama pembeli
// ============================================

/**
 * "Budi Santoso" → "B***i S*****o"
 * "A" → "A"
 */
function maskName(name) {
	if (!name) return "Pembeli"
	return name
		.split(" ")
		.map((word) => {
			if (word.length <= 2) return word
			return word[0] + "*".repeat(word.length - 2) + word[word.length - 1]
		})
		.join(" ")
}
