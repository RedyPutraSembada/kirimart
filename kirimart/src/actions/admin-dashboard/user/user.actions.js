"use server"

import { db } from "@/config/db"
import { user } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { and, count, eq, ilike, or } from "drizzle-orm"
import { headers } from "next/headers"
import { updateUserRoleSchema, banUserSchema } from "@/lib/validations/admin-dashboard/user/user"

export async function getUsers(filters = {}, page = 1, perPage = 10) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin (Unauthorized)" }
		}

		const offset = (page - 1) * perPage

		const whereConditions = []

		if (filters.search) {
			whereConditions.push(
				or(
					ilike(user.name, `%${filters.search}%`),
					ilike(user.email, `%${filters.search}%`)
				)
			)
		}

		if (filters.role) {
			whereConditions.push(eq(user.role, filters.role))
		}

		if (filters.status) {
			if (filters.status === "banned") {
				whereConditions.push(eq(user.banned, true))
			} else if (filters.status === "active") {
				whereConditions.push(eq(user.banned, false))
			}
		}

		const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

		const totalResult = await db
			.select({ value: count() })
			.from(user)
			.where(finalWhere)

		const total = totalResult[0].value

		const users = await db.query.user.findMany({
			where: finalWhere,
			orderBy: (user, { desc }) => [desc(user.createdAt)],
			limit: perPage,
			offset: offset,
		})

		const nextPage = offset + perPage < total ? page + 1 : null

		return {
			success: true,
			data: users,
			total,
			page,
			perPage,
			nextPage
		}
	} catch (error) {
		console.error("getUsers error", error)
		return { success: false, error: "Gagal mengambil daftar pengguna" }
	}
}

export async function updateUserRole(userId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		if (userId === session.user.id) {
			return { success: false, error: "Anda tidak dapat mengubah role diri sendiri" }
		}

		const parsed = updateUserRoleSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data role tidak valid" }
		}

		await db.update(user).set({
			role: parsed.data.role
		}).where(eq(user.id, userId))

		return { success: true }
	} catch (error) {
		console.error("updateUserRole error", error)
		return { success: false, error: "Gagal memperbarui role pengguna" }
	}
}

export async function banUserAction(userId, data) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		if (userId === session.user.id) {
			return { success: false, error: "Anda tidak dapat melakukan ban pada diri sendiri" }
		}

		const parsed = banUserSchema.safeParse(data)
		if (!parsed.success) {
			return { success: false, error: "Data tidak valid" }
		}

		await db.update(user).set({
			banned: true,
			banReason: parsed.data.banReason || null,
			banExpires: parsed.data.banExpires || null,
		}).where(eq(user.id, userId))

		return { success: true }
	} catch (error) {
		console.error("banUser error", error)
		return { success: false, error: "Gagal melakukan ban pengguna" }
	}
}

export async function unbanUserAction(userId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		await db.update(user).set({
			banned: false,
			banReason: null,
			banExpires: null,
		}).where(eq(user.id, userId))

		return { success: true }
	} catch (error) {
		console.error("unbanUser error", error)
		return { success: false, error: "Gagal membuka ban pengguna" }
	}
}

export async function deleteUserAction(userId) {
	try {
		const session = await auth.api.getSession({
			headers: await headers()
		})

		if (!session || session.user.role !== "admin") {
			return { success: false, error: "Anda tidak memiliki akses admin" }
		}

		if (userId === session.user.id) {
			return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri" }
		}

		// Hapus permanen
		await db.delete(user).where(eq(user.id, userId))

		return { success: true }
	} catch (error) {
		console.error("deleteUser error", error)
		return { success: false, error: "Gagal menghapus pengguna secara permanen" }
	}
}
