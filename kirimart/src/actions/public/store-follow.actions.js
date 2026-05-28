"use server"

import { db } from "@/config/db"
import { stores, storeFollowers } from "@/config/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

/**
 * Toggle follow/unfollow toko.
 * Jika belum mengikuti → follow, jika sudah → unfollow.
 * Otomatis update followerCount di tabel stores.
 */
export async function toggleFollowStore(storeId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu." }
		}

		const userId = session.user.id

		// Cek apakah sudah follow
		const existing = await db.query.storeFollowers.findFirst({
			where: and(
				eq(storeFollowers.userId, userId),
				eq(storeFollowers.storeId, storeId)
			),
		})

		if (existing) {
			// Unfollow
			await db.transaction(async (tx) => {
				await tx.delete(storeFollowers)
					.where(and(
						eq(storeFollowers.userId, userId),
						eq(storeFollowers.storeId, storeId)
					))

				await tx.update(stores)
					.set({ followerCount: sql`GREATEST(follower_count - 1, 0)` })
					.where(eq(stores.id, storeId))
			})

			return { success: true, isFollowing: false, message: "Berhenti mengikuti toko." }
		} else {
			// Follow
			await db.transaction(async (tx) => {
				await tx.insert(storeFollowers).values({
					userId,
					storeId,
				})

				await tx.update(stores)
					.set({ followerCount: sql`follower_count + 1` })
					.where(eq(stores.id, storeId))
			})

			return { success: true, isFollowing: true, message: "Berhasil mengikuti toko!" }
		}
	} catch (error) {
		console.error("[toggleFollowStore]", error)
		return { success: false, error: "Gagal memproses permintaan." }
	}
}

/**
 * Cek apakah user saat ini mengikuti toko tertentu.
 */
export async function checkIsFollowingStore(storeId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { isFollowing: false }
		}

		const existing = await db.query.storeFollowers.findFirst({
			where: and(
				eq(storeFollowers.userId, session.user.id),
				eq(storeFollowers.storeId, storeId)
			),
		})

		return { isFollowing: !!existing }
	} catch (error) {
		return { isFollowing: false }
	}
}
