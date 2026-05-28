/**
 * Chat Namespace — /chat
 *
 * Menangani semua event real-time untuk fitur chat antara pembeli dan penjual.
 *
 * Konsep "Room":
 * - Setiap percakapan (conversation) punya room: "conversation:{id}"
 * - Saat user buka chat, mereka "join" room tersebut
 * - Pesan yang dikirim di-broadcast ke semua orang di room itu
 *
 * Catatan: Data chat (pesan) disimpan ke PostgreSQL melalui Next.js Server Action,
 * BUKAN langsung oleh WS Server. WS Server hanya bertugas sebagai "relay" (pemancar).
 */

/**
 * Setup chat namespace pada Socket.IO server.
 *
 * @param {import("socket.io").Server} io - Socket.IO server instance
 */
export function setupChatNamespace(io) {
	const chatNsp = io.of("/chat")

	chatNsp.on("connection", (socket) => {
		const user = socket.data.user
		console.log(`[CHAT] ${user.name} connected (${user.id})`)

		// Auto-join user ke room pribadi → untuk terima notifikasi semua conversation
		socket.join(`user:${user.id}`)
		console.log(`[CHAT] ${user.name} auto-joined room user:${user.id}`)

		// ─── JOIN CONVERSATION ───
		// Client emit: socket.emit("join-conversation", { conversationId: 1 })
		socket.on("join-conversation", ({ conversationId }) => {
			if (!conversationId) return

			const room = `conversation:${conversationId}`
			socket.join(room)
			console.log(`[CHAT] ${user.name} joined room ${room}`)
		})

		// ─── LEAVE CONVERSATION ───
		socket.on("leave-conversation", ({ conversationId }) => {
			if (!conversationId) return

			const room = `conversation:${conversationId}`
			socket.leave(room)
			console.log(`[CHAT] ${user.name} left room ${room}`)
		})

		// ─── SEND MESSAGE ───
		// Alur:
		// 1. Client kirim pesan via WebSocket
		// 2. WS Server broadcast ke room (agar lawan bicara langsung terima)
		// 3. Client juga panggil Server Action sendMessage() untuk simpan ke DB
		//    (ini dilakukan di sisi client, bukan di WS Server)
		socket.on("send-message", ({ conversationId, message }) => {
			if (!conversationId || !message) return

			const room = `conversation:${conversationId}`

			// Broadcast ke semua di room KECUALI pengirim
			socket.to(room).emit("new-message", {
				conversationId,
				message: {
					...message,
					senderId: user.id,
					senderName: user.name,
					createdAt: new Date().toISOString(),
				},
			})
		})

		// ─── TYPING INDICATOR ───
		// "Sedang mengetik..." yang muncul di layar lawan bicara
		socket.on("typing", ({ conversationId, isTyping }) => {
			if (!conversationId) return

			const room = `conversation:${conversationId}`
			socket.to(room).emit("user-typing", {
				conversationId,
				userId: user.id,
				userName: user.name,
				isTyping,
			})
		})

		// ─── DISCONNECT ───
		socket.on("disconnect", (reason) => {
			console.log(`[CHAT] ${user.name} disconnected (${reason})`)
		})
	})

	console.log("[WS-SERVER] ✅ Chat namespace /chat ready")
}
