/**
 * Midtrans Pay Account Notification Webhook
 * 
 * URL: POST /api/midtrans/notification/pay-account
 * 
 * Menerima notifikasi untuk GoPay tokenization / pay account linking.
 * Saat ini hanya logging — fitur pay account belum diimplementasi.
 * 
 * Di Midtrans Dashboard → Settings → Configuration → Pay Account Notification URL
 * Isi dengan: https://{domain}/api/midtrans/notification/pay-account
 */

import { NextResponse } from "next/server"
import { verifySignatureKey } from "@/lib/midtrans"
import { updatePaymentFromWebhook } from "@/actions/public/payment/payment.actions"

export async function POST(request) {
	try {
		const notification = await request.json()

		console.log("[WEBHOOK:PAY-ACCOUNT] Received notification:", {
			order_id: notification.order_id,
			transaction_status: notification.transaction_status,
			payment_type: notification.payment_type,
		})

		// Verifikasi signature
		const isValid = verifySignatureKey(notification)
		if (!isValid) {
			console.error("[WEBHOOK:PAY-ACCOUNT] Invalid signature for order:", notification.order_id)
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
		console.error("[WEBHOOK:PAY-ACCOUNT] Unhandled error:", error)
		return NextResponse.json({ status: "error", message: "Internal server error" })
	}
}
