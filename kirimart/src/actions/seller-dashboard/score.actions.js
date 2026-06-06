'use server'
import { db } from "@/config/db";
import { stores, storeMetrics } from "@/config/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function getMyStoreMetrics() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            return { success: false, message: "Anda tidak memiliki sesi" }
        }

        const myStore = await db.query.stores.findFirst({
            where: eq(stores.userId, session.user.id),
        });

        if (!myStore) {
             return { success: false, message: "Toko tidak ditemukan" }
        }

        const metrics = await db.query.storeMetrics.findFirst({
            where: eq(storeMetrics.storeId, myStore.id)
        });

        return {
            success: true,
            data: metrics,
        }
    } catch (error) {
        console.error("[getMyStoreMetrics] error", error);
        return {
            success: false,
            message: "Gagal mengambil data metrik toko",
        }
    }
}
