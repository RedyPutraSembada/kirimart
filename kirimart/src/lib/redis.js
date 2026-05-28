/**
 * Redis Client Singleton — untuk Next.js Server Actions
 *
 * Koneksi ke Redis yang dipakai bersama oleh:
 * - Cache layer (src/lib/cache.js)
 * - Semua server actions yang butuh caching
 *
 * PENTING:
 * - Singleton pattern: hanya ada 1 koneksi per proses Next.js
 * - Menggunakan ioredis (sama seperti WS Server, konsisten)
 * - Jika Redis tidak tersedia, semua operasi TIDAK throw error
 *   (graceful degradation — app tetap jalan tanpa cache)
 *
 * Koneksi:
 * - Development: redis://localhost:6379 (Docker container)
 * - Production: REDIS_URL dari environment variable
 */

import { Redis } from "ioredis"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"

/** @type {import("ioredis").Redis | null} */
let redisClient = null
let isConnected = false

/**
 * Mendapatkan instance Redis client (singleton).
 * Jika belum ada koneksi, buat baru.
 * Jika Redis tidak tersedia, return null (bukan throw error).
 *
 * @returns {import("ioredis").Redis | null}
 */
export function getRedisClient() {
	if (redisClient) return redisClient

	try {
		redisClient = new Redis(REDIS_URL, {
			maxRetriesPerRequest: 3,
			retryStrategy(times) {
				if (times > 5) {
					console.warn("[REDIS] Max retries reached, giving up")
					return null // Stop retrying
				}
				return Math.min(times * 200, 2000) // 200ms, 400ms, ..., max 2s
			},
			lazyConnect: false,
			enableOfflineQueue: true,
			connectTimeout: 5000,
		})

		redisClient.on("connect", () => {
			isConnected = true
			console.log("[REDIS] ✅ Connected to Redis")
		})

		redisClient.on("error", (err) => {
			isConnected = false
			console.warn("[REDIS] Connection error:", err.message)
		})

		redisClient.on("close", () => {
			isConnected = false
		})

		return redisClient
	} catch (error) {
		console.warn("[REDIS] Failed to create client:", error.message)
		return null
	}
}

/**
 * Cek apakah Redis terhubung
 * @returns {boolean}
 */
export function isRedisConnected() {
	return isConnected && redisClient !== null
}

/**
 * Tutup koneksi Redis (untuk graceful shutdown)
 */
export async function closeRedis() {
	if (redisClient) {
		await redisClient.quit()
		redisClient = null
		isConnected = false
	}
}
