"use server"

import { db } from "@/config/db"
import { stores, products, productImages, categories } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike } from "drizzle-orm"
import { headers } from "next/headers"
import { createProductSchema } from "@/lib/validations/seller-dashboard/product/product"

export async function getCategories() {
	try {
		let allCategories = await db.select().from(categories)

		// Auto-seed if empty
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
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		// Validasi ulang dengan Zod di server
		const parsed = createProductSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data produk tidak valid" }
		}

		const validData = parsed.data

		// Cari toko milik penjual yang sedang login
		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan. Silakan buka toko terlebih dahulu." }
		}

		// Masukkan data produk ke tabel products
		const [newProduct] = await db.insert(products).values({
			storeId: store.id,
			categoryId: validData.categoryId,
			name: validData.name,
			price: validData.price,
			stock: validData.stock,
			weightGram: validData.weightGram,
			status: validData.status,
			description: validData.description,
		}).returning()

		// Masukkan data gambar ke tabel product_images
		if (validData.images && validData.images.length > 0) {
			const imagesToInsert = validData.images.map((url, idx) => ({
				productId: newProduct.id,
				imageUrl: url,
				isPrimary: idx === 0, // Gambar pertama jadikan utama
			}))

			await db.insert(productImages).values(imagesToInsert)
		}

		return { success: true }
	} catch (error) {
		console.error("createProductAction error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menyimpan produk" }
	}
}

export async function updateProduct(productId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		const parsed = createProductSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data produk tidak valid" }
		}

		const validData = parsed.data

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan. Silakan buka toko terlebih dahulu." }
		}

		// Update data produk ke tabel products
		await db.update(products).set({
			categoryId: validData.categoryId,
			name: validData.name,
			price: validData.price,
			stock: validData.stock,
			weightGram: validData.weightGram,
			status: validData.status,
			description: validData.description,
		}).where(eq(products.id, productId))

		// Hapus gambar lama dan masukkan yang baru
		await db.delete(productImages).where(eq(productImages.productId, productId))

		if (validData.images && validData.images.length > 0) {
			const imagesToInsert = validData.images.map((url, idx) => ({
				productId: productId,
				imageUrl: url,
				isPrimary: idx === 0,
			}))

			await db.insert(productImages).values(imagesToInsert)
		}

		return { success: true }
	} catch (error) {
		console.error("updateProductAction error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menyimpan produk" }
	}
}

// export async function getSellerProducts(filters) {
// 	try {
// 		const session = await auth.api.getSession({
// 			headers: await headers()
// 		})

// 		const offset = (page - 1) * perPage

// 		if (!session) {
// 			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
// 		}

// 		// Cari toko milik penjual yang sedang login
// 		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

// 		if (!store) {
// 			return { success: false, error: "Toko tidak ditemukan" }
// 		}

// 		// Ambil semua produk milik toko tersebut beserta kategori dan gambarnya
// 		const storeProducts = await db.query.products.findMany({
// 			where: eq(products.storeId, store.id),
// 			with: {
// 				category: true,
// 				images: true,
// 			},
// 			orderBy: (products, { desc }) => [desc(products.id)],
// 		})

// 		return { success: true, data: storeProducts }
// 	} catch (error) {
// 		console.error("getSellerProducts error", error)
// 		return { success: false, error: "Gagal mengambil daftar produk toko" }
// 	}
// }

export async function getSellerProducts(filters = {}, page = 1, perPage = 10) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })

        if (!session) {
            return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
        }

        const offset = (page - 1) * perPage

        // Cari toko milik penjual yang sedang login
        const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

        if (!store) {
            return { success: false, error: "Toko tidak ditemukan" }
        }

        // 1️⃣ Base filter builder (Array conditions)
        // Wajib: Produk harus milik store ini
        const whereConditions = [eq(products.storeId, store.id)];

        // Tambahkan filter dinamis
        if (filters.name_product) {
            // Gunakan ilike untuk pencarian case-insensitive (huruf besar/kecil tidak ngaruh)
            // Catatan: Jika kamu pakai MySQL, ganti ilike dengan like
            whereConditions.push(ilike(products.name, `%${filters.name_product}%`));
        }

        // if (filters.status && filters.status.length > 0) {
        //     whereConditions.push(inArray(products.status, filters.status));
        // }

        // if (filters.categoryId) {
        //      whereConditions.push(eq(products.categoryId, filters.categoryId));
        // }

        // Gabungkan semua filter dengan AND
        const finalWhere = and(...whereConditions);

        // 2️⃣ Query total data (untuk kebutuhan pagination)
        const totalResult = await db
            .select({ value: count() })
            .from(products)
            .where(finalWhere);

        const total = totalResult[0].value;

        // 3️⃣ Query data (dengan filter, limit, offset, dan relasi)
        const storeProducts = await db.query.products.findMany({
            where: finalWhere,
            with: {
                category: true,
                images: true,
            },
            orderBy: (products, { desc }) => [desc(products.id)],
            limit: perPage,
            offset: offset,
        })

        // 4️⃣ Hitung halaman selanjutnya
        const nextPage = offset + perPage < total ? page + 1 : null

        return { 
            success: true, 
            data: storeProducts, 
            total, 
            page, 
            perPage, 
            nextPage 
        }
    } catch (error) {
        console.error("getSellerProducts error", error)
        return { success: false, error: "Gagal mengambil daftar produk toko" }
    }
}

export async function getProductById(productId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		// Cari toko milik penjual yang sedang login
		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan. Silakan buka toko terlebih dahulu." }
		}

		// Ambil semua produk milik toko tersebut beserta kategori dan gambarnya
		const product = await db.query.products.findFirst({
			where: eq(products.id, productId),
			with: {
				category: true,
				images: true,
			},
		})

		return { success: true, data: product }
	} catch (error) {
		console.error("getSellerProducts error", error)
		return { success: false, error: "Gagal mengambil daftar produk toko" }
	}
}

export async function deleteProduct(productId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		// Cari toko milik penjual yang sedang login
		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan. Silakan buka toko terlebih dahulu." }
		}

		// Hapus data produk dari tabel products
		await db.delete(products).where(eq(products.id, productId))

		return { success: true }
	} catch (error) {
		console.error("deleteProduct error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menghapus produk" }
	}
}	