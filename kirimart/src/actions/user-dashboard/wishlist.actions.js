"use server"

import { db } from "@/config/db"
import { wishlists } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { and, eq, desc } from "drizzle-orm"

/**
 * Toggle wishlist — tambah ke favorit jika belum ada, hapus jika sudah ada.
 * Mengikuti pola toggleFollowStore() di store-follow.actions.js
 */
export async function toggleWishlist(productId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu.", requireLogin: true }
		}

		const userId = session.user.id

		// Cek apakah sudah ada di wishlist
		const existing = await db.query.wishlists.findFirst({
			where: and(
				eq(wishlists.userId, userId),
				eq(wishlists.productId, productId)
			),
		})

		if (existing) {
			// Hapus dari wishlist
			await db.delete(wishlists)
				.where(and(
					eq(wishlists.userId, userId),
					eq(wishlists.productId, productId)
				))
			return { success: true, isWishlisted: false, message: "Produk dihapus dari favorit." }
		} else {
			// Tambah ke wishlist
			await db.insert(wishlists).values({ userId, productId })
			return { success: true, isWishlisted: true, message: "Produk ditambahkan ke favorit!" }
		}
	} catch (error) {
		console.error("[toggleWishlist]", error)
		return { success: false, error: "Gagal memproses permintaan." }
	}
}

/**
 * Cek apakah user sudah menambahkan produk ke wishlist.
 * Digunakan untuk inisialisasi status tombol ❤️.
 */
export async function checkIsWishlisted(productId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { isWishlisted: false }

		const existing = await db.query.wishlists.findFirst({
			where: and(
				eq(wishlists.userId, session.user.id),
				eq(wishlists.productId, productId)
			),
		})

		return { isWishlisted: !!existing }
	} catch {
		return { isWishlisted: false }
	}
}

/**
 * Ambil semua produk favorit milik user yang sedang login,
 * beserta detail produk (nama, harga, gambar, rating).
 */
export async function getUserWishlists() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const data = await db.query.wishlists.findMany({
			where: eq(wishlists.userId, session.user.id),
			orderBy: [desc(wishlists.createdAt)],
			with: {
				product: {
					with: {
						images: { limit: 1 },
						store: { columns: { name: true, city: true } },
					},
				},
			},
		})

		return { success: true, data }
	} catch (error) {
		console.error("[getUserWishlists]", error)
		return { success: false, error: "Gagal mengambil data wishlist." }
	}
}
