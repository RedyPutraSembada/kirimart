/**
 * Midtrans Payment Gateway Helper
 * 
 * Menggunakan raw fetch API — tanpa dependency eksternal.
 * Library ini menghandle:
 * - Pembuatan Snap token (dengan Basic Auth + Base64 encoding)
 * - Verifikasi signature webhook (SHA512)
 * - Pengecekan status transaksi
 */

import { env } from '@/config/env'
import crypto from 'crypto'

// ============================================
// KONFIGURASI
// ============================================

const isProduction = env.MIDTRANS_IS_PRODUCTION === 'true'
const serverKey = env.MIDTRANS_SERVER_KEY

const SNAP_API_URL = isProduction
	? 'https://app.midtrans.com/snap/v1/transactions'
	: 'https://app.sandbox.midtrans.com/snap/v1/transactions'

const API_BASE_URL = isProduction
	? 'https://api.midtrans.com'
	: 'https://api.sandbox.midtrans.com'

// ============================================
// HELPER: Authorization Header
// ============================================

/**
 * Midtrans menggunakan HTTP Basic Auth.
 * Format: Base64(ServerKey + ":")
 * 
 * Contoh: jika ServerKey = "SB-Mid-server-xxx"
 * Maka: Base64("SB-Mid-server-xxx:") → "U0ItTWlkLXNlcnZlci14eHg6"
 * Header: "Basic U0ItTWlkLXNlcnZlci14eHg6"
 */
function getAuthHeader() {
	return 'Basic ' + Buffer.from(serverKey + ':').toString('base64')
}

// ============================================
// CREATE SNAP TRANSACTION
// ============================================

/**
 * Membuat transaksi Snap dan mendapatkan token + redirect URL.
 * 
 * @param {Object} parameter - Parameter transaksi Midtrans
 * @param {Object} parameter.transaction_details - { order_id, gross_amount }
 * @param {Object} parameter.customer_details - { first_name, email, phone }
 * @param {Array} parameter.item_details - Array of { id, price, quantity, name }
 * @returns {Promise<{ token: string, redirect_url: string }>}
 */
export async function createSnapTransaction(parameter) {
	const response = await fetch(SNAP_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'Authorization': getAuthHeader(),
		},
		body: JSON.stringify(parameter),
	})

	const data = await response.json()

	if (!response.ok) {
		console.error('[MIDTRANS] Snap API error:', data)
		const errorMessage = data.error_messages
			? data.error_messages.join(', ')
			: 'Gagal membuat transaksi pembayaran'
		throw new Error(errorMessage)
	}

	return data // { token, redirect_url }
}

// ============================================
// VERIFY WEBHOOK SIGNATURE
// ============================================

/**
 * Memverifikasi bahwa webhook notification benar dari Midtrans.
 * 
 * Formula: SHA512(order_id + status_code + gross_amount + ServerKey)
 * Hasil hash dibandingkan dengan signature_key di payload.
 * 
 * @param {Object} notification - JSON payload dari webhook Midtrans
 * @returns {boolean} true jika signature valid
 */
export function verifySignatureKey(notification) {
	const { order_id, status_code, gross_amount, signature_key } = notification

	if (!order_id || !status_code || !gross_amount || !signature_key) {
		return false
	}

	const input = order_id + status_code + gross_amount + serverKey
	const calculatedSignature = crypto
		.createHash('sha512')
		.update(input)
		.digest('hex')

	return calculatedSignature === signature_key
}

// ============================================
// GET TRANSACTION STATUS
// ============================================

/**
 * Mengambil status transaksi terkini langsung dari Midtrans.
 * Berguna sebagai double-check / fallback jika webhook bermasalah.
 * 
 * @param {string} orderId - Order ID yang dikirim ke Midtrans
 * @returns {Promise<Object>} Status transaksi dari Midtrans
 */
export async function getTransactionStatus(orderId) {
	const response = await fetch(`${API_BASE_URL}/v2/${orderId}/status`, {
		headers: {
			'Accept': 'application/json',
			'Authorization': getAuthHeader(),
		},
	})

	return response.json()
}

// ============================================
// MAP TRANSACTION STATUS
// ============================================

/**
 * Menerjemahkan transaction_status + fraud_status dari Midtrans
 * menjadi status internal payment kita.
 * 
 * @param {string} transactionStatus - Status dari Midtrans (capture, settlement, pending, dll)
 * @param {string} fraudStatus - Fraud status (accept, challenge, deny)
 * @returns {string} Status internal: paid, pending, cancelled, refunded, failed
 */
export function mapTransactionStatus(transactionStatus, fraudStatus) {
	switch (transactionStatus) {
		case 'capture':
			// Untuk kartu kredit: cek fraud status
			return fraudStatus === 'accept' ? 'paid' : 'pending'

		case 'settlement':
			return 'paid'

		case 'pending':
			return 'pending'

		case 'deny':
		case 'cancel':
		case 'expire':
			return 'cancelled'

		case 'refund':
		case 'partial_refund':
			return 'refunded'

		case 'failure':
			return 'failed'

		default:
			return 'pending'
	}
}
