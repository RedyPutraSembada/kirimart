/**
 * Fix Store Balances
 * 
 * Script untuk memperbaiki saldo toko yang salah karena perhitungan lama.
 * Kode lama: balance += grandTotal (termasuk ongkir)
 * Kode baru: balance += grandTotal - totalShipping - platformFee
 * 
 * Jalankan: bun run src/config/db/fix-store-balances.js
 */
import 'dotenv/config'
import { drizzle } from "drizzle-orm/node-postgres"
import { eq, and, sql, sum } from "drizzle-orm"

// Import schemas directly
import * as schema from "./schema/index.js"

const db = drizzle({
	connection: process.env.DATABASE_URL,
	schema,
	mode: 'default',
})

async function fixBalances() {
	console.log("🔧 Memperbaiki saldo toko...\n")

	// Ambil semua toko
	const allStores = await db.select().from(schema.stores)

	for (const store of allStores) {
		// Hitung pendapatan bersih dari pesanan yang sudah completed
		const [stats] = await db
			.select({
				totalGross: sum(schema.orders.grandTotal),
				totalShipping: sum(schema.orders.totalShipping),
				totalPlatformFee: sum(schema.orders.platformFee),
			})
			.from(schema.orders)
			.where(and(
				eq(schema.orders.storeId, store.id),
				eq(schema.orders.status, "completed")
			))

		const totalGross = parseInt(stats?.totalGross || 0)
		const totalShipping = parseInt(stats?.totalShipping || 0)
		const totalPlatformFee = parseInt(stats?.totalPlatformFee || 0)
		const netIncome = totalGross - totalShipping - totalPlatformFee

		// Saldo bersih = pendapatan bersih - yang sudah ditarik
		const correctBalance = Math.max(0, netIncome - (store.withdrawnAmount || 0))

		if (store.balance !== correctBalance) {
			console.log(`📦 Toko: ${store.name} (ID: ${store.id})`)
			console.log(`   Saldo lama: Rp ${store.balance.toLocaleString('id-ID')}`)
			console.log(`   Saldo baru: Rp ${correctBalance.toLocaleString('id-ID')}`)
			console.log(`   (Gross: ${totalGross}, Ongkir: ${totalShipping}, Komisi: ${totalPlatformFee}, Ditarik: ${store.withdrawnAmount})`)
			
			await db.update(schema.stores)
				.set({ balance: correctBalance })
				.where(eq(schema.stores.id, store.id))
			
			console.log(`   ✅ Diperbaiki!\n`)
		} else {
			console.log(`✓ ${store.name} — saldo sudah benar (Rp ${correctBalance.toLocaleString('id-ID')})`)
		}
	}

	console.log("\n✅ Selesai!")
	process.exit(0)
}

fixBalances().catch(e => { console.error(e); process.exit(1) })
