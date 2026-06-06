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

		const phoneNumberToSave = parsed.data.phoneNumber?.trim() || null

		// Check if phone number is already taken by someone else
		if (phoneNumberToSave) {
			const existingUser = await db.query.user.findFirst({
				where: (users, { eq, and, ne }) => 
					and(
						eq(users.phoneNumber, phoneNumberToSave),
						ne(users.id, session.user.id)
					)
			})
			if (existingUser) {
				return { success: false, error: "Nomor handphone sudah digunakan oleh pengguna lain." }
			}
		}

		await db.update(user)
			.set({
				name: parsed.data.name,
				image: parsed.data.image,
				phoneNumber: phoneNumberToSave,
			})
			.where(eq(user.id, session.user.id))

		return { success: true }
	} catch (error) {
		console.error("updateProfileAction error", error)
		// Catch unique constraint violation error code (Postgres: 23505)
		if (error.code === '23505') {
			return { success: false, error: "Nomor handphone sudah digunakan." }
		}
		return { success: false, error: "Terjadi kesalahan server" }
	}
}
