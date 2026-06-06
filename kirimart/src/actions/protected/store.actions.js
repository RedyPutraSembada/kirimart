"use server"

import { db } from "@/config/db"
import { addresses, stores } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { createStoreSchema } from "@/lib/validations/protected/create-store"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"

export async function createStore(formData) {
	try {
		// 1. Cek Autentikasi
		const session = await auth.api.getSession({
			headers: await headers(),
		})

		if (!session || !session.user) {
			return { success: false, error: "Unauthorized. Anda harus login." }
		}

		// if (session.user.role === "seller") {
		// 	return { success: false, error: "Anda sudah memiliki toko." }
		// }

		// 2. Validasi Data dengan Zod
		const validatedFields = createStoreSchema.safeParse(formData)

		if (!validatedFields.success) {
			return {
				success: false,
				error: "Data tidak valid. Silakan periksa kembali form Anda.",
			}
		}

		const { 
			name, domainSlug, detailAddress, logo, banner, description, bankName, bankAccountNumber, bankAccountHolder,
			recipientName, recipientPhone, label, biteshipAreaId, provinceName, cityName, kecamatanName,
			provinceId, cityId, kecamatanId, kelurahanId, zipcode, latitude, longitude
		} = validatedFields.data

		// 3. Cek apakah domain_slug sudah dipakai orang lain
		const existingStore = await db.query.stores.findFirst({
			where: eq(stores.domainSlug, domainSlug),
		})

		if (existingStore) {
			return {
				success: false,
				error: "Domain ini sudah digunakan oleh toko lain. Silakan pilih domain yang berbeda.",
			}
		}

		// 4. Proses Database (Transaction)
		await db.transaction(async (tx) => {
			// A. Insert Address
			const [newAddress] = await tx
				.insert(addresses)
				.values({
					userId: session.user.id,
					label: label || "Toko",
					biteshipAreaId,
					provinceId,
					provinceName,
					cityId,
					cityName,
					kecamatanId,
					kecamatanName,
					kelurahanId,
					zipcode,
					detailAddress,
					recipientName,
					recipientPhone,
					latitude,
					longitude,
				})
				.returning({ id: addresses.id })

			// B. Insert Store
			const [newStore] = await tx.insert(stores).values({
				userId: session.user.id,
				addressId: newAddress.id,
				name: name,
				domainSlug: domainSlug,
				logoUrl: logo || null,
				bannerUrl: banner || null,
				description: description || null,
				bankName: bankName,
				bankAccountNumber: bankAccountNumber,
				bankAccountHolder: bankAccountHolder,
			}).returning({ id: stores.id })

			// Update Address with the new Store ID
			await tx.update(addresses).set({ storeId: newStore.id }).where(eq(addresses.id, newAddress.id))

			// C. Update Role User menjadi Seller (Gunakan Better Auth API jika ada, atau update manual)
			// Karena Better Auth punya tabel user sendiri, kita bisa mengupdate langsung menggunakan Drizzle
			// Perhatian: skema `user` dari auth-schema tidak kita import di sini, lebih aman panggil dari auth-schema
		})

		// Import user dari auth-schema secara dinamis untuk menghindari circular dependency
		const { user } = await import("@/config/db/schema/auth-schema")
		await db.update(user).set({ role: "seller" }).where(eq(user.id, session.user.id))

		// === LOG ACTIVITY ===
		try {
			const { logActivity } = await import("@/lib/activity-logger")
			const createdStore = await db.query.stores.findFirst({ where: eq(stores.domainSlug, domainSlug) })
			if (createdStore) {
				await logActivity({
					userId: session.user.id,
					storeId: createdStore.id,
					action: "CREATE_STORE",
					entityType: "store",
					entityId: createdStore.id,
					details: { name, domainSlug }
				})
			}
		} catch (e) { console.error(e) }

		return { success: true }
	} catch (error) {
		console.error("[CREATE_STORE_ERROR]", error)
		return { success: false, error: "Terjadi kesalahan internal pada server." }
	}
}
