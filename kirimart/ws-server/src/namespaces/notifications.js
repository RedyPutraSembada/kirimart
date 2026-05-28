/**
 * Notifications Namespace — /notifications
 *
 * Menangani notifikasi real-time yang di-push dari server ke client.
 * Client HANYA menerima (listen), tidak mengirim event di sini.
 *
 * Room yang digunakan:
 * - "user:{userId}"   → Notifikasi untuk pembeli (status pesanan, chat masuk)
 * - "store:{storeId}" → Notifikasi untuk penjual (pesanan baru, chat masuk)
 *
 * Alur:
 * 1. User login → browser connect ke namespace /notifications
 * 2. WS Server otomatis join room berdasarkan userId dan storeId
 * 3. Saat ada event penting (dari webhook/server action),
 *    Next.js panggil POST /emit → WS Server broadcast ke room yang tepat
 * 4. Browser menerima event dan update UI (notif bell, toast, dll)
 */

/**
 * Setup notifications namespace pada Socket.IO server.
 *
 * @param {import("socket.io").Server} io - Socket.IO server instance
 */
export function setupNotificationsNamespace(io) {
	const notifNsp = io.of("/notifications")

	notifNsp.on("connection", (socket) => {
		const user = socket.data.user

		// ─── AUTO JOIN ROOMS ───
		// Setiap user yang connect otomatis masuk ke room pribadinya
		const userRoom = `user:${user.id}`
		socket.join(userRoom)
		console.log(`[NOTIF] ${user.name} joined ${userRoom}`)

		// Jika user adalah seller, join juga room tokonya
		// storeId dikirim dari client saat connect
		if (socket.handshake.auth.storeId) {
			const storeRoom = `store:${socket.handshake.auth.storeId}`
			socket.join(storeRoom)
			console.log(`[NOTIF] ${user.name} joined ${storeRoom} (seller)`)
		}

		// ─── CLIENT BISA REQUEST JOIN STORE ROOM ───
		// Berguna jika storeId belum tersedia saat pertama kali connect
		socket.on("join-store", ({ storeId }) => {
			if (!storeId) return
			const storeRoom = `store:${storeId}`
			socket.join(storeRoom)
			console.log(`[NOTIF] ${user.name} joined ${storeRoom}`)
		})

		// ─── DISCONNECT ───
		socket.on("disconnect", (reason) => {
			console.log(`[NOTIF] ${user.name} disconnected (${reason})`)
		})
	})

	// ─── EVENT YANG BISA DI-EMIT VIA POST /emit ───
	//
	// 1. "new-order"
	//    Room: store:{storeId}
	//    Data: { orderId, buyerName, totalAmount }
	//    Trigger: Midtrans webhook settlement
	//
	// 2. "order-status-changed"
	//    Room: user:{userId}
	//    Data: { orderId, status, awbNumber? }
	//    Trigger: Biteship webhook / seller action
	//
	// 3. "new-message"
	//    Room: user:{userId} atau store:{storeId}
	//    Data: { conversationId, senderName, preview }
	//    Trigger: Chat server action
	//
	// 4. "order-shipped"
	//    Room: user:{userId}
	//    Data: { orderId, courier, awbNumber }
	//    Trigger: Seller input resi
	//
	// 5. "withdrawal-processed"
	//    Room: store:{storeId}
	//    Data: { withdrawalId, amount, status }
	//    Trigger: Admin approve/reject withdrawal
	//
	// Semua event di atas TIDAK di-handle di sini (karena push-only).
	// Client cukup listen: socket.on("new-order", (data) => { ... })

	console.log("[WS-SERVER] ✅ Notifications namespace /notifications ready")
}
