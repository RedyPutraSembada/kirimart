/**
 * useSocket — Custom Hook untuk koneksi Socket.IO
 *
 * Cara pakai:
 *
 * ```jsx
 * import { useSocket } from "@/hooks/use-socket"
 *
 * function ChatComponent() {
 *   const { socket, isConnected } = useSocket("/chat", { sessionToken: "..." })
 *
 *   useEffect(() => {
 *     if (!socket) return
 *     socket.on("new-message", (data) => { ... })
 *     return () => socket.off("new-message")
 *   }, [socket])
 * }
 * ```
 *
 * Fitur:
 * - Auto-connect saat component mount
 * - Auto-disconnect saat component unmount
 * - Reconnect otomatis jika terputus
 * - Status connected/disconnected
 */
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { io } from "socket.io-client"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

/**
 * @param {string} namespace - Namespace Socket.IO: "/chat" atau "/notifications"
 * @param {Object} authData - Data autentikasi: { sessionToken, storeId? }
 * @returns {{ socket: Socket | null, isConnected: boolean }}
 */
export function useSocket(namespace, authData) {
	const [isConnected, setIsConnected] = useState(false)
	const socketRef = useRef(null)

	useEffect(() => {
		// Jangan connect jika tidak ada session token
		if (!authData?.sessionToken) return

		const url = `${WS_URL}${namespace || ""}`

		// Buat koneksi Socket.IO
		const socket = io(url, {
			auth: {
				sessionToken: authData.sessionToken,
				storeId: authData.storeId || null,
			},
			// Reconnect otomatis jika terputus
			reconnection: true,
			reconnectionAttempts: 10,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 5000,
			// Timeout koneksi
			timeout: 10000,
			// Transport: mulai dari websocket, fallback ke polling
			transports: ["websocket", "polling"],
		})

		socket.on("connect", () => {
			console.log(`[Socket.IO] ✅ Connected to ${namespace}`)
			setIsConnected(true)
		})

		socket.on("disconnect", (reason) => {
			console.log(`[Socket.IO] ❌ Disconnected from ${namespace}: ${reason}`)
			setIsConnected(false)
		})

		socket.on("connect_error", (error) => {
			console.error(`[Socket.IO] Connection error on ${namespace}:`, error.message)
			setIsConnected(false)
		})

		socketRef.current = socket

		// Cleanup: disconnect saat component unmount
		return () => {
			socket.disconnect()
			socketRef.current = null
			setIsConnected(false)
		}
	}, [namespace, authData?.sessionToken, authData?.storeId])

	return {
		socket: socketRef.current,
		isConnected,
	}
}

/**
 * useNotifications — Shortcut hook khusus untuk namespace /notifications
 *
 * Auto-join room user dan store (jika seller).
 * Menerima event: new-order, order-status-changed, new-message, dll.
 *
 * @param {Object} authData - { sessionToken, storeId? }
 * @param {Object} handlers - { onNewOrder, onStatusChanged, onNewMessage }
 */
export function useNotifications(authData, handlers = {}) {
	const { socket, isConnected } = useSocket("/notifications", authData)

	useEffect(() => {
		if (!socket) return

		if (handlers.onNewOrder) {
			socket.on("new-order", handlers.onNewOrder)
		}
		if (handlers.onStatusChanged) {
			socket.on("order-status-changed", handlers.onStatusChanged)
		}
		if (handlers.onNewMessage) {
			socket.on("new-message", handlers.onNewMessage)
		}
		if (handlers.onOrderShipped) {
			socket.on("order-shipped", handlers.onOrderShipped)
		}

		return () => {
			socket.off("new-order")
			socket.off("order-status-changed")
			socket.off("new-message")
			socket.off("order-shipped")
		}
	}, [socket, handlers])

	return { isConnected }
}
