"use server"

import { db } from "@/config/db"
import { addresses } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"

export async function getUserAddressesAction() {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Tidak ada sesi aktif" }
		}

		// Ambil alamat milik user ini (storeId = null)
		const userAddresses = await db.select()
			.from(addresses)
			.where(
				eq(addresses.userId, session.user.id)
			)
		
		return { success: true, data: userAddresses }
	} catch (error) {
		console.error("Error fetching user addresses:", error)
		return { success: false, error: "Gagal memuat buku alamat" }
	}
}

export async function saveUserAddressAction(data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Tidak ada sesi aktif" }
		}

		const newAddress = await db.insert(addresses).values({
			userId: session.user.id,
			recipientName: data.recipientName,
			recipientPhone: data.recipientPhone,
			provinceId: data.provinceId,
			cityId: data.cityId,
			kecamatanId: data.kecamatanId,
			kelurahanId: data.kelurahanId,
			zipcode: data.zipcode,
			detailAddress: data.detailAddress,
		}).returning()

		return { success: true, data: newAddress[0] }
	} catch (error) {
		console.error("Error saving user address:", error)
		return { success: false, error: "Gagal menyimpan alamat" }
	}
}
