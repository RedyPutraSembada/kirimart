"use server"

import { db } from "@/config/db"
import { vouchers } from "@/config/db/schema"
import { eq, and, sql } from "drizzle-orm"

/**
 * Validasi dan hitung diskon dari kode voucher yang diinput user di halaman Checkout.
 * Mendukung Voucher Toko dan Voucher Global.
 *
 * @param {string} code - Kode voucher yang dimasukkan user
 * @param {object} checkoutState - Data checkout saat ini (stores, totals, dll)
 */
export async function validateVoucherCode(code, checkoutState) {
	try {
		if (!code || typeof code !== "string") {
			return { success: false, error: "Kode voucher tidak valid." }
		}

		// 1. Cari voucher di database
		const voucher = await db.query.vouchers.findFirst({
			where: and(
				eq(vouchers.code, code.toUpperCase()),
				eq(vouchers.status, "active")
			)
		})

		if (!voucher) {
			return { success: false, error: "Voucher tidak ditemukan atau sudah tidak aktif." }
		}

		// 2. Validasi Kuota dan Tanggal
		if (voucher.usedCount >= voucher.quota) {
			return { success: false, error: "Kouta voucher ini sudah habis." }
		}

		const now = new Date()
		if (now < voucher.startDate) {
			return { success: false, error: "Voucher ini belum bisa digunakan." }
		}
		if (now > voucher.endDate) {
			return { success: false, error: "Masa berlaku voucher ini sudah habis." }
		}

		// 3. Persiapkan perhitungan berdasarkan tipe voucher
		const isGlobal = voucher.storeId === null
		let discountAmount = 0
		let targetStoreId = null

		if (isGlobal) {
			// ============================================
			// VOUCHER GLOBAL (Berlaku untuk keranjang secara keseluruhan)
			// ============================================
			
			// Hitung total belanja (semua toko)
			const grandSubtotal = checkoutState.stores.reduce((sum, store) => {
				return sum + store.items.reduce((itemSum, item) => itemSum + (item.price * item.qty), 0)
			}, 0)

			if (grandSubtotal < voucher.minPurchase) {
				return { success: false, error: `Minimal belanja Rp${voucher.minPurchase.toLocaleString("id-ID")} untuk memakai voucher ini.` }
			}

			if (voucher.discountType === "free_shipping") {
				// Hitung total ongkir
				const totalShipping = checkoutState.stores.reduce((sum, store) => {
					return sum + (store.selectedShipping?.price || 0)
				}, 0)
				
				if (totalShipping === 0) {
					return { success: false, error: "Pilih opsi pengiriman terlebih dahulu untuk menggunakan gratis ongkir." }
				}

				discountAmount = Math.min(totalShipping, voucher.discountValue)
			} 
			else if (voucher.discountType === "percentage") {
				const calculatedDiscount = grandSubtotal * (voucher.discountValue / 100)
				discountAmount = voucher.maxDiscount ? Math.min(calculatedDiscount, voucher.maxDiscount) : calculatedDiscount
			} 
			else if (voucher.discountType === "fixed") {
				discountAmount = Math.min(grandSubtotal, voucher.discountValue)
			}

		} else {
			// ============================================
			// VOUCHER TOKO (Hanya berlaku untuk toko spesifik)
			// ============================================
			targetStoreId = voucher.storeId
			
			// Cek apakah user membeli barang dari toko ini
			const targetStore = checkoutState.stores.find(s => s.id === targetStoreId)
			if (!targetStore) {
				return { success: false, error: "Voucher ini tidak berlaku untuk toko yang sedang Anda checkout." }
			}

			// Hitung subtotal HANYA untuk toko ini
			const storeSubtotal = targetStore.items.reduce((sum, item) => sum + (item.price * item.qty), 0)

			if (storeSubtotal < voucher.minPurchase) {
				return { success: false, error: `Minimal belanja Rp${voucher.minPurchase.toLocaleString("id-ID")} di toko ini untuk memakai voucher.` }
			}

			if (voucher.discountType === "free_shipping") {
				// Gratis ongkir hanya untuk ongkir toko ini
				const storeShipping = targetStore.selectedShipping?.price || 0
				if (storeShipping === 0) {
					return { success: false, error: "Pilih opsi pengiriman untuk toko ini terlebih dahulu." }
				}
				discountAmount = Math.min(storeShipping, voucher.discountValue)
			}
			else if (voucher.discountType === "percentage") {
				const calculatedDiscount = storeSubtotal * (voucher.discountValue / 100)
				discountAmount = voucher.maxDiscount ? Math.min(calculatedDiscount, voucher.maxDiscount) : calculatedDiscount
			}
			else if (voucher.discountType === "fixed") {
				discountAmount = Math.min(storeSubtotal, voucher.discountValue)
			}
		}

		// Pastikan diskon dibulatkan (tidak ada koma)
		discountAmount = Math.floor(discountAmount)

		return {
			success: true,
			data: {
				voucher: {
					id: voucher.id,
					code: voucher.code,
					name: voucher.name,
					type: voucher.discountType,
					isGlobal,
					targetStoreId
				},
				discountAmount
			}
		}

	} catch (error) {
		console.error("[validateVoucherCode]", error)
		return { success: false, error: "Terjadi kesalahan saat memvalidasi voucher." }
	}
}
