'use server'
import { db } from "@/config/db";
import { stores } from "@/config/db/schema";
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
                address: true
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