/**
 * Seed default platform settings
 * 
 * Jalankan sekali: node src/config/db/seed-platform-settings.js
 */
import 'dotenv/config'
import { db } from './index.js'
import { platformSettings } from './schema/platform-setting-schema.js'

const defaultSettings = [
	{
		key: "commission_tiers",
		value: JSON.stringify([
			{ minAmount: 0, maxAmount: 9999, type: "flat", value: 500, cap: null },
			{ minAmount: 10000, maxAmount: 49999, type: "percent", value: 2.5, cap: null },
			{ minAmount: 50000, maxAmount: null, type: "percent", value: 2.5, cap: 4000 },
		]),
		description: "Aturan komisi berjenjang. Tiap tier: minAmount, maxAmount (null=unlimited), type (flat/percent), value, cap (null=tanpa batas).",
	},
	{
		key: "service_fee",
		value: JSON.stringify({ type: "flat", value: 1000 }),
		description: "Biaya layanan per transaksi yang dibayar pembeli. type: flat (nominal tetap) atau percent (persentase dari subtotal).",
	},
]

async function seed() {
	console.log("Seeding platform settings...")
	for (const setting of defaultSettings) {
		try {
			await db.insert(platformSettings).values(setting).onConflictDoUpdate({
				target: platformSettings.key,
				set: { value: setting.value, description: setting.description, updatedAt: new Date() },
			})
			console.log(`  ✓ ${setting.key}`)
		} catch (e) {
			console.error(`  ✗ ${setting.key}:`, e.message)
		}
	}
	console.log("Done!")
	process.exit(0)
}

seed()
