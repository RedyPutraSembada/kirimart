/**
 * WebSocket Emit Helper — untuk Next.js Server Actions & Webhooks
 *
 * Fungsi ini dipanggil dari sisi SERVER (server actions, webhook handlers)
 * untuk men-trigger event real-time ke browser melalui WS Server.
 *
 * Contoh penggunaan:
 *
 * ```js
 * import { wsEmit } from "@/lib/ws-emit"
 *
 * // Di webhook Midtrans — beri tahu seller ada pesanan baru
 * await wsEmit("notifications", `store:${storeId}`, "new-order", {
 *   orderId: 42,
 *   buyerName: "Putra",
 *   totalAmount: 139000,
 * })
 *
 * // Di server action chat — beri tahu lawan bicara ada pesan baru
 * await wsEmit("chat", `conversation:${convId}`, "new-message", {
 *   conversationId: convId,
 *   message: { senderId, body, createdAt },
 * })
 * ```
 *
 * PENTING:
 * - Fungsi ini HANYA boleh dipanggil dari server (bukan client/browser)
 * - Menggunakan shared secret (WS_SECRET) untuk autentikasi
 * - Jika WS Server tidak tersedia, fungsi ini TIDAK throw error
 *   (agar tidak mengganggu operasi utama seperti pembayaran)
 */

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:3001"
const WS_SECRET = process.env.WS_SECRET || "kirimart-ws-secret-2026"

/**
 * Kirim event ke WS Server untuk di-broadcast ke client.
 *
 * @param {string} namespace - Namespace Socket.IO: "notifications" | "chat"
 * @param {string} room - Room target: "user:{id}" | "store:{id}" | "conversation:{id}"
 * @param {string} event - Nama event: "new-order" | "order-status-changed" | "new-message" | ...
 * @param {Object} data - Data yang dikirim ke client
 * @returns {Promise<boolean>} true jika berhasil, false jika gagal
 */
export async function wsEmit(namespace, room, event, data) {
	try {
		const res = await fetch(`${WS_SERVER_URL}/emit`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-ws-secret": WS_SECRET,
			},
			body: JSON.stringify({ namespace, room, event, data }),
			// Timeout 3 detik — jangan sampai WS Server yang lambat
			// menahan operasi utama (misal: pembayaran Midtrans)
			signal: AbortSignal.timeout(3000),
		})

		if (!res.ok) {
			console.warn(`[WS-EMIT] Failed: ${res.status} ${res.statusText}`)
			return false
		}

		return true
	} catch (error) {
		// Log warning tapi JANGAN throw error
		// Alasan: real-time notification adalah fitur "nice to have"
		// Operasi utama (payment, order update) harus tetap jalan meskipun WS down
		console.warn(`[WS-EMIT] WS Server unreachable: ${error.message}`)
		return false
	}
}
