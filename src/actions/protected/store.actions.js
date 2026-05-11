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

		if (session.user.role === "seller") {
			return { success: false, error: "Anda sudah memiliki toko." }
		}

		// 2. Validasi Data dengan Zod
		const validatedFields = createStoreSchema.safeParse(formData)

		if (!validatedFields.success) {
			return {
				success: false,
				error: "Data tidak valid. Silakan periksa kembali form Anda.",
			}
		}

		const { name, domainSlug, province, city, detailAddress, logo, banner, description } =
			validatedFields.data

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
					provinceId: province, // Nanti diubah jadi ID RajaOngkir
					cityId: city, // Nanti diubah jadi ID RajaOngkir
					detailAddress: detailAddress,
				})
				.returning({ id: addresses.id })

			// B. Insert Store
			await tx.insert(stores).values({
				userId: session.user.id,
				addressId: newAddress.id,
				name: name,
				domainSlug: domainSlug,
				logoUrl: logo || null,
				bannerUrl: banner || null,
				description: description || null,
			})

			// C. Update Role User menjadi Seller (Gunakan Better Auth API jika ada, atau update manual)
			// Karena Better Auth punya tabel user sendiri, kita bisa mengupdate langsung menggunakan Drizzle
			// Perhatian: skema `user` dari auth-schema tidak kita import di sini, lebih aman panggil dari auth-schema
		})

		// Import user dari auth-schema secara dinamis untuk menghindari circular dependency
		const { user } = await import("@/config/db/schema/auth-schema")
		await db.update(user).set({ role: "seller" }).where(eq(user.id, session.user.id))


		return { success: true }
	} catch (error) {
		console.error("[CREATE_STORE_ERROR]", error)
		return { success: false, error: "Terjadi kesalahan internal pada server." }
	}
}
