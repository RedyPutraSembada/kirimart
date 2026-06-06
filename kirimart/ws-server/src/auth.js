/**
 * Auth Module — Verifikasi Session dari PostgreSQL
 *
 * Cara kerja:
 * 1. Client (browser) mengirim sessionToken saat connect WebSocket
 * 2. Modul ini query tabel "session" di PostgreSQL
 * 3. Jika session valid dan belum expired → return data user
 * 4. Jika tidak valid → throw error (koneksi ditolak)
 *
 * Tabel "session" dibuat otomatis oleh Better Auth di database Kawan Belanja.
 * Struktur: id, userId, token, expiresAt, ...
 */

import pg from "pg"
const { Pool } = pg

let pool = null

/**
 * Inisialisasi koneksi pool ke PostgreSQL.
 * Pool = kumpulan koneksi yang di-reuse (hemat resource).
 */
export function initAuthPool(databaseUrl) {
	pool = new Pool({
		connectionString: databaseUrl,
		max: 5, // Maksimal 5 koneksi bersamaan (WS server tidak butuh banyak)
		idleTimeoutMillis: 30000,
		connectionTimeoutMillis: 5000,
	})

	// Test koneksi saat startup
	pool.query("SELECT 1")
		.then(() => console.log("[AUTH] ✅ Connected to PostgreSQL"))
		.catch((err) => console.error("[AUTH] ❌ Failed to connect to PostgreSQL:", err.message))
}

/**
 * Verifikasi session token.
 *
 * @param {string} sessionToken - Token dari cookie "better-auth.session_token"
 * @returns {Promise<{ id: string, name: string, email: string, role: string, image: string } | null>}
 */
export async function verifySession(sessionToken) {
	if (!pool) {
		throw new Error("[AUTH] PostgreSQL pool not initialized. Call initAuthPool() first.")
	}

	if (!sessionToken) {
		console.log("[AUTH] No session token provided")
		return null
	}

	console.log("[AUTH] Verifying token:", sessionToken.substring(0, 10) + "...")

	try {
		// Query: JOIN session + user untuk mendapatkan data user
		// Better Auth menyimpan session di tabel "session" dengan kolom "token"
		const result = await pool.query(
			`SELECT
				s."user_id" AS "userId",
				s."expires_at" AS "expiresAt",
				u."name",
				u."email",
				u."role",
				u."image"
			FROM "session" s
			JOIN "user" u ON s."user_id" = u."id"
			WHERE s."token" = $1
			LIMIT 1`,
			[sessionToken]
		)

		if (result.rows.length === 0) {
			console.log("[AUTH] ❌ No session found for this token")
			return null
		}

		const session = result.rows[0]
		console.log("[AUTH] ✅ Session found for user:", session.name, "(expires:", session.expiresAt, ")")

		// Cek apakah session sudah expired
		if (new Date(session.expiresAt) < new Date()) {
			console.log("[AUTH] ❌ Session expired")
			return null
		}

		return {
			id: session.userId,
			name: session.name,
			email: session.email,
			role: session.role,
			image: session.image,
		}
	} catch (error) {
		console.error("[AUTH] Error verifying session:", error.message)
		return null
	}
}

/**
 * Tutup pool koneksi (dipanggil saat server shutdown).
 */
export async function closeAuthPool() {
	if (pool) {
		await pool.end()
		console.log("[AUTH] PostgreSQL pool closed.")
	}
}
