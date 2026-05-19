/**
 * Platform Fee Calculator
 * 
 * Menghitung biaya komisi platform berdasarkan tier yang dikonfigurasi admin.
 * Digunakan di checkout (frontend preview) dan payment (backend final).
 */

/**
 * Hitung komisi platform dari aturan tier.
 * 
 * @param {number} productSubtotal - Total harga produk (TANPA ongkir, TANPA diskon)
 * @param {Array} tiers - Array tier dari platform_settings
 * @returns {number} Komisi dalam Rupiah (dibulatkan)
 */
export function calculateCommission(productSubtotal, tiers) {
	if (!tiers || tiers.length === 0) return 0

	// Cari tier yang cocok berdasarkan rentang
	const tier = tiers.find(t => {
		const min = t.minAmount || 0
		const max = t.maxAmount === null || t.maxAmount === undefined ? Infinity : t.maxAmount
		return productSubtotal >= min && productSubtotal <= max
	})

	if (!tier) return 0

	let fee = 0
	if (tier.type === "flat") {
		fee = tier.value
	} else if (tier.type === "percent") {
		fee = Math.round(productSubtotal * tier.value / 100)
	}

	// Terapkan cap (batas maksimal) jika ada
	if (tier.cap !== null && tier.cap !== undefined && fee > tier.cap) {
		fee = tier.cap
	}

	return fee
}

/**
 * Hitung biaya layanan (service fee) per transaksi.
 * 
 * @param {number} subtotal - Total belanja
 * @param {{ type: 'flat'|'percent', value: number }} config
 * @returns {number}
 */
export function calculateServiceFee(subtotal, config) {
	if (!config) return 1000 // Default fallback

	if (config.type === "flat") {
		return config.value
	} else if (config.type === "percent") {
		return Math.round(subtotal * config.value / 100)
	}

	return 1000
}
