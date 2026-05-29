/**
 * BullMQ Background Job Worker — KiriMart
 *
 * Menjalankan scheduled jobs yang dijadwalkan dari Next.js:
 *
 * 1. auto-complete-order  → 7 hari setelah delivered, auto-complete order + tambah saldo seller
 * 2. expire-payment       → 24 jam setelah dibuat, cancel order jika belum bayar
 *
 * Alur:
 * 1. Next.js webhook/action → POST /jobs/schedule (REST)
 * 2. WS Server → BullMQ Queue → Redis (delayed job)
 * 3. Worker (file ini) → process job saat waktunya tiba
 * 4. Worker → update PostgreSQL langsung
 */

import { Queue, Worker } from "bullmq"
import pg from "pg"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const DATABASE_URL = process.env.DATABASE_URL

// ============================================
// REDIS CONNECTION FOR BULLMQ
// ============================================

// Parse Redis URL for BullMQ (needs host, port, not URL string)
function parseRedisUrl(url) {
	const parsed = new URL(url)
	return {
		host: parsed.hostname,
		port: parseInt(parsed.port) || 6379,
		password: parsed.password || undefined,
	}
}

const redisConnection = parseRedisUrl(REDIS_URL)

// ============================================
// QUEUES
// ============================================

export const orderQueue = new Queue("kirimart-orders", { connection: redisConnection })
export const paymentQueue = new Queue("kirimart-payments", { connection: redisConnection })

// ============================================
// DATABASE POOL (terpisah dari auth pool)
// ============================================

let jobPool = null

function getJobPool() {
	if (!jobPool && DATABASE_URL) {
		jobPool = new pg.Pool({
			connectionString: DATABASE_URL,
			max: 3, // Jobs tidak butuh banyak koneksi
		})
	}
	return jobPool
}

// ============================================
// JOB PROCESSORS
// ============================================

/**
 * Auto-Complete Order
 *
 * Dijalankan 7 hari setelah status pengiriman = "delivered".
 * Jika buyer belum konfirmasi, order otomatis diselesaikan dan saldo seller ditambah.
 *
 * Data: { orderId: number }
 */
async function processAutoComplete(job) {
	const { orderId } = job.data
	const pool = getJobPool()
	if (!pool) throw new Error("Database not configured")

	console.log(`[JOB] Auto-completing order #${orderId}...`)

	const client = await pool.connect()
	try {
		await client.query("BEGIN")

		// 1. Cek order masih berstatus "shipped" (belum di-complete manual oleh buyer)
		const { rows: [order] } = await client.query(
			`SELECT id, status, "storeId", "grandTotal" FROM orders WHERE id = $1`,
			[orderId]
		)

		if (!order) {
			console.log(`[JOB] Order #${orderId} not found, skipping`)
			await client.query("ROLLBACK")
			return { skipped: true, reason: "not_found" }
		}

		if (order.status !== "shipped") {
			console.log(`[JOB] Order #${orderId} status is "${order.status}", not "shipped". Skipping.`)
			// Jika status "complained", pesanan sedang dikomplain → jangan auto-complete
			if (order.status === "complained") {
				console.log(`[JOB] Order #${orderId} is under complaint. Will not auto-complete.`)
			}
			await client.query("ROLLBACK")
			return { skipped: true, reason: `status_${order.status}` }
		}

		// 2. Update order → completed
		await client.query(
			`UPDATE orders SET status = 'completed', "updatedAt" = NOW() WHERE id = $1`,
			[orderId]
		)

		// 3. Hitung platform fee (commissionAmount sudah disimpan saat create order)
		const { rows: [orderFee] } = await client.query(
			`SELECT "platformFee" FROM orders WHERE id = $1`,
			[orderId]
		)

		// 4. Tambah saldo seller (grandTotal - platformFee)
		const sellerAmount = (order.grandTotal || 0) - (orderFee?.platformFee || 0)
		if (sellerAmount > 0 && order.storeId) {
			await client.query(
				`UPDATE stores SET balance = balance + $1 WHERE id = $2`,
				[sellerAmount, order.storeId]
			)
			console.log(`[JOB] Added Rp ${sellerAmount.toLocaleString()} to store #${order.storeId}`)
		}

		// 5. Update soldCount per product (increment)
		const { rows: orderItems } = await client.query(
			`SELECT "productId", quantity FROM order_items WHERE "orderId" = $1`,
			[orderId]
		)
		for (const item of orderItems) {
			await client.query(
				`UPDATE products SET "soldCount" = "soldCount" + $1 WHERE id = $2`,
				[item.quantity, item.productId]
			)
		}

		await client.query("COMMIT")
		console.log(`[JOB] ✅ Order #${orderId} auto-completed!`)

		return { completed: true, orderId, sellerAmount }
	} catch (error) {
		await client.query("ROLLBACK")
		throw error
	} finally {
		client.release()
	}
}

/**
 * Expire Pending Payment
 *
 * Dijalankan 24 jam setelah payment dibuat.
 * Jika status masih "pending", cancel order dan kembalikan stok.
 *
 * Data: { paymentId: number, orderId: number }
 */
async function processExpirePayment(job) {
	const { paymentId, orderId } = job.data
	const pool = getJobPool()
	if (!pool) throw new Error("Database not configured")

	console.log(`[JOB] Checking payment #${paymentId} for expiration...`)

	const client = await pool.connect()
	try {
		await client.query("BEGIN")

		// 1. Cek payment masih pending
		const { rows: [payment] } = await client.query(
			`SELECT id, status FROM payments WHERE id = $1`,
			[paymentId]
		)

		if (!payment || payment.status !== "pending") {
			console.log(`[JOB] Payment #${paymentId} status is "${payment?.status}", skipping`)
			await client.query("ROLLBACK")
			return { skipped: true, reason: `status_${payment?.status}` }
		}

		// 2. Update payment → expired
		await client.query(
			`UPDATE payments SET status = 'expired', "updatedAt" = NOW() WHERE id = $1`,
			[paymentId]
		)

		// 3. Update order → cancelled
		if (orderId) {
			await client.query(
				`UPDATE orders SET status = 'cancelled', "updatedAt" = NOW() WHERE id = $1 AND status = 'pending'`,
				[orderId]
			)
		}

		// 4. Kembalikan stok produk
		if (orderId) {
			const { rows: orderItems } = await client.query(
				`SELECT "productId", "variantId", quantity FROM order_items WHERE "orderId" = $1`,
				[orderId]
			)
			for (const item of orderItems) {
				if (item.variantId) {
					await client.query(
						`UPDATE product_variants SET stock = stock + $1 WHERE id = $2`,
						[item.quantity, item.variantId]
					)
				} else {
					await client.query(
						`UPDATE products SET "baseStock" = "baseStock" + $1 WHERE id = $2`,
						[item.quantity, item.productId]
					)
				}
			}
		}

		await client.query("COMMIT")
		console.log(`[JOB] ✅ Payment #${paymentId} expired, order #${orderId} cancelled, stock restored!`)

		return { expired: true, paymentId, orderId }
	} catch (error) {
		await client.query("ROLLBACK")
		throw error
	} finally {
		client.release()
	}
}

// ============================================
// INIT WORKERS
// ============================================

export function initWorkers() {
	console.log("[WORKER] Starting BullMQ workers...")

	// Worker untuk order queue
	const orderWorker = new Worker("kirimart-orders", async (job) => {
		switch (job.name) {
			case "auto-complete":
				return await processAutoComplete(job)
			default:
				console.warn(`[WORKER] Unknown order job: ${job.name}`)
		}
	}, {
		connection: redisConnection,
		concurrency: 2,
	})

	orderWorker.on("completed", (job, result) => {
		console.log(`[WORKER] ✅ Order job "${job.name}" completed:`, result)
	})

	orderWorker.on("failed", (job, err) => {
		console.error(`[WORKER] ❌ Order job "${job.name}" failed:`, err.message)
	})

	// Worker untuk payment queue
	const paymentWorker = new Worker("kirimart-payments", async (job) => {
		switch (job.name) {
			case "expire-payment":
				return await processExpirePayment(job)
			default:
				console.warn(`[WORKER] Unknown payment job: ${job.name}`)
		}
	}, {
		connection: redisConnection,
		concurrency: 2,
	})

	paymentWorker.on("completed", (job, result) => {
		console.log(`[WORKER] ✅ Payment job "${job.name}" completed:`, result)
	})

	paymentWorker.on("failed", (job, err) => {
		console.error(`[WORKER] ❌ Payment job "${job.name}" failed:`, err.message)
	})

	console.log("[WORKER] ✅ BullMQ workers started (orders + payments)")

	return { orderWorker, paymentWorker }
}

// ============================================
// SCHEDULE HELPERS (dipanggil dari REST API)
// ============================================

/**
 * Schedule auto-complete order setelah 7 hari
 */
export async function scheduleAutoComplete(orderId) {
	const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
	await orderQueue.add("auto-complete", { orderId }, {
		delay: SEVEN_DAYS_MS,
		jobId: `auto-complete-${orderId}`, // Prevent duplicate
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 50 },
	})
	console.log(`[QUEUE] Scheduled auto-complete for order #${orderId} in 7 days`)
}

/**
 * Schedule expire payment setelah 24 jam
 */
export async function scheduleExpirePayment(paymentId, orderId) {
	const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
	await paymentQueue.add("expire-payment", { paymentId, orderId }, {
		delay: TWENTY_FOUR_HOURS_MS,
		jobId: `expire-payment-${paymentId}`, // Prevent duplicate
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 50 },
	})
	console.log(`[QUEUE] Scheduled expire for payment #${paymentId} in 24 hours`)
}

/**
 * Cancel scheduled job (misal: payment berhasil → cancel expire job)
 */
export async function cancelExpirePayment(paymentId) {
	try {
		const job = await paymentQueue.getJob(`expire-payment-${paymentId}`)
		if (job) {
			await job.remove()
			console.log(`[QUEUE] Cancelled expire job for payment #${paymentId}`)
		}
	} catch (err) {
		console.warn(`[QUEUE] Failed to cancel expire job: ${err.message}`)
	}
}

/**
 * Close all workers and queues (graceful shutdown)
 */
export async function closeWorkers(workers) {
	if (workers?.orderWorker) await workers.orderWorker.close()
	if (workers?.paymentWorker) await workers.paymentWorker.close()
	await orderQueue.close()
	await paymentQueue.close()
	if (jobPool) await jobPool.end()
}
