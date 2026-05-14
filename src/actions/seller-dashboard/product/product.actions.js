// actions/seller-dashboard/product/product.actions.js
"use server"

import { db } from "@/config/db"
import { stores, products, productImages, categories, productOptions, productVariants } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike } from "drizzle-orm"
import { headers } from "next/headers"
import { createProductSchema } from "@/lib/validations/seller-dashboard/product/product"

export async function getCategories() {
	try {
		let allCategories = await db.select().from(categories)

		if (allCategories.length === 0) {
			const defaultCategories = [
				{ name: "Sepatu" },
				{ name: "Pakaian" },
				{ name: "Tas" },
				{ name: "Aksesoris" },
				{ name: "Elektronik" },
			]
			await db.insert(categories).values(defaultCategories)
			allCategories = await db.select().from(categories)
		}

		return { success: true, data: allCategories }
	} catch (error) {
		console.error("getCategories error", error)
		return { success: false, error: "Gagal mengambil kategori" }
	}
}

export async function createProduct(data) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }

		const parsed = createProductSchema.safeParse(data)
		if (!parsed.success) {
			console.log("Server validation failed:", parsed.error.format())
			return { success: false, error: "Data produk tidak valid" }
		}

		const validData = parsed.data

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)
		if (!store) return { success: false, error: "Toko tidak ditemukan. Silakan buka toko terlebih dahulu." }

		return await db.transaction(async (tx) => {
			// 1. Insert produk
			const [newProduct] = await tx.insert(products).values({
				storeId: store.id,
				categoryId: validData.categoryId,
				name: validData.name,
				basePrice: validData.basePrice,
				originalPrice: validData.originalPrice ?? null,
				baseStock: validData.baseStock,
				weightGram: validData.weightGram,
				status: validData.status,
				description: validData.description,
			}).returning()

			// 2. Insert gambar
			if (validData.images?.length > 0) {
				await tx.insert(productImages).values(
					validData.images.map((url, idx) => ({
						productId: newProduct.id,
						imageUrl: url,
						isPrimary: idx === 0,
					}))
				)
			}

			// 3. Insert opsi varian (definisi menu UI)
			if (validData.hasVariants && validData.options?.length > 0) {
				await tx.insert(productOptions).values(
					validData.options.map((opt, idx) => ({
						productId: newProduct.id,
						name: opt.name,
						values: opt.values,
						displayType: opt.displayType,
						position: idx,
					}))
				)
			}

			// 4. Insert kombinasi varian yang AKTIF (ada stoknya)
			// Kombinasi yang tidak diisi user = tidak ada di DB = akan disabled di UI
			if (validData.hasVariants && validData.variants?.length > 0) {
				await tx.insert(productVariants).values(
					validData.variants.map(v => ({
						productId: newProduct.id,
						attributes: v.attributes,
						price: v.price,
						originalPrice: v.originalPrice ?? null,
						stock: v.stock,
						sku: v.sku || null,
						imageUrl: v.imageUrl || null,
					}))
				)
			}

			return { success: true }
		})
	} catch (error) {
		console.error("createProduct error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menyimpan produk" }
	}
}

export async function updateProduct(productId, data) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }

		const parsed = createProductSchema.safeParse(data)
		if (!parsed.success) return { success: false, error: "Data produk tidak valid" }

		const validData = parsed.data

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)
		if (!store) return { success: false, error: "Toko tidak ditemukan." }

		return await db.transaction(async (tx) => {
			// 1. Update produk utama
			await tx.update(products).set({
				categoryId: validData.categoryId,
				name: validData.name,
				basePrice: validData.basePrice,
				originalPrice: validData.originalPrice ?? null,
				baseStock: validData.baseStock,
				weightGram: validData.weightGram,
				status: validData.status,
				description: validData.description,
			}).where(eq(products.id, productId))

			// 2. Replace gambar
			await tx.delete(productImages).where(eq(productImages.productId, productId))
			if (validData.images?.length > 0) {
				await tx.insert(productImages).values(
					validData.images.map((url, idx) => ({
						productId,
						imageUrl: url,
						isPrimary: idx === 0,
					}))
				)
			}

			// 3. Replace opsi varian
			await tx.delete(productOptions).where(eq(productOptions.productId, productId))
			if (validData.hasVariants && validData.options?.length > 0) {
				await tx.insert(productOptions).values(
					validData.options.map((opt, idx) => ({
						productId,
						name: opt.name,
						values: opt.values,
						displayType: opt.displayType,
						position: idx,
					}))
				)
			}

			// 4. Replace varian kombinasi
			await tx.delete(productVariants).where(eq(productVariants.productId, productId))
			if (validData.hasVariants && validData.variants?.length > 0) {
				await tx.insert(productVariants).values(
					validData.variants.map(v => ({
						productId,
						attributes: v.attributes,
						price: v.price,
						originalPrice: v.originalPrice ?? null,
						stock: v.stock,
						sku: v.sku || null,
						imageUrl: v.imageUrl || null,
					}))
				)
			}

			return { success: true }
		})
	} catch (error) {
		console.error("updateProduct error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menyimpan produk" }
	}
}

export async function getSellerProducts(filters = {}, page = 1, perPage = 10) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }

		const offset = (page - 1) * perPage

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)
		if (!store) return { success: false, error: "Toko tidak ditemukan" }

		const whereConditions = [eq(products.storeId, store.id)]

		if (filters.name_product) {
			whereConditions.push(ilike(products.name, `%${filters.name_product}%`))
		}

		const finalWhere = and(...whereConditions)

		const totalResult = await db.select({ value: count() }).from(products).where(finalWhere)
		const total = totalResult[0].value

		const storeProducts = await db.query.products.findMany({
			where: finalWhere,
			with: { category: true, images: true },
			orderBy: (products, { desc }) => [desc(products.id)],
			limit: perPage,
			offset,
		})

		const nextPage = offset + perPage < total ? page + 1 : null

		return { success: true, data: storeProducts, total, page, perPage, nextPage }
	} catch (error) {
		console.error("getSellerProducts error", error)
		return { success: false, error: "Gagal mengambil daftar produk toko" }
	}
}

export async function getProductById(productId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)
		if (!store) return { success: false, error: "Toko tidak ditemukan." }

		const product = await db.query.products.findFirst({
			where: eq(products.id, productId),
			with: {
				category: true,
				images: true,
				options: { orderBy: (o, { asc }) => [asc(o.position)] },
				variants: true,
			},
		})

		return { success: true, data: product }
	} catch (error) {
		console.error("getProductById error", error)
		return { success: false, error: "Gagal mengambil produk" }
	}
}

export async function deleteProduct(productId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)
		if (!store) return { success: false, error: "Toko tidak ditemukan." }

		await db.delete(products).where(eq(products.id, productId))

		return { success: true }
	} catch (error) {
		console.error("deleteProduct error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menghapus produk" }
	}
}