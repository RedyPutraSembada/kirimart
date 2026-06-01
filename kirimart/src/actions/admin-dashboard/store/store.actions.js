"use server"

import { db } from "@/config/db"
import { stores } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike, or } from "drizzle-orm"
import { headers } from "next/headers"
import { banStoreSchema } from "@/lib/validations/admin-dashboard/store/store"

export async function getAdminStores(filters = {}, page = 1, perPage = 10) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		const offset = (page - 1) * perPage

		const whereConditions = []

		if (filters.search) {
			whereConditions.push(
				or(
					ilike(stores.name, `%${filters.search}%`),
					ilike(stores.domainSlug, `%${filters.search}%`)
				)
			)
		}

		if (filters.status) {
			if (filters.status === "banned") {
				whereConditions.push(eq(stores.status, "banned"))
			} else if (filters.status === "active") {
				whereConditions.push(eq(stores.status, "active"))
			}
		}

		const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

		const totalResult = await db
			.select({ value: count() })
			.from(stores)
			.where(finalWhere)

		const total = totalResult[0].value

		const storesData = await db.query.stores.findMany({
			where: finalWhere,
			with: {
				user: {
					columns: {
						id: true,
						name: true,
						email: true,
						image: true
					}
				}
			},
			limit: perPage,
			offset: offset,
		})

		const nextPage = offset + perPage < total ? page + 1 : null

		return {
			success: true,
			data: storesData,
			total,
			page,
			perPage,
			nextPage
		}
	} catch (error) {
		console.error("getAdminStores error", error)
		return { success: false, error: "Gagal mengambil daftar toko" }
	}
}

export async function banStoreAction(storeId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		const parsed = banStoreSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data tidak valid" }
		}

		await db.update(stores).set({
			status: "banned",
			bannedReason: parsed.data.banReason || null,
		}).where(eq(stores.id, storeId))

		return { success: true }
	} catch (error) {
		console.error("banStoreAction error", error)
		return { success: false, error: "Gagal memblokir toko" }
	}
}

export async function unbanStoreAction(storeId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		await db.update(stores).set({
			status: "active",
			bannedReason: null,
		}).where(eq(stores.id, storeId))

		return { success: true }
	} catch (error) {
		console.error("unbanStoreAction error", error)
		return { success: false, error: "Gagal membuka blokir toko" }
	}
}

export async function deleteStoreAction(storeId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		// Hapus permanen toko, akan cascade jika disetting cascade, tapi sebaiknya dipastikan
		await db.delete(stores).where(eq(stores.id, storeId))

		return { success: true }
	} catch (error) {
		console.error("deleteStoreAction error", error)
		return { success: false, error: "Gagal menghapus toko secara permanen" }
	}
}

export async function verifyStoreAction(storeId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		await db.update(stores).set({
			isVerified: true,
		}).where(eq(stores.id, storeId))

		return { success: true }
	} catch (error) {
		console.error("verifyStoreAction error", error)
		return { success: false, error: "Gagal memverifikasi toko" }
	}
}

export async function unverifyStoreAction(storeId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		await db.update(stores).set({
			isVerified: false,
		}).where(eq(stores.id, storeId))

		return { success: true }
	} catch (error) {
		console.error("unverifyStoreAction error", error)
		return { success: false, error: "Gagal mencabut verifikasi toko" }
	}
}
