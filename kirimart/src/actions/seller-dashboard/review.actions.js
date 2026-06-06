"use server"

import { db } from "@/config/db"
import { reviews, products, stores } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, desc, sql } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Get current seller's store
// ============================================

async function getSellerStore() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null

	const store = await db.query.stores.findFirst({
		where: eq(stores.userId, session.user.id),
	})
	return store
}

// ============================================
// GET SELLER REVIEWS
// ============================================

/**
 * Mengambil semua ulasan untuk produk-produk milik toko penjual.
 * Termasuk informasi produk dan pembeli.
 */
export async function getSellerReviews() {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		// Ambil semua produk milik toko
		const storeProducts = await db.query.products.findMany({
			where: eq(products.storeId, store.id),
			columns: { id: true },
		})

		if (!storeProducts.length) {
			return { success: true, data: [] }
		}

		const productIds = storeProducts.map(p => p.id)

		// Ambil semua reviews untuk produk-produk toko ini
		const result = await db.query.reviews.findMany({
			where: sql`${reviews.productId} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`,
			orderBy: [desc(reviews.createdAt)],
			with: {
				user: {
					columns: { id: true, name: true, image: true },
				},
			},
		})

		// Ambil data produk untuk setiap review
		const productData = await db.query.products.findMany({
			where: sql`${products.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`,
			columns: { id: true, name: true },
			with: {
				images: {
					columns: { imageUrl: true, isPrimary: true },
				},
			},
		})

		const productMap = {}
		for (const p of productData) {
			const primary = p.images?.find(img => img.isPrimary)
			const first = p.images?.[0]
			productMap[p.id] = {
				name: p.name,
				imageUrl: primary?.imageUrl || first?.imageUrl || null,
			}
		}

		// Gabungkan data
		const enriched = result.map(r => ({
			id: r.id,
			rating: r.rating,
			comment: r.comment,
			imageUrl: r.imageUrl,
			sellerReply: r.sellerReply,
			sellerReplyAt: r.sellerReplyAt,
			createdAt: r.createdAt,
			user: {
				name: r.user?.name || "Pembeli",
				image: r.user?.image || null,
			},
			product: productMap[r.productId] || { name: "Produk Dihapus", imageUrl: null },
		}))

		return { success: true, data: enriched }
	} catch (error) {
		console.error("[getSellerReviews]", error)
		return { success: false, error: "Gagal mengambil ulasan." }
	}
}

// ============================================
// REPLY TO REVIEW
// ============================================

/**
 * Penjual membalas ulasan pembeli.
 * Validasi: ulasan harus milik produk dari toko penjual ini.
 *
 * @param {number} reviewId
 * @param {string} replyText
 */
export async function replyToReview(reviewId, replyText) {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		if (!replyText?.trim()) {
			return { success: false, error: "Balasan tidak boleh kosong." }
		}

		// Ambil review dan pastikan produknya milik toko ini
		const review = await db.query.reviews.findFirst({
			where: eq(reviews.id, parseInt(reviewId)),
		})

		if (!review) {
			return { success: false, error: "Ulasan tidak ditemukan." }
		}

		// Pastikan produk adalah milik toko seller
		const product = await db.query.products.findFirst({
			where: and(
				eq(products.id, review.productId),
				eq(products.storeId, store.id)
			),
		})

		if (!product) {
			return { success: false, error: "Anda tidak memiliki akses untuk membalas ulasan ini." }
		}

		// Update review dengan balasan seller
		await db.update(reviews)
			.set({
				sellerReply: replyText.trim(),
				sellerReplyAt: new Date(),
			})
			.where(eq(reviews.id, parseInt(reviewId)))

		// === REAL-TIME NOTIFICATION ke buyer ===
		try {
			const { createNotification } = await import("@/actions/public/notification.actions")
			const { wsEmit } = await import("@/lib/ws-emit")

			const notif = await createNotification(
				review.userId,
				"new_review_reply",
				"💬 Penjual Membalas Ulasan Anda",
				`Penjual membalas ulasan Anda pada produk "${product.name}".`,
				{
					reviewId: review.id,
					productId: product.id,
					productName: product.name,
					storeId: store.id,
				}
			)

			if (notif) {
				await wsEmit("notifications", `user:${review.userId}`, "notification", notif)
			}
		} catch (notifError) {
			// Notifikasi gagal tidak boleh menggagalkan proses utama
			console.warn("[replyToReview] Failed to send notification:", notifError.message)
		}

		return { success: true, message: "Balasan berhasil dikirim." }
	} catch (error) {
		console.error("[replyToReview]", error)
		return { success: false, error: "Gagal mengirim balasan." }
	}
}
