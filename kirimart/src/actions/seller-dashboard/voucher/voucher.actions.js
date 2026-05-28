"use server"

import { db } from "@/config/db"
import { stores, vouchers } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike, or } from "drizzle-orm"
import { headers } from "next/headers"
import { createVoucherSchema } from "@/lib/validations/seller-dashboard/voucher/voucher"

export async function getSellerVouchers(filters = {}, page = 1, perPage = 10) {
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

		// 1. Base filter: voucher milik toko ini
		const whereConditions = [eq(vouchers.storeId, store.id)]

		// Filter pencarian by nama atau kode
		if (filters.search) {
			whereConditions.push(
				or(
					ilike(vouchers.name, `%${filters.search}%`),
					ilike(vouchers.code, `%${filters.search}%`)
				)
			)
		}

		const finalWhere = and(...whereConditions)

		// 2. Query total (untuk pagination)
		const totalResult = await db
			.select({ value: count() })
			.from(vouchers)
			.where(finalWhere)

		const total = totalResult[0].value

		// 3. Query data (dengan limit, offset)
		const storeVouchers = await db.query.vouchers.findMany({
			where: finalWhere,
			with: {
				store: true,
			},
			orderBy: (vouchers, { desc }) => [desc(vouchers.id)],
			limit: perPage,
			offset: offset,
		})

		// 4. Hitung halaman selanjutnya
		const nextPage = offset + perPage < total ? page + 1 : null

		return {
			success: true,
			data: storeVouchers,
			total,
			page,
			perPage,
			nextPage
		}
	} catch (error) {
		console.error("getSellerVouchers error", error)
		return { success: false, error: "Gagal mengambil daftar voucher" }
	}
}

export async function getVoucherById(voucherId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan" }
		}

		const voucher = await db.query.vouchers.findFirst({
			where: eq(vouchers.id, voucherId),
			with: {
				store: true,
			},
		})

		return { success: true, data: voucher }
	} catch (error) {
		console.error("getVoucherById error", error)
		return { success: false, error: "Gagal mengambil data voucher" }
	}
}

export async function createVoucher(data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		// Validasi ulang dengan Zod di server
		const parsed = createVoucherSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data voucher tidak valid" }
		}

		const validData = parsed.data

		// Cari toko milik penjual yang sedang login
		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan. Silakan buka toko terlebih dahulu." }
		}

		// Masukkan data voucher ke tabel vouchers
		await db.insert(vouchers).values({
			storeId: store.id,
			name: validData.name,
			code: validData.code.toUpperCase(),
			discountType: validData.discountType,
			discountValue: validData.discountValue,
			maxDiscount: validData.maxDiscount || null,
			minPurchase: validData.minPurchase,
			quota: validData.quota,
			startDate: validData.startDate,
			endDate: validData.endDate,
			status: validData.status,
			imageUrl: validData.imageUrl || null,
		})

		return { success: true }
	} catch (error) {
		console.error("createVoucher error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menyimpan voucher" }
	}
}

export async function updateVoucher(voucherId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		const parsed = createVoucherSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data voucher tidak valid" }
		}

		const validData = parsed.data

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan" }
		}

		// Update data voucher
		await db.update(vouchers).set({
			name: validData.name,
			code: validData.code.toUpperCase(),
			discountType: validData.discountType,
			discountValue: validData.discountValue,
			maxDiscount: validData.maxDiscount || null,
			minPurchase: validData.minPurchase,
			quota: validData.quota,
			startDate: validData.startDate,
			endDate: validData.endDate,
			status: validData.status,
			imageUrl: validData.imageUrl || null,
		}).where(eq(vouchers.id, voucherId))

		return { success: true }
	} catch (error) {
		console.error("updateVoucher error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat memperbarui voucher" }
	}
}

export async function deleteVoucher(voucherId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Anda tidak memiliki sesi (Unauthorized)" }
		}

		const [store] = await db.select().from(stores).where(eq(stores.userId, session.user.id)).limit(1)

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan" }
		}

		// Hapus voucher
		await db.delete(vouchers).where(eq(vouchers.id, voucherId))

		return { success: true }
	} catch (error) {
		console.error("deleteVoucher error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menghapus voucher" }
	}
}
