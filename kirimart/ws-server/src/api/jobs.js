/**
 * REST API untuk menjadwalkan Background Jobs
 *
 * Endpoint: POST /jobs/schedule
 *
 * Dipanggil dari Next.js server actions/webhooks:
 * - Biteship webhook "delivered" → schedule auto-complete
 * - Payment create → schedule expire
 * - Payment settlement → cancel expire
 *
 * Security: dilindungi oleh x-ws-secret header
 */

import { Router } from "express"
import {
	scheduleAutoComplete,
	scheduleExpirePayment,
	cancelExpirePayment,
} from "../jobs/worker.js"

export function createJobsRouter(wsSecret) {
	const router = Router()

	// POST /jobs/schedule
	router.post("/jobs/schedule", async (req, res) => {
		// Auth check
		const secret = req.headers["x-ws-secret"]
		if (secret !== wsSecret) {
			return res.status(401).json({ error: "Unauthorized" })
		}

		const { type, data } = req.body

		try {
			switch (type) {
				case "auto-complete-order": {
					if (!data?.orderId) {
						return res.status(400).json({ error: "orderId required" })
					}
					await scheduleAutoComplete(data.orderId)
					return res.json({ success: true, message: `Auto-complete scheduled for order #${data.orderId}` })
				}

				case "expire-payment": {
					if (!data?.paymentId) {
						return res.status(400).json({ error: "paymentId required" })
					}
					await scheduleExpirePayment(data.paymentId, data.orderId)
					return res.json({ success: true, message: `Expire scheduled for payment #${data.paymentId}` })
				}

				case "cancel-expire-payment": {
					if (!data?.paymentId) {
						return res.status(400).json({ error: "paymentId required" })
					}
					await cancelExpirePayment(data.paymentId)
					return res.json({ success: true, message: `Expire cancelled for payment #${data.paymentId}` })
				}

				default:
					return res.status(400).json({ error: `Unknown job type: ${type}` })
			}
		} catch (error) {
			console.error("[JOBS API] Error:", error.message)
			return res.status(500).json({ error: error.message })
		}
	})

	// GET /jobs/stats — melihat status queue
	router.get("/jobs/stats", async (req, res) => {
		const secret = req.headers["x-ws-secret"]
		if (secret !== wsSecret) {
			return res.status(401).json({ error: "Unauthorized" })
		}

		try {
			const { orderQueue, paymentQueue } = await import("../jobs/worker.js")
			const [orderCounts, paymentCounts] = await Promise.all([
				orderQueue.getJobCounts(),
				paymentQueue.getJobCounts(),
			])

			return res.json({
				orders: orderCounts,
				payments: paymentCounts,
			})
		} catch (error) {
			return res.status(500).json({ error: error.message })
		}
	})

	return router
}
