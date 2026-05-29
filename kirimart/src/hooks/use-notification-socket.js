/**
 * useNotificationSocket Hook
 * 
 * Custom hook untuk koneksi Socket.IO ke namespace /notifications.
 * Menangani real-time notifications: new-order, order-shipped, dll.
 * 
 * Cara kerja:
 * 1. Connect ke WS Server /notifications (pakai session token untuk auth)
 * 2. Auto-join room user:{userId}
 * 3. Listen event "notification" → terima notifikasi real-time
 * 4. Update React Query cache agar badge langsung berubah
 * 5. Tampilkan toast dan play sound
 * 
 * Digunakan di komponen yang persist (Navbar/Layout), BUKAN di halaman spesifik.
 */
"use client"

import { useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:3001"

// Audio notification — notif.wav + Web Audio API fallback
let notifSound = null
let audioReady = false

// Pre-load audio (panggil sekali saat socket connect)
function preloadNotifSound() {
	if (notifSound) return
	try {
		notifSound = new Audio("/sounds/notif.wav")
		notifSound.volume = 0.6
		notifSound.addEventListener("canplaythrough", () => {
			audioReady = true
			console.log("[NOTIF SOUND] Audio pre-loaded successfully")
		})
		notifSound.addEventListener("error", (e) => {
			console.warn("[NOTIF SOUND] Audio load error:", e.message || "unknown")
			notifSound = null
		})
		notifSound.load()
	} catch (err) {
		console.warn("[NOTIF SOUND] Failed to create Audio:", err)
	}
}

// Fallback: Web Audio API beep
function playBeepFallback() {
	try {
		const AudioContext = window.AudioContext || window.webkitAudioContext
		if (!AudioContext) return
		const ctx = new AudioContext()
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()
		osc.connect(gain)
		gain.connect(ctx.destination)
		osc.frequency.setValueAtTime(800, ctx.currentTime)
		osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1)
		osc.type = "sine"
		gain.gain.setValueAtTime(0.3, ctx.currentTime)
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
		osc.start(ctx.currentTime)
		osc.stop(ctx.currentTime + 0.3)
		console.log("[NOTIF SOUND] Played beep fallback")
	} catch { /* ignore */ }
}

function playNotifSound() {
	console.log("[NOTIF SOUND] Attempting to play... audioReady:", audioReady)
	if (notifSound && audioReady) {
		notifSound.currentTime = 0
		notifSound.play()
			.then(() => console.log("[NOTIF SOUND] ✅ Played notif.wav"))
			.catch((err) => {
				console.warn("[NOTIF SOUND] Play failed:", err.message, "— trying fallback")
				playBeepFallback()
			})
	} else {
		console.log("[NOTIF SOUND] wav not ready, using fallback beep")
		playBeepFallback()
	}
}

/**
 * @param {string|null} sessionToken - Session token untuk autentikasi WS
 * @param {Object} options
 * @param {string} options.storeId - ID toko (untuk seller, agar join room store)
 * @param {Function} options.onNotification - Callback saat notifikasi masuk
 */
export function useNotificationSocket(sessionToken, { storeId = null, onNotification = null } = {}) {
	const socketRef = useRef(null)
	const queryClient = useQueryClient()

	const handleNotification = useCallback((notif) => {
		console.log("[NOTIF SOCKET] Received:", notif)

		// 1. Update unread count via React Query cache
		queryClient.setQueryData(["notif-unread-count"], (old) => {
			const currentCount = old?.data || 0
			return { ...old, success: true, data: currentCount + 1 }
		})

		// 2. Tambah ke list notifikasi
		queryClient.setQueryData(["my-notifications"], (old) => {
			if (!old?.data) return old
			return { ...old, data: [notif, ...old.data] }
		})

		// 3. Delayed refetch sebagai backup (menghindari race condition dengan DB commit)
		const orderRelatedTypes = [
			"new_order", "payment_success", "order_processing",
			"order_shipped", "order_delivered", "order_status_changed",
		]
		
		setTimeout(() => {
			queryClient.invalidateQueries({ queryKey: ["notif-unread-count"] })
			queryClient.invalidateQueries({ queryKey: ["my-notifications"] })
			
			if (orderRelatedTypes.includes(notif.type)) {
				queryClient.invalidateQueries({ queryKey: ["my-transactions"] })
				queryClient.invalidateQueries({ queryKey: ["seller-orders"] })
				queryClient.invalidateQueries({ queryKey: ["tracking"] })
				queryClient.invalidateQueries({ queryKey: ["order-detail"] })
			}
		}, 1500)

		// 3.5 Invalidate segera untuk order-related caches agar terasa cepat (optimistic)
		if (orderRelatedTypes.includes(notif.type)) {
			queryClient.invalidateQueries({ queryKey: ["my-transactions"] })
			queryClient.invalidateQueries({ queryKey: ["seller-orders"] })
			queryClient.invalidateQueries({ queryKey: ["tracking"] })
			queryClient.invalidateQueries({ queryKey: ["order-detail"] })
		}

		// 4. Broadcast ke komponen lain (misal navbar di halaman beda)
		try {
			const channel = new BroadcastChannel("kirimart-notif")
			channel.postMessage({ type: "new-notification", notif })
			channel.close()
		} catch { /* BroadcastChannel not supported */ }

		// 5. Tampilkan toast
		const icons = {
			new_order: "🛒",
			payment_success: "✅",
			order_processing: "📦",
			order_shipped: "🚚",
			order_delivered: "✅",
			order_status_changed: "📦",
			new_review: "⭐",
		}
		const icon = icons[notif.type] || "🔔"

		toast(notif.title, {
			description: notif.message,
			icon,
			duration: 5000,
		})

		// 6. Play sound
		playNotifSound()

		// 7. Custom callback
		if (onNotification) {
			onNotification(notif)
		}
	}, [queryClient, onNotification])

	useEffect(() => {
		if (!sessionToken) return

		const socket = io(`${WS_URL}/notifications`, {
			auth: {
				sessionToken,
				storeId: storeId || undefined,
			},
			transports: ["websocket", "polling"],
			reconnection: true,
			reconnectionAttempts: 10,
			reconnectionDelay: 2000,
		})

		socket.on("connect", () => {
			console.log("[NOTIF SOCKET] ✅ Connected to /notifications, socket id:", socket.id)
			preloadNotifSound() // Pre-load sound saat socket pertama kali connect
		})

		socket.on("connect_error", (err) => {
			console.warn("[NOTIF SOCKET] Connection error:", err.message)
		})

		socket.on("notification", handleNotification)

		socket.on("disconnect", (reason) => {
			console.log("[NOTIF SOCKET] Disconnected:", reason)
		})

		socketRef.current = socket

		return () => {
			socket.off("notification", handleNotification)
			socket.disconnect()
			socketRef.current = null
		}
	}, [sessionToken, storeId, handleNotification])

	return socketRef.current
}
