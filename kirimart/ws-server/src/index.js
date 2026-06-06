/**
 * Kawan Belanja WebSocket Server — Entry Point
 *
 * Server ini menjalankan:
 * 1. Socket.IO WebSocket server (untuk koneksi real-time dari browser)
 * 2. Express HTTP server (untuk REST endpoint /emit dari Next.js)
 * 3. Redis Adapter (untuk scaling multi-instance di production)
 *
 * Alur startup:
 * 1. Connect ke Redis
 * 2. Connect ke PostgreSQL (untuk verifikasi session)
 * 3. Setup Socket.IO dengan Redis Adapter
 * 4. Setup namespace /chat dan /notifications
 * 5. Setup REST endpoint /emit
 * 6. Start listening di port 3001
 */

import { createServer } from "http"
import { Server } from "socket.io"
import express from "express"
import cors from "cors"
import { Redis } from "ioredis"
import { createAdapter } from "@socket.io/redis-adapter"

// Import modul internal
import { initAuthPool, verifySession, closeAuthPool } from "./auth.js"
import { setupChatNamespace } from "./namespaces/chat.js"
import { setupNotificationsNamespace } from "./namespaces/notifications.js"
import { createEmitRouter } from "./api/emit.js"
import { createJobsRouter } from "./api/jobs.js"
import { initWorkers, closeWorkers } from "./jobs/worker.js"

// ============================================
// KONFIGURASI
// ============================================

const PORT = process.env.PORT || 3001
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const WS_SECRET = process.env.WS_SECRET || "kawanbelanja-ws-secret-2026"
const DATABASE_URL = process.env.DATABASE_URL

// ALLOWED_ORIGINS bisa di-set via env (comma-separated) atau pakai default development
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
	? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
	: [
		"http://localhost:3000",
		"http://localhost:3001",
		"https://kawanbelanja.com",
		"https://www.kawanbelanja.com",
		"https://unintermingled-noncoincident-chandler.ngrok-free.app",
	]

// ============================================
// INISIALISASI
// ============================================

// 1. Express app (untuk REST API /emit dan /health)
const app = express()
app.use(cors({ origin: ALLOWED_ORIGINS }))
app.use(express.json())

// Health check endpoint (untuk Docker HEALTHCHECK)
app.get("/health", (req, res) => {
	res.json({
		status: "ok",
		uptime: Math.floor(process.uptime()),
		timestamp: new Date().toISOString(),
	})
})

// 2. HTTP Server
const httpServer = createServer(app)

// 3. Socket.IO Server
const io = new Server(httpServer, {
	cors: {
		origin: ALLOWED_ORIGINS,
		methods: ["GET", "POST"],
		credentials: true, // Penting: agar cookie dikirim dari browser
	},
	// Ping setiap 25 detik untuk menjaga koneksi tetap hidup
	pingInterval: 25000,
	pingTimeout: 20000,
})

// ============================================
// SETUP REDIS ADAPTER
// ============================================

async function setupRedis() {
	try {
		const pubClient = new Redis(REDIS_URL)
		const subClient = pubClient.duplicate()

		pubClient.on("error", (err) => console.error("[REDIS] Pub error:", err.message))
		subClient.on("error", (err) => console.error("[REDIS] Sub error:", err.message))

		// Tunggu kedua koneksi Redis siap
		await Promise.all([
			new Promise((resolve) => pubClient.on("ready", resolve)),
			new Promise((resolve) => subClient.on("ready", resolve)),
		])

		// Pasang Redis Adapter ke Socket.IO
		io.adapter(createAdapter(pubClient, subClient))
		console.log("[WS-SERVER] ✅ Connected to Redis")

		return { pubClient, subClient }
	} catch (error) {
		console.error("[WS-SERVER] ❌ Failed to connect to Redis:", error.message)
		console.warn("[WS-SERVER] ⚠️ Running WITHOUT Redis adapter (single instance only)")
		return null
	}
}

// ============================================
// SETUP AUTENTIKASI (Middleware Socket.IO)
// ============================================

/**
 * Middleware ini dijalankan SEBELUM koneksi WebSocket diterima.
 * Setiap client yang connect harus mengirim sessionToken.
 * Jika token tidak valid → koneksi ditolak.
 */
function setupAuthMiddleware() {
	// Middleware untuk SEMUA namespace
	io.use(async (socket, next) => {
		await authenticateSocket(socket, next)
	})

	// Middleware khusus per namespace
	io.of("/chat").use(async (socket, next) => {
		await authenticateSocket(socket, next)
	})

	io.of("/notifications").use(async (socket, next) => {
		await authenticateSocket(socket, next)
	})
}

async function authenticateSocket(socket, next) {
	try {
		const sessionToken = socket.handshake.auth.sessionToken

		if (!sessionToken) {
			return next(new Error("Authentication required: no session token"))
		}

		const user = await verifySession(sessionToken)

		if (!user) {
			return next(new Error("Authentication failed: invalid or expired session"))
		}

		// Simpan data user di socket untuk dipakai di namespace handlers
		socket.data.user = user
		next()
	} catch (error) {
		console.error("[AUTH MIDDLEWARE] Error:", error.message)
		next(new Error("Authentication error"))
	}
}

// ============================================
// SETUP REST EMIT API
// ============================================

function setupEmitApi() {
	const emitRouter = createEmitRouter(io, WS_SECRET)
	app.use(emitRouter)
	console.log("[WS-SERVER] ✅ REST emit API ready (POST /emit)")
}

// ============================================
// SETUP JOBS API
// ============================================

function setupJobsApi() {
	const jobsRouter = createJobsRouter(WS_SECRET)
	app.use(jobsRouter)
	console.log("[WS-SERVER] ✅ Jobs API ready (POST /jobs/schedule, GET /jobs/stats)")
}

// ============================================
// STARTUP
// ============================================

async function start() {
	console.log("─────────────────────────────────────────")
	console.log("  Kawan Belanja WebSocket Server")
	console.log("─────────────────────────────────────────")

	// 1. Init PostgreSQL connection pool (untuk auth)
	if (DATABASE_URL) {
		initAuthPool(DATABASE_URL)
	} else {
		console.warn("[WS-SERVER] ⚠️ DATABASE_URL not set — auth will be disabled")
	}

	// 2. Setup Redis
	const redis = await setupRedis()

	// 3. Setup auth middleware
	setupAuthMiddleware()

	// 4. Setup namespaces
	setupChatNamespace(io)
	setupNotificationsNamespace(io)

	// 5. Setup REST emit API
	setupEmitApi()

	// 6. Setup Jobs API (BullMQ scheduling)
	setupJobsApi()

	// 7. Start BullMQ Workers
	const workers = initWorkers()

	// 8. Start listening
	httpServer.listen(PORT, () => {
		console.log("─────────────────────────────────────────")
		console.log(`  🚀 WebSocket Server running on port ${PORT}`)
		console.log(`  📡 Namespaces: /chat, /notifications`)
		console.log(`  🔑 Auth: PostgreSQL session verification`)
		console.log(`  💾 Redis: ${redis ? "Connected" : "Not connected (standalone mode)"}`)
		console.log(`  ⚙️  BullMQ: Workers active (orders + payments)`)
		console.log("─────────────────────────────────────────")
	})

	// ─── GRACEFUL SHUTDOWN ───
	// Saat Docker kirim signal SIGTERM (stop container), tutup semua koneksi dengan rapi
	const shutdown = async (signal) => {
		console.log(`\n[WS-SERVER] ${signal} received. Shutting down gracefully...`)

		// Tutup Socket.IO (disconnect semua client)
		io.close()

		// Tutup BullMQ Workers
		await closeWorkers(workers)

		// Tutup Redis
		if (redis) {
			redis.pubClient.quit()
			redis.subClient.quit()
		}

		// Tutup PostgreSQL pool
		await closeAuthPool()

		// Tutup HTTP server
		httpServer.close(() => {
			console.log("[WS-SERVER] Server closed.")
			process.exit(0)
		})

		setTimeout(() => process.exit(1), 10000)
	}

	process.on("SIGTERM", () => shutdown("SIGTERM"))
	process.on("SIGINT", () => shutdown("SIGINT"))
}

// Jalankan!
start().catch((err) => {
	console.error("[WS-SERVER] Fatal error:", err)
	process.exit(1)
})
