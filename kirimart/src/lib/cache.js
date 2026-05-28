/**
 * Cache Helper — High-Level Caching Layer
 *
 * Menyediakan fungsi cached() yang otomatis:
 * 1. Cek Redis → jika ada, return data dari cache (FAST ⚡)
 * 2. Jika tidak ada → panggil queryFn → simpan hasil ke Redis → return
 *
 * Keunggulan:
 * - Graceful degradation: jika Redis mati, langsung fallback ke queryFn
 * - TTL (Time-To-Live): data expired otomatis setelah waktu tertentu
 * - Invalidation: bisa hapus cache spesifik atau pakai pattern
 *
 * Contoh penggunaan:
 * ```js
 * import { cached, invalidateCache } from "@/lib/cache"
 *
 * // Cached query — data disimpan 1 jam
 * const categories = await cached("categories:all", () => {
 *   return db.select().from(categories)
 * }, 3600)
 *
 * // Invalidate saat admin update kategori
 * await invalidateCache("categories:all")
 * ```
 */

import { getRedisClient } from "./redis"

/**
 * Cache-aside pattern: cek cache → jika miss → query DB → simpan ke cache
 *
 * @param {string} key - Redis key (misal: "categories:all", "ongkir:AREA1:AREA2")
 * @param {Function} queryFn - Fungsi async yang mengambil data dari DB/API
 * @param {number} ttlSeconds - Waktu cache expired (dalam detik). Default: 300 (5 menit)
 * @returns {*} Data dari cache atau dari queryFn
 */
export async function cached(key, queryFn, ttlSeconds = 300) {
	const redis = getRedisClient()

	// Jika Redis tidak tersedia → langsung query
	if (!redis) {
		return await queryFn()
	}

	try {
		// 1. Cek cache
		const cachedData = await redis.get(`cache:${key}`)
		if (cachedData) {
			return JSON.parse(cachedData)
		}
	} catch (err) {
		// Redis error → jangan block, lanjut query
		console.warn("[CACHE] Get error:", err.message)
	}

	// 2. Cache MISS → jalankan query asli
	const result = await queryFn()

	// 3. Simpan ke cache (background, jangan await)
	try {
		const redis2 = getRedisClient()
		if (redis2 && result !== undefined && result !== null) {
			// EX = expire in seconds
			redis2.set(`cache:${key}`, JSON.stringify(result), "EX", ttlSeconds)
				.catch(err => console.warn("[CACHE] Set error:", err.message))
		}
	} catch { /* ignore */ }

	return result
}

/**
 * Hapus cache berdasarkan key yang tepat.
 *
 * @param {string} key - Redis key yang akan dihapus
 */
export async function invalidateCache(key) {
	const redis = getRedisClient()
	if (!redis) return

	try {
		await redis.del(`cache:${key}`)
	} catch (err) {
		console.warn("[CACHE] Invalidate error:", err.message)
	}
}

/**
 * Hapus cache berdasarkan pattern (wildcard).
 * Berguna untuk menghapus semua cache terkait (misal: "ongkir:*")
 *
 * PERHATIAN: Hanya untuk invalidation, JANGAN gunakan di hot path.
 *
 * @param {string} pattern - Redis key pattern (misal: "ongkir:*", "product:*")
 */
export async function invalidateCachePattern(pattern) {
	const redis = getRedisClient()
	if (!redis) return

	try {
		const keys = await redis.keys(`cache:${pattern}`)
		if (keys.length > 0) {
			await redis.del(...keys)
			console.log(`[CACHE] Invalidated ${keys.length} keys matching ${pattern}`)
		}
	} catch (err) {
		console.warn("[CACHE] Pattern invalidate error:", err.message)
	}
}
