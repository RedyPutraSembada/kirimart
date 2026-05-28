/**
 * Script: Sinkronisasi soldCount untuk semua produk berdasarkan pesanan yang sudah 'completed'.
 * 
 * Command: node scripts/sync-product-sold-count.mjs
 */

import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import { sql } from "drizzle-orm"

const { Pool } = pg

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
})

const db = drizzle(pool)

async function syncProductSoldCount() {
	console.log("🔄 Sinkronisasi soldCount untuk semua produk...")

	// Ambil semua produk yang memiliki item pesanan dengan status order 'completed'
	const results = await db.execute(sql`
		UPDATE products p
		SET 
			sold_count = sub.total_sold
		FROM (
			SELECT 
				oi.product_id,
				SUM(oi.quantity)::int AS total_sold
			FROM order_items oi
			JOIN orders o ON oi.order_id = o.id
			WHERE o.status = 'completed'
			GROUP BY oi.product_id
		) sub
		WHERE p.id = sub.product_id
	`)

	console.log("✅ Sinkronisasi soldCount selesai!")
	console.log(`   Produk yang di-update: ${results.rowCount || "semua yang punya penjualan"}`)

	// Reset produk yang tidak memiliki penjualan 'completed'
	const resetResult = await db.execute(sql`
		UPDATE products
		SET sold_count = 0
		WHERE id NOT IN (
			SELECT DISTINCT oi.product_id 
			FROM order_items oi
			JOIN orders o ON oi.order_id = o.id
			WHERE o.status = 'completed'
		)
		AND sold_count != 0
	`)

	console.log(`   Produk yang di-reset ke 0: ${resetResult.rowCount || 0}`)

	await pool.end()
	console.log("🏁 Selesai. Koneksi ditutup.")
}

syncProductSoldCount().catch((err) => {
	console.error("❌ Error:", err)
	process.exit(1)
})
