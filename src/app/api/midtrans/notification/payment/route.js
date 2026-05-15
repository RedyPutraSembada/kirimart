/**
 * Midtrans Payment Notification Webhook
 * 
 * URL: POST /api/midtrans/notification/payment
 * 
 * Ini adalah webhook UTAMA yang menerima notifikasi status transaksi
 * dari Midtrans (settlement, pending, cancel, expire, refund, dll).
 * 
 * Di Midtrans Dashboard → Settings → Configuration → Payment Notification URL
 * Isi dengan: https://{domain}/api/midtrans/notification/payment
 * 
 * PENTING:
 * - Selalu verifikasi signature_key sebelum proses
 * - Selalu return HTTP 200, jika tidak Midtrans akan retry
 * - Jangan rely pada frontend callback, gunakan webhook ini
 */

import { NextResponse } from "next/server"
import { verifySignatureKey } from "@/lib/midtrans"
import { updatePaymentFromWebhook } from "@/actions/public/payment/payment.actions"

export async function POST(request) {
	try {
		const notification = await request.json()

		console.log("[WEBHOOK:PAYMENT] Received notification:", {
			order_id: notification.order_id,
			transaction_status: notification.transaction_status,
			payment_type: notification.payment_type,
			fraud_status: notification.fraud_status,
		})

		// 1. Verifikasi signature — pastikan request benar dari Midtrans
		const isValid = verifySignatureKey(notification)
		if (!isValid) {
			console.error("[WEBHOOK:PAYMENT] Invalid signature for order:", notification.order_id)
			return NextResponse.json(
				{ status: "error", message: "Invalid signature" },
				{ status: 403 }
			)
		}

		// 2. Update payment di database
		const result = await updatePaymentFromWebhook(notification)

		if (!result.success) {
			console.error("[WEBHOOK:PAYMENT] Failed to update:", result.error)
			// Tetap return 200 agar Midtrans tidak retry terus-menerus
			return NextResponse.json({ status: "error", message: result.error })
		}

		// 3. Return 200 OK — Midtrans butuh response cepat
		return NextResponse.json({ status: "OK" })
	} catch (error) {
		console.error("[WEBHOOK:PAYMENT] Unhandled error:", error)
		// Return 200 meskipun error agar Midtrans tidak retry
		return NextResponse.json({ status: "error", message: "Internal server error" })
	}
}
