/**
 * Script: Sinkronisasi totalReviews untuk semua produk yang sudah punya review.
 * 
 * Jalankan sekali saja setelah kolom total_reviews ditambahkan ke tabel products.
 * Command: node scripts/sync-product-reviews.mjs
 */

import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import pg from "pg"
import { sql, eq, avg } from "drizzle-orm"

const { Pool } = pg

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
})

const db = drizzle(pool)

async function syncProductReviews() {
	console.log("🔄 Sinkronisasi totalReviews & rating untuk semua produk...")

	// Ambil semua produk yang punya review, hitung avg rating dan total count
	const results = await db.execute(sql`
		UPDATE products p
		SET 
			total_reviews = sub.cnt,
			rating = ROUND(sub.avg_rating::numeric, 1)
		FROM (
			SELECT 
				product_id,
				COUNT(*)::int AS cnt,
				AVG(rating) AS avg_rating
			FROM reviews
			GROUP BY product_id
		) sub
		WHERE p.id = sub.product_id
	`)

	console.log("✅ Sinkronisasi selesai!")
	console.log(`   Produk yang di-update: ${results.rowCount || "semua yang punya review"}`)

	// Reset produk yang TIDAK punya review ke default
	const resetResult = await db.execute(sql`
		UPDATE products
		SET total_reviews = 0, rating = '5.0'
		WHERE id NOT IN (SELECT DISTINCT product_id FROM reviews)
		AND (total_reviews != 0 OR rating != '5.0')
	`)

	console.log(`   Produk yang di-reset ke default: ${resetResult.rowCount || 0}`)

	await pool.end()
	console.log("🏁 Selesai. Koneksi ditutup.")
}

syncProductReviews().catch((err) => {
	console.error("❌ Error:", err)
	process.exit(1)
})
