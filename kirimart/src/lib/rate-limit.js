import { Redis } from "ioredis";
import { env } from "@/config/env";

const redis = new Redis(env.REDIS_URL || "redis://localhost:6379");

/**
 * Mengecek dan mencatat jumlah request per identifier (misal IP address).
 * @param {string} identifier IP Address atau User ID
 * @param {number} limit Batas maksimal request dalam jendela waktu
 * @param {number} windowSeconds Jendela waktu dalam detik
 * @returns {Promise<{success: boolean, remaining: number}>}
 */
export async function checkRateLimit(identifier, limit = 10, windowSeconds = 60) {
  try {
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
