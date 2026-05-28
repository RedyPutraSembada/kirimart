/**
 * Admin Platform Settings Server Actions
 * 
 * CRUD untuk mengatur konfigurasi platform (komisi, biaya layanan, dll).
 */
"use server"

import { db } from "@/config/db"
import { platformSettings } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Verify admin role
// ============================================

async function verifyAdmin() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session || session.user.role !== "admin") return null
	return session
}

// ============================================
// GET ALL SETTINGS
// ============================================

export async function getPlatformSettings() {
	try {
		const session = await verifyAdmin()
		if (!session) return { success: false, error: "Unauthorized." }

		const settings = await db.select().from(platformSettings)

		// Parse values yang berupa JSON
		const parsed = {}
		for (const s of settings) {
			try {
				parsed[s.key] = { ...s, parsedValue: JSON.parse(s.value) }
			} catch {
				parsed[s.key] = { ...s, parsedValue: s.value }
			}
		}

		return { success: true, data: parsed }
	} catch (error) {
		console.error("[getPlatformSettings]", error)
		return { success: false, error: "Gagal mengambil pengaturan." }
	}
}

// ============================================
// UPDATE SETTING
// ============================================

/**
 * Update sebuah platform setting berdasarkan key.
 * Jika belum ada, insert baru (upsert).
 */
export async function updatePlatformSetting(key, value, description) {
	try {
		const session = await verifyAdmin()
		if (!session) return { success: false, error: "Unauthorized." }

		if (!key || value === undefined) {
			return { success: false, error: "Key dan value wajib diisi." }
		}

		// Stringify jika berupa object/array
		const valueStr = typeof value === "string" ? value : JSON.stringify(value)

		const existing = await db.query.platformSettings.findFirst({
			where: eq(platformSettings.key, key),
		})

		if (existing) {
			await db.update(platformSettings)
				.set({ value: valueStr, description: description || existing.description, updatedAt: new Date() })
				.where(eq(platformSettings.key, key))
		} else {
			await db.insert(platformSettings).values({
				key,
				value: valueStr,
				description: description || null,
			})
		}

		return { success: true, message: "Pengaturan berhasil disimpan." }
	} catch (error) {
		console.error("[updatePlatformSetting]", error)
		return { success: false, error: "Gagal menyimpan pengaturan." }
	}
}
