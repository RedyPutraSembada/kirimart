'use server'
import { db } from "@/config/db";
import { stores, addresses } from "@/config/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function getMyStore() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return {
                success: false,
                message: "Anda tidak memiliki sesi",
            }
        }
        const myStore = await db.query.stores.findFirst({
            where: eq(stores.userId, session.user.id),
            with: {
                address: true,
                products: {
                    columns: { id: true, name: true, soldCount: true, visibilityScore: true },
                },
            }
        });
        console.log("myStore", myStore);
        return {
            success: true,
            data: myStore,
        }
    } catch (error) {
        console.log("error", error);
        return {
            success: false,
            message: "Gagal mengambil data toko",
        }
    }
}

/**
 * Simpan atau update alamat toko (seller).
 * Jika toko sudah punya addressId → update address yang ada.
 * Jika belum → buat address baru dan link ke toko.
 */
export async function saveStoreAddressAction(data) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return { success: false, error: "Tidak ada sesi aktif." }
        }

        // Cari toko milik user
        const myStore = await db.query.stores.findFirst({
            where: eq(stores.userId, session.user.id),
        });

        if (!myStore) {
            return { success: false, error: "Toko tidak ditemukan." }
        }

        // Validasi: biteshipAreaId wajib
        if (!data.biteshipAreaId) {
            return { success: false, error: "Pilih wilayah terlebih dahulu." }
        }

        const addressData = {
            userId: session.user.id,
            storeId: myStore.id,
            label: data.label || "Toko",
            biteshipAreaId: data.biteshipAreaId,
            recipientName: data.recipientName || myStore.name,
            recipientPhone: data.recipientPhone || null,
            provinceId: data.provinceId || data.provinceName || null,
            provinceName: data.provinceName || null,
            cityId: data.cityId || data.cityName || null,
            cityName: data.cityName || null,
            kecamatanId: data.kecamatanId || data.kecamatanName || null,
            kecamatanName: data.kecamatanName || null,
            kelurahanId: data.kelurahanId || null,
            zipcode: data.zipcode || null,
            detailAddress: data.detailAddress || "",
            latitude: data.latitude || null,
            longitude: data.longitude || null,
        }

        if (myStore.addressId) {
            // Update alamat yang sudah ada
            const updated = await db.update(addresses)
                .set(addressData)
                .where(eq(addresses.id, myStore.addressId))
                .returning()

            return { success: true, data: updated[0] }
        } else {
            // Buat alamat baru
            const [newAddress] = await db.insert(addresses)
                .values(addressData)
                .returning()

            // Link ke toko
            await db.update(stores)
                .set({ addressId: newAddress.id })
                .where(eq(stores.id, myStore.id))

            return { success: true, data: newAddress }
        }
    } catch (error) {
        console.error("Error saving store address:", error)
        return { success: false, error: "Gagal menyimpan alamat toko." }
    }
}

/**
 * Update daftar kurir yang diaktifkan oleh Seller.
 * @param {string} couriers - Kode kurir dipisah koma, misal "jne,sicepat,jnt"
 */
export async function updateStoreCouriersAction(couriers) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return { success: false, error: "Tidak ada sesi aktif." }
        }

        const myStore = await db.query.stores.findFirst({
            where: eq(stores.userId, session.user.id),
        });

        if (!myStore) {
            return { success: false, error: "Toko tidak ditemukan." }
        }

        if (!couriers || couriers.trim().length === 0) {
            return { success: false, error: "Pilih minimal 1 kurir." }
        }

        await db.update(stores)
            .set({ enabledCouriers: couriers.trim() })
            .where(eq(stores.id, myStore.id))

        return { success: true }
    } catch (error) {
        console.error("Error updating store couriers:", error)
        return { success: false, error: "Gagal menyimpan pengaturan kurir." }
    }
}

/**
 * Update profil toko (nama, deskripsi, jam operasional, dll).
 */
export async function updateStoreProfile(data) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return { success: false, error: "Tidak ada sesi aktif." }
        }

        const myStore = await db.query.stores.findFirst({
            where: eq(stores.userId, session.user.id),
        });

        if (!myStore) {
            return { success: false, error: "Toko tidak ditemukan." }
        }

        // Validasi
        if (!data.name?.trim()) {
            return { success: false, error: "Nama toko wajib diisi." }
        }

        if (!data.domainSlug?.trim()) {
            return { success: false, error: "Domain toko wajib diisi." }
        }

        // Cek domain unik (jika berubah)
        if (data.domainSlug !== myStore.domainSlug) {
            const existing = await db.query.stores.findFirst({
                where: eq(stores.domainSlug, data.domainSlug.trim()),
            })
            if (existing) {
                return { success: false, error: "Domain toko sudah digunakan oleh toko lain." }
            }
        }

        await db.update(stores)
            .set({
                name: data.name.trim(),
                domainSlug: data.domainSlug.trim(),
                description: data.description?.trim() || null,
                openTime: data.openTime || "09:00",
                closeTime: data.closeTime || "21:00",
                metaPixelId: data.metaPixelId?.trim() || null,
            })
            .where(eq(stores.id, myStore.id))

        		// === LOG ACTIVITY ===
		try {
			const { logActivity } = await import("@/lib/activity-logger")
			await logActivity({
				userId: session.user.id,
				storeId: myStore.id,
				action: "UPDATE_STORE_INFO",
				entityType: "store",
				entityId: myStore.id,
				details: { name: data.name.trim(), domainSlug: data.domainSlug.trim() }
			})
		} catch (e) { console.error(e) }

		return { success: true, message: "Profil toko berhasil diperbarui!" }
    } catch (error) {
        console.error("Error updating store profile:", error)
        return { success: false, error: "Gagal menyimpan profil toko." }
    }
}