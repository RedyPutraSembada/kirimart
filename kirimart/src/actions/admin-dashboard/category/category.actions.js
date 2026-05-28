"use server"

import { db } from "@/config/db"
import { categories, products } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike, or, isNull, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { categorySchema } from "@/lib/validations/admin-dashboard/category/category"

// Helper for admin authorization
async function isAdmin() {
	const session = await auth.api.getSession({
		headers: await headers()
	})
	if (!session || session.user.role !== "admin") {
		return false
	}
	return true
}

export async function getAdminCategories(filters = {}, page = 1, perPage = 10) {
	try {
		if (!(await isAdmin())) {
			return { success: false, error: "Akses ditolak. Hanya admin yang diizinkan." }
		}

		const offset = (page - 1) * perPage
		const whereConditions = []

		if (filters.search) {
			whereConditions.push(
				ilike(categories.name, `%${filters.search}%`)
			)
		}

		// Optional filter to only get parent categories
		if (filters.onlyParents) {
			whereConditions.push(isNull(categories.parentId))
		}

		const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

		const totalResult = await db
			.select({ value: count() })
			.from(categories)
			.where(finalWhere)

		const total = totalResult[0].value

		// We include the parent relation to display parent names
		const cats = await db.query.categories.findMany({
			where: finalWhere,
			with: {
				parent: true,
				children: true, // to know if it has subcategories
			},
			orderBy: (categories, { desc }) => [desc(categories.id)],
			limit: perPage > 0 ? perPage : undefined, // If perPage is -1, return all
			offset: perPage > 0 ? offset : undefined,
		})

		const nextPage = perPage > 0 && offset + perPage < total ? page + 1 : null

		return {
			success: true,
			data: cats,
			total,
			page,
			perPage,
			nextPage
		}
	} catch (error) {
		console.error("getAdminCategories error", error)
		return { success: false, error: "Gagal mengambil daftar kategori" }
	}
}

// Get all categories flattened, useful for dropdowns
export async function getAllCategoriesForDropdown() {
	try {
		const cats = await db.query.categories.findMany({
			orderBy: (categories, { asc }) => [asc(categories.name)],
		})
		return { success: true, data: cats }
	} catch (error) {
		console.error("getAllCategoriesForDropdown error", error)
		return { success: false, error: "Gagal mengambil kategori" }
	}
}

export async function getCategoryById(id) {
	try {
		if (!(await isAdmin())) {
			return { success: false, error: "Akses ditolak." }
		}

		const category = await db.query.categories.findFirst({
			where: eq(categories.id, id),
			with: {
				parent: true,
			},
		})

		if (!category) return { success: false, error: "Kategori tidak ditemukan" }

		return { success: true, data: category }
	} catch (error) {
		console.error("getCategoryById error", error)
		return { success: false, error: "Gagal mengambil data kategori" }
	}
}

export async function createCategory(data) {
	try {
		if (!(await isAdmin())) {
			return { success: false, error: "Akses ditolak." }
		}

		const parsed = categorySchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data kategori tidak valid" }
		}

		const validData = parsed.data

		// Check if slug already exists
		const existingSlug = await db.select().from(categories).where(eq(categories.slug, validData.slug)).limit(1)
		if (existingSlug.length > 0) {
			return { success: false, error: "Slug kategori sudah digunakan" }
		}

		await db.insert(categories).values({
			parentId: validData.parentId || null,
			name: validData.name,
			slug: validData.slug,
			iconUrl: validData.iconUrl || null,
			description: validData.description || null,
			isActive: validData.isActive,
		})

		return { success: true }
	} catch (error) {
		console.error("createCategory error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat membuat kategori" }
	}
}

export async function updateCategory(id, data) {
	try {
		if (!(await isAdmin())) {
			return { success: false, error: "Akses ditolak." }
		}

		const parsed = categorySchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data kategori tidak valid" }
		}

		const validData = parsed.data

		// Check if slug exists in OTHER categories
		const existingSlug = await db.select()
			.from(categories)
			.where(and(eq(categories.slug, validData.slug), sql`id != ${id}`))
			.limit(1)
		
		if (existingSlug.length > 0) {
			return { success: false, error: "Slug kategori sudah digunakan oleh kategori lain" }
		}

		// Prevent setting parentId to itself
		if (validData.parentId === parseInt(id)) {
			return { success: false, error: "Kategori tidak bisa menjadi parent bagi dirinya sendiri" }
		}

		await db.update(categories).set({
			parentId: validData.parentId || null,
			name: validData.name,
			slug: validData.slug,
			iconUrl: validData.iconUrl || null,
			description: validData.description || null,
			isActive: validData.isActive,
		}).where(eq(categories.id, id))

		return { success: true }
	} catch (error) {
		console.error("updateCategory error", error)
		return { success: false, error: "Terjadi kesalahan saat memperbarui kategori" }
	}
}

export async function deleteCategory(id) {
	try {
		if (!(await isAdmin())) {
			return { success: false, error: "Akses ditolak." }
		}

		// 1. Cek apakah ada produk yang memakai kategori ini
		const usedInProducts = await db.select({ value: count() }).from(products).where(eq(products.categoryId, id))
		if (usedInProducts[0].value > 0) {
			return { success: false, error: "Kategori ini tidak dapat dihapus karena sedang digunakan oleh produk." }
		}

		// 2. Cek apakah memiliki subkategori
		const usedAsParent = await db.select({ value: count() }).from(categories).where(eq(categories.parentId, id))
		if (usedAsParent[0].value > 0) {
			return { success: false, error: "Kategori ini tidak dapat dihapus karena memiliki subkategori. Hapus atau pindahkan subkategori terlebih dahulu." }
		}

		await db.delete(categories).where(eq(categories.id, id))

		return { success: true }
	} catch (error) {
		console.error("deleteCategory error", error)
		return { success: false, error: "Terjadi kesalahan saat menghapus kategori" }
	}
}
