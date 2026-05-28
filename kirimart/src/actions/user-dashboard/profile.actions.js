"use server"

import { db } from "@/config/db"
import { user } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { updateProfileSchema } from "@/lib/validations/user-dashboard/profile"

export async function updateProfileAction(data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const parsed = updateProfileSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data tidak valid" }
		}

		await db.update(user)
			.set({
				name: parsed.data.name,
				image: parsed.data.image,
				phoneNumber: parsed.data.phoneNumber,
			})
			.where(eq(user.id, session.user.id))

		return { success: true }
	} catch (error) {
		console.error("updateProfileAction error", error)
		return { success: false, error: "Terjadi kesalahan server" }
	}
}
