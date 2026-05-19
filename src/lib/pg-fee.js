/**
 * Payment Gateway Fee Calculator
 * 
 * Menghitung biaya MDR (Merchant Discount Rate) per metode pembayaran,
 * termasuk PPN 12%, dan menggabungkannya dengan komisi platform
 * menjadi satu angka "Biaya Layanan & Penanganan".
 */

import { calculateCommission } from "@/lib/platform-fee"

// PPN rate (12%)
const PPN_RATE = 0.12

/**
 * Daftar metode pembayaran default beserta konfigurasi charge ke Midtrans.
 * Ini digunakan sebagai fallback jika admin belum setting di database.
 * 
 * Properti:
 * - id: ID unik untuk identifikasi
 * - label: Nama tampil di UI
 * - group: Kategori untuk grouping di UI
 * - paymentType: Nilai `payment_type` untuk Midtrans Core API
 * - bankCode: Kode bank (jika payment_type = bank_transfer)
 * - feeType: "flat" | "percent" | "flat_percent"
 * - feeFlat: Nominal flat fee (sebelum PPN)
 * - feePercent: Persentase fee
 * - enabled: Apakah aktif
 * - icon: Emoji atau identifier icon
 */
export const DEFAULT_PAYMENT_METHODS = [
	// Bank Transfer (VA)
	{
		id: "bca_va",
		label: "BCA Virtual Account",
		group: "Bank Transfer",
		paymentType: "bank_transfer",
		bankCode: "bca",
		feeType: "flat",
		feeFlat: 4000,
		feePercent: 0,
		enabled: true,
		icon: "🏦",
	},
	{
		id: "bni_va",
		label: "BNI Virtual Account",
		group: "Bank Transfer",
		paymentType: "bank_transfer",
		bankCode: "bni",
		feeType: "flat",
		feeFlat: 4000,
		feePercent: 0,
		enabled: true,
		icon: "🏦",
	},
	{
		id: "bri_va",
		label: "BRI Virtual Account",
		group: "Bank Transfer",
		paymentType: "bank_transfer",
		bankCode: "bri",
		feeType: "flat",
		feeFlat: 4000,
		feePercent: 0,
		enabled: true,
		icon: "🏦",
	},
	{
		id: "mandiri_bill",
		label: "Mandiri Bill Payment",
		group: "Bank Transfer",
		paymentType: "echannel",
		bankCode: null,
		feeType: "flat",
		feeFlat: 4000,
		feePercent: 0,
		enabled: true,
		icon: "🏦",
	},
	{
		id: "permata_va",
		label: "Permata Virtual Account",
		group: "Bank Transfer",
		paymentType: "bank_transfer",
		bankCode: "permata",
		feeType: "flat",
		feeFlat: 4000,
		feePercent: 0,
		enabled: true,
		icon: "🏦",
	},
	{
		id: "cimb_va",
		label: "CIMB Niaga Virtual Account",
		group: "Bank Transfer",
		paymentType: "bank_transfer",
		bankCode: "cimb",
		feeType: "flat",
		feeFlat: 4000,
		feePercent: 0,
		enabled: true,
		icon: "🏦",
	},

	// E-Wallet
	{
		id: "gopay",
		label: "GoPay",
		group: "E-Wallet",
		paymentType: "gopay",
		bankCode: null,
		feeType: "percent",
		feeFlat: 0,
		feePercent: 2,
		enabled: true,
		icon: "💚",
	},
	{
		id: "shopeepay",
		label: "ShopeePay",
		group: "E-Wallet",
		paymentType: "shopeepay",
		bankCode: null,
		feeType: "percent",
		feeFlat: 0,
		feePercent: 2,
		enabled: true,
		icon: "🧡",
	},

	// QRIS
	{
		id: "qris",
		label: "QRIS (Semua E-Wallet)",
		group: "QRIS",
		paymentType: "qris",
		bankCode: null,
		feeType: "percent",
		feeFlat: 0,
		feePercent: 0.7,
		enabled: true,
		icon: "📱",
	},
]

/**
 * Hitung biaya PG (MDR) berdasarkan konfigurasi metode pembayaran.
 * Hasilnya SUDAH TERMASUK PPN 12%.
 * 
 * @param {number} grossAmount - Total belanja (subtotal + ongkir, sebelum PG fee)
 * @param {object} methodConfig - Konfigurasi metode: { feeType, feeFlat, feePercent }
 * @returns {number} Biaya PG sudah termasuk PPN (dibulatkan ke atas)
 */
export function calculatePgFee(grossAmount, methodConfig) {
	if (!methodConfig) return 0

	let baseFee = 0

	switch (methodConfig.feeType) {
		case "flat":
			baseFee = methodConfig.feeFlat || 0
			break
		case "percent":
			baseFee = Math.ceil(grossAmount * (methodConfig.feePercent || 0) / 100)
			break
		case "flat_percent":
			baseFee = (methodConfig.feeFlat || 0) + Math.ceil(grossAmount * (methodConfig.feePercent || 0) / 100)
			break
		default:
			baseFee = 0
	}

	// Tambahkan PPN 12%
	const feeWithPpn = Math.ceil(baseFee * (1 + PPN_RATE))

	return feeWithPpn
}

/**
 * Hitung total "Biaya Layanan & Penanganan" yang digabungkan:
 * = Komisi Platform + Biaya PG (termasuk PPN)
 * 
 * Ini adalah angka yang ditampilkan di UI checkout sebagai satu baris.
 * 
 * @param {number} productSubtotal - Total harga produk (tanpa ongkir)
 * @param {Array} commissionTiers - Tier komisi dari platform settings
 * @param {object|null} pgMethodConfig - Konfigurasi metode pembayaran (null jika belum dipilih)
 * @param {number} grossBeforePgFee - Total sebelum PG fee (subtotal + ongkir - diskon) untuk kalkulasi PG percent
 * @returns {{ total: number, breakdown: { commission: number, pgFee: number } }}
 */
export function calculateTotalServiceFee(productSubtotal, commissionTiers, pgMethodConfig = null, grossBeforePgFee = 0) {
	const commission = calculateCommission(productSubtotal, commissionTiers)
	const pgFee = pgMethodConfig ? calculatePgFee(grossBeforePgFee, pgMethodConfig) : 0

	return {
		total: commission + pgFee,
		breakdown: {
			commission,
			pgFee,
		},
	}
}

/**
 * Cari konfigurasi metode pembayaran berdasarkan ID.
 * Pertama cek di data admin (dari DB), fallback ke default.
 * 
 * @param {string} methodId - ID metode (e.g. "bca_va", "gopay")
 * @param {Array} adminMethods - Data metode dari platform settings (optional)
 * @returns {object|null} Konfigurasi metode, atau null jika tidak ditemukan
 */
export function findPaymentMethod(methodId, adminMethods = null) {
	// Prioritas: data admin dari DB
	if (adminMethods && Array.isArray(adminMethods)) {
		const found = adminMethods.find(m => m.id === methodId && m.enabled)
		if (found) return found
	}

	// Fallback: default
	return DEFAULT_PAYMENT_METHODS.find(m => m.id === methodId && m.enabled) || null
}

/**
 * Ambil semua metode pembayaran yang aktif (untuk ditampilkan di UI).
 * 
 * @param {Array} adminMethods - Data dari platform settings
 * @returns {Array} Metode yang enabled, di-group berdasarkan kategori
 */
export function getEnabledPaymentMethods(adminMethods = null) {
	const methods = adminMethods && Array.isArray(adminMethods) && adminMethods.length > 0
		? adminMethods
		: DEFAULT_PAYMENT_METHODS

	return methods.filter(m => m.enabled)
}

/**
 * Kelompokkan metode pembayaran berdasarkan group untuk tampilan UI.
 * 
 * @param {Array} methods - Array metode pembayaran
 * @returns {Array<{ group: string, methods: Array }>}
 */
export function groupPaymentMethods(methods) {
	const grouped = {}
	for (const m of methods) {
		if (!grouped[m.group]) {
			grouped[m.group] = []
		}
		grouped[m.group].push(m)
	}
	return Object.entries(grouped).map(([group, methods]) => ({ group, methods }))
}
