/**
 * Background Jobs Scheduler — Next.js Helper
 *
 * Memanggil WS Server REST API untuk menjadwalkan background jobs.
 * Dipanggil dari webhooks dan server actions.
 *
 * Contoh:
 * ```js
 * import { scheduleAutoComplete, scheduleExpirePayment } from "@/lib/jobs"
 *
 * // Di Biteship webhook saat status "delivered"
 * await scheduleAutoComplete(orderId)
 *
 * // Di payment create action
 * await scheduleExpirePayment(paymentId, orderId)
 * ```
 */

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:3001"
const WS_SECRET = process.env.WS_SECRET || "kirimart-ws-secret-2026"

/**
 * Internal: kirim request ke WS Server Jobs API
 */
async function scheduleJob(type, data) {
	try {
		const res = await fetch(`${WS_SERVER_URL}/jobs/schedule`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-ws-secret": WS_SECRET,
			},
			body: JSON.stringify({ type, data }),
			signal: AbortSignal.timeout(5000),
		})

		if (!res.ok) {
			const err = await res.json().catch(() => ({}))
			console.warn(`[JOBS] Schedule failed: ${res.status}`, err)
			return false
		}

		const result = await res.json()
		console.log(`[JOBS] ${type} scheduled:`, result.message)
		return true
	} catch (error) {
		console.warn(`[JOBS] Schedule error: ${error.message}`)
		return false
	}
}

/**
 * Schedule auto-complete order setelah 7 hari
 * Dipanggil saat Biteship webhook menerima status "delivered"
 */
export async function scheduleAutoComplete(orderId) {
	return scheduleJob("auto-complete-order", { orderId })
}

/**
 * Schedule expire payment setelah 24 jam
 * Dipanggil saat payment baru dibuat (status "pending")
 */
export async function scheduleExpirePayment(paymentId, orderId) {
	return scheduleJob("expire-payment", { paymentId, orderId })
}

/**
 * Cancel scheduled expire payment
 * Dipanggil saat payment berhasil (settlement) agar tidak di-expire
 */
export async function cancelExpirePayment(paymentId) {
	return scheduleJob("cancel-expire-payment", { paymentId })
}
