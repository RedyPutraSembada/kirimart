"use server"

import { db } from "@/config/db"
import { vouchers } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike, or, isNull } from "drizzle-orm"
import { headers } from "next/headers"
import { createVoucherAdminSchema } from "@/lib/validations/admin-dashboard/voucher/voucher"

export async function getAdminVouchers(filters = {}, page = 1, perPage = 10) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		const offset = (page - 1) * perPage

		// 1. Base filter: voucher platform (storeId is null)
		const whereConditions = [isNull(vouchers.storeId)]

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
		const adminVouchers = await db.query.vouchers.findMany({
			where: finalWhere,
			orderBy: (vouchers, { desc }) => [desc(vouchers.id)],
			limit: perPage,
			offset: offset,
		})

		// 4. Hitung halaman selanjutnya
		const nextPage = offset + perPage < total ? page + 1 : null

		return {
			success: true,
			data: adminVouchers,
			total,
			page,
			perPage,
			nextPage
		}
	} catch (error) {
		console.error("getAdminVouchers error", error)
		return { success: false, error: "Gagal mengambil daftar voucher admin" }
	}
}

export async function getAdminVoucherById(voucherId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		const voucher = await db.query.vouchers.findFirst({
			where: and(eq(vouchers.id, voucherId), isNull(vouchers.storeId)),
		})

		if (!voucher) {
			return { success: false, error: "Voucher tidak ditemukan" }
		}

		return { success: true, data: voucher }
	} catch (error) {
		console.error("getAdminVoucherById error", error)
		return { success: false, error: "Gagal mengambil data voucher" }
	}
}

export async function createAdminVoucher(data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		// Validasi ulang dengan Zod di server
		const parsed = createVoucherAdminSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data voucher tidak valid" }
		}

		const validData = parsed.data

		// Masukkan data voucher ke tabel vouchers dengan storeId: null
		await db.insert(vouchers).values({
			storeId: null,
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
		console.error("createAdminVoucher error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menyimpan voucher" }
	}
}

export async function updateAdminVoucher(voucherId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		const parsed = createVoucherAdminSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data voucher tidak valid" }
		}

		const validData = parsed.data

		// Pastikan voucher ini adalah voucher global
		const existingVoucher = await db.query.vouchers.findFirst({
			where: and(eq(vouchers.id, voucherId), isNull(vouchers.storeId))
		})

		if (!existingVoucher) {
			return { success: false, error: "Voucher platform tidak ditemukan" }
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
		console.error("updateAdminVoucher error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat memperbarui voucher" }
	}
}

export async function deleteAdminVoucher(voucherId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		const existingVoucher = await db.query.vouchers.findFirst({
			where: and(eq(vouchers.id, voucherId), isNull(vouchers.storeId))
		})

		if (!existingVoucher) {
			return { success: false, error: "Voucher platform tidak ditemukan" }
		}

		// Hapus voucher
		await db.delete(vouchers).where(eq(vouchers.id, voucherId))

		return { success: true }
	} catch (error) {
		console.error("deleteAdminVoucher error", error)
		return { success: false, error: "Terjadi kesalahan pada server saat menghapus voucher" }
	}
}
