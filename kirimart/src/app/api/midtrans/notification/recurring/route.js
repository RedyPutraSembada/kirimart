/**
 * Midtrans Recurring Notification Webhook
 * 
 * URL: POST /api/midtrans/notification/recurring
 * 
 * Menerima notifikasi untuk subscription/recurring payments.
 * Saat ini hanya logging — fitur recurring belum diimplementasi.
 * 
 * Di Midtrans Dashboard → Settings → Configuration → Recurring Notification URL
 * Isi dengan: https://{domain}/api/midtrans/notification/recurring
 */

import { NextResponse } from "next/server"
import { verifySignatureKey } from "@/lib/midtrans"
import { updatePaymentFromWebhook } from "@/actions/public/payment/payment.actions"

export async function POST(request) {
	try {
		const notification = await request.json()

		console.log("[WEBHOOK:RECURRING] Received notification:", {
			order_id: notification.order_id,
			transaction_status: notification.transaction_status,
			payment_type: notification.payment_type,
		})

		// Verifikasi signature
		const isValid = verifySignatureKey(notification)
		if (!isValid) {
			console.error("[WEBHOOK:RECURRING] Invalid signature for order:", notification.order_id)
			return NextResponse.json(
				{ status: "error", message: "Invalid signature" },
				{ status: 403 }
			)
		}

		// Jika ada order_id yang terkait, update payment
		if (notification.order_id) {
			await updatePaymentFromWebhook(notification)
		}

		return NextResponse.json({ status: "OK" })
	} catch (error) {
		console.error("[WEBHOOK:RECURRING] Unhandled error:", error)
		return NextResponse.json({ status: "error", message: "Internal server error" })
	}
}
