"use server"

import { db } from "@/config/db"
import { products } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike } from "drizzle-orm"
import { headers } from "next/headers"
import { banProductSchema } from "@/lib/validations/admin-dashboard/product/product"

export async function getAdminProducts(filters = {}, page = 1, perPage = 10) {
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
			whereConditions.push(ilike(products.name, `%${filters.search}%`))
		}

		if (filters.status) {
			if (filters.status === "banned") {
				whereConditions.push(eq(products.status, "banned"))
			} else if (filters.status === "active") {
				whereConditions.push(eq(products.status, "active"))
			} else if (filters.status !== "all") {
				whereConditions.push(eq(products.status, filters.status))
			}
		}

		const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

		const totalResult = await db
			.select({ value: count() })
			.from(products)
			.where(finalWhere)

		const total = totalResult[0].value

		const productsData = await db.query.products.findMany({
			where: finalWhere,
			with: {
				store: {
					columns: {
						id: true,
						name: true,
						domainSlug: true
					}
				},
				category: {
					columns: {
						id: true,
						name: true
					}
				},
				images: {
					where: (images, { eq }) => eq(images.isPrimary, true),
					limit: 1
				}
			},
			limit: perPage,
			offset: offset,
			orderBy: (products, { desc }) => [desc(products.id)],
		})

		const nextPage = offset + perPage < total ? page + 1 : null

		return {
			success: true,
			data: productsData,
			total,
			page,
			perPage,
			nextPage
		}
	} catch (error) {
		console.error("getAdminProducts error", error)
		return { success: false, error: "Gagal mengambil daftar produk" }
	}
}

export async function banProductAction(productId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		const parsed = banProductSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data tidak valid" }
		}

		await db.update(products).set({
			status: "banned",
			bannedReason: parsed.data.banReason || null,
		}).where(eq(products.id, productId))

		return { success: true }
	} catch (error) {
		console.error("banProductAction error", error)
		return { success: false, error: "Gagal memblokir produk" }
	}
}

export async function unbanProductAction(productId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		await db.update(products).set({
			status: "inactive", // Mengembalikan ke inactive agar penjual bisa review ulang sebelum mengaktifkan
			bannedReason: null,
		}).where(eq(products.id, productId))

		return { success: true }
	} catch (error) {
		console.error("unbanProductAction error", error)
		return { success: false, error: "Gagal membuka blokir produk" }
	}
}

export async function deleteProductAction(productId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		await db.delete(products).where(eq(products.id, productId))

		return { success: true }
	} catch (error) {
		console.error("deleteProductAction error", error)
		return { success: false, error: "Gagal menghapus produk secara permanen" }
	}
}
