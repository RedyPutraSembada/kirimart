"use server"

import { db } from "@/config/db"
import { addresses } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { eq, and } from "drizzle-orm"

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

		// Filter hanya alamat personal (bukan alamat toko)
		const personalAddresses = userAddresses.filter(a => !a.storeId)

		return { success: true, data: personalAddresses }
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

		// Validasi: biteshipAreaId wajib ada
		if (!data.biteshipAreaId) {
			return { success: false, error: "Pilih wilayah terlebih dahulu." }
		}

		if (!data.detailAddress || !data.detailAddress.trim()) {
			return { success: false, error: "Alamat lengkap wajib diisi." }
		}

		const newAddress = await db.insert(addresses).values({
			userId: session.user.id,
			label: data.label || null,
			biteshipAreaId: data.biteshipAreaId,
			recipientName: data.recipientName || null,
			recipientPhone: data.recipientPhone || null,
			provinceId: data.provinceId || data.provinceName || null,
			provinceName: data.provinceName || null,
			cityId: data.cityId || data.cityName || null,
			cityName: data.cityName || null,
			kecamatanId: data.kecamatanId || data.kecamatanName || null,
			kecamatanName: data.kecamatanName || null,
			kelurahanId: data.kelurahanId || null,
			zipcode: data.zipcode || null,
			detailAddress: data.detailAddress,
			latitude: data.latitude || null,
			longitude: data.longitude || null,
			isDefault: data.isDefault || false,
		}).returning()

		return { success: true, data: newAddress[0] }
	} catch (error) {
		console.error("Error saving user address:", error)
		return { success: false, error: "Gagal menyimpan alamat" }
	}
}

export async function updateUserAddressAction(addressId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Tidak ada sesi aktif" }
		}

		// Verifikasi bahwa alamat ini milik user yang sedang login
		const [existingAddress] = await db.select()
			.from(addresses)
			.where(
				and(
					eq(addresses.id, addressId),
					eq(addresses.userId, session.user.id)
				)
			)
			.limit(1)

		if (!existingAddress) {
			return { success: false, error: "Alamat tidak ditemukan." }
		}

		const updated = await db.update(addresses)
			.set({
				label: data.label || existingAddress.label,
				biteshipAreaId: data.biteshipAreaId || existingAddress.biteshipAreaId,
				recipientName: data.recipientName || existingAddress.recipientName,
				recipientPhone: data.recipientPhone || existingAddress.recipientPhone,
				provinceId: data.provinceId || data.provinceName || existingAddress.provinceId,
				provinceName: data.provinceName || existingAddress.provinceName,
				cityId: data.cityId || data.cityName || existingAddress.cityId,
				cityName: data.cityName || existingAddress.cityName,
				kecamatanId: data.kecamatanId || data.kecamatanName || existingAddress.kecamatanId,
				kecamatanName: data.kecamatanName || existingAddress.kecamatanName,
				kelurahanId: data.kelurahanId || existingAddress.kelurahanId,
				zipcode: data.zipcode || existingAddress.zipcode,
				detailAddress: data.detailAddress || existingAddress.detailAddress,
				latitude: data.latitude !== undefined ? data.latitude : existingAddress.latitude,
				longitude: data.longitude !== undefined ? data.longitude : existingAddress.longitude,
				isDefault: data.isDefault ?? existingAddress.isDefault,
			})
			.where(eq(addresses.id, addressId))
			.returning()

		return { success: true, data: updated[0] }
	} catch (error) {
		console.error("Error updating user address:", error)
		return { success: false, error: "Gagal memperbarui alamat" }
	}
}

export async function deleteUserAddressAction(addressId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Tidak ada sesi aktif" }
		}

		// Verifikasi kepemilikan
		const [existingAddress] = await db.select()
			.from(addresses)
			.where(
				and(
					eq(addresses.id, addressId),
					eq(addresses.userId, session.user.id)
				)
			)
			.limit(1)

		if (!existingAddress) {
			return { success: false, error: "Alamat tidak ditemukan." }
		}

		await db.delete(addresses)
			.where(eq(addresses.id, addressId))

		return { success: true }
	} catch (error) {
		console.error("Error deleting user address:", error)
		return { success: false, error: "Gagal menghapus alamat" }
	}
}
