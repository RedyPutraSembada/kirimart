/**
 * Emit API — REST endpoint untuk Next.js trigger event
 *
 * Endpoint: POST /emit
 * Header: x-ws-secret: <WS_SECRET>
 *
 * Body JSON:
 * {
 *   "namespace": "notifications" | "chat",
 *   "room": "user:abc123" | "store:5" | "conversation:1",
 *   "event": "new-order" | "order-status-changed" | "new-message" | ...,
 *   "data": { ... any data ... }
 * }
 *
 * Keamanan:
 * - Endpoint ini HANYA boleh dipanggil oleh Next.js server
 * - Dilindungi oleh shared secret (WS_SECRET)
 * - Tidak boleh dipanggil dari browser (CORS akan memblokir,
 *   dan secret tidak boleh ada di client)
 */

import { Router } from "express"

/**
 * Buat router Express untuk emit API.
 *
 * @param {import("socket.io").Server} io - Socket.IO server instance
 * @param {string} wsSecret - Shared secret untuk autentikasi
 * @returns {import("express").Router}
 */
export function createEmitRouter(io, wsSecret) {
	const router = Router()

	router.post("/emit", (req, res) => {
		// 1. Verifikasi secret
		const secret = req.headers["x-ws-secret"]
		if (secret !== wsSecret) {
			console.warn("[EMIT API] ❌ Unauthorized request (invalid secret)")
			return res.status(401).json({ error: "Unauthorized" })
		}

		// 2. Parse body
		const { namespace, room, event, data } = req.body

		if (!event) {
			return res.status(400).json({ error: "Missing 'event' field" })
		}

		try {
			// 3. Emit ke namespace + room yang ditentukan
			if (namespace && room) {
				// Emit ke room spesifik di namespace tertentu
				// Contoh: io.of("/notifications").to("store:5").emit("new-order", {...})
				io.of(`/${namespace}`).to(room).emit(event, data)
				console.log(`[EMIT API] ✅ ${namespace}/${room} → ${event}`)
			} else if (namespace) {
				// Emit ke SEMUA client di namespace (broadcast)
				io.of(`/${namespace}`).emit(event, data)
				console.log(`[EMIT API] ✅ ${namespace}/* → ${event}`)
			} else if (room) {
				// Emit ke room di default namespace
				io.to(room).emit(event, data)
				console.log(`[EMIT API] ✅ default/${room} → ${event}`)
			} else {
				// Emit ke SEMUA client (global broadcast)
				io.emit(event, data)
				console.log(`[EMIT API] ✅ global → ${event}`)
			}

			return res.json({ success: true })
		} catch (error) {
			console.error("[EMIT API] Error:", error.message)
			return res.status(500).json({ error: "Failed to emit event" })
		}
	})

	return router
}
