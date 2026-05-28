/**
 * NotificationProvider — Global Real-Time Notification Listener
 * 
 * Komponen ini di-mount di root layout dan menghubungkan user ke
 * WebSocket namespace /notifications. Saat notifikasi masuk:
 * - Toast muncul
 * - Sound notif.wav diputar
 * - Badge 🔔 di navbar langsung update
 * 
 * Hanya aktif jika user sudah login (ada session token di cookie).
 */
"use client"

import { useEffect, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { useNotificationSocket } from "@/hooks/use-notification-socket"

export function NotificationProvider({ children }) {
	const { data: session } = useSession()
	const [sessionToken, setSessionToken] = useState(null)

	// Extract session token dari cookie (client-side)
	useEffect(() => {
		if (!session?.user) {
			setSessionToken(null)
			return
		}

		// Baca cookie better-auth.session_token
		// Coba semua kemungkinan nama cookie
		const cookies = document.cookie.split(";").map(c => c.trim())
		
		let rawValue = null
		for (const cookie of cookies) {
			if (cookie.startsWith("better-auth.session_token=")) {
				rawValue = cookie.substring("better-auth.session_token=".length)
				break
			}
		}

		if (rawValue) {
			// Better Auth format: "token.csrfSignature" → ambil bagian pertama
			const token = decodeURIComponent(rawValue).split(".")[0]
			console.log("[NOTIF PROVIDER] Token extracted, length:", token?.length)
			setSessionToken(token)
		} else {
			console.warn("[NOTIF PROVIDER] Session cookie not found! Available cookies:", 
				cookies.map(c => c.split("=")[0]).join(", "))
		}
	}, [session])

	// Connect ke /notifications namespace
	useNotificationSocket(sessionToken)

	return children
}
