import { getRedisClient } from "./redis";

/**
 * Mengecek dan mencatat jumlah request per identifier (misal IP address).
 * @param {string} identifier IP Address atau User ID
 * @param {number} limit Batas maksimal request dalam jendela waktu
 * @param {number} windowSeconds Jendela waktu dalam detik
 * @returns {Promise<{success: boolean, remaining: number}>}
 */
export async function checkRateLimit(identifier, limit = 10, windowSeconds = 60) {
  try {
    // Panggil redis HANYA saat fungsi ini dijalankan, bukan saat file di-import
    const redis = getRedisClient();

    // Jika Redis mati/gagal terhubung, loloskan request (graceful fallback)
    if (!redis) {
      return { success: true, remaining: 1 };
    }

    const key = `ratelimit:${identifier}`;

    // Menambah jumlah request
    const current = await redis.incr(key);

    // Jika baru pertama kali (current = 1), set waktu kadaluarsa (TTL)
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }

    // Jika masih ada sisa waktu tapi melebihi limit
    if (current > limit) {
      return { success: false, remaining: 0 };
    }

    return { success: true, remaining: limit - current };
  } catch (error) {
    // Fallback: Jika Redis error, biarkan request lolos agar aplikasi tidak mati
    console.error("Rate Limit Error:", error);
    return { success: true, remaining: 1 };
  }
}
