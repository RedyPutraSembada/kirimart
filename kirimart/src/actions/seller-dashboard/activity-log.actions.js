"use server"

import { db } from "@/config/db"
import { activityLogs, stores, user } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { desc, eq, and, sql } from "drizzle-orm"
import { headers } from "next/headers"

async function getSellerStore() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null

	const store = await db.query.stores.findFirst({
		where: eq(stores.userId, session.user.id),
	})
	return store
}

export async function getStoreActivityLogs(filters = {}, page = 1, perPage = 20) {
	try {
		const store = await getSellerStore()
		if (!store) return { success: false, error: "Toko tidak ditemukan" }

		const offset = (page - 1) * perPage

		const whereConditions = [eq(activityLogs.storeId, store.id)]
		if (filters.action) {
			whereConditions.push(eq(activityLogs.action, filters.action))
		}
		if (filters.entityType) {
			whereConditions.push(eq(activityLogs.entityType, filters.entityType))
		}

		const finalWhere = and(...whereConditions)

		const dataQuery = db.select({
			id: activityLogs.id,
			userId: activityLogs.userId,
			action: activityLogs.action,
			entityType: activityLogs.entityType,
			entityId: activityLogs.entityId,
			details: activityLogs.details,
			ipAddress: activityLogs.ipAddress,
			userAgent: activityLogs.userAgent,
			createdAt: activityLogs.createdAt,
			userName: user.name,
		})
		.from(activityLogs)
		.leftJoin(user, eq(activityLogs.userId, user.id))
		.where(finalWhere)
		.orderBy(desc(activityLogs.createdAt))
		.limit(perPage)
		.offset(offset)

		const logs = await dataQuery

		const countQuery = await db.select({ count: sql`count(*)` })
			.from(activityLogs)
			.where(finalWhere)

		const total = Number(countQuery[0].count)

		return {
			success: true,
			data: logs,
			total,
			page,
			perPage,
			nextPage: offset + perPage < total ? page + 1 : null
		}
	} catch (error) {
		console.error("[getStoreActivityLogs]", error)
		return { success: false, error: "Gagal mengambil log aktivitas toko." }
	}
}
