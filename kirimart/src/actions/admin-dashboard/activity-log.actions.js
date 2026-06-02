"use server"

import { db } from "@/config/db"
import { activityLogs, user, stores } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { desc, eq, and, sql, ilike } from "drizzle-orm"
import { headers } from "next/headers"

async function verifyAdmin() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session || session.user.role !== "admin") return null
	return session
}

export async function getActivityLogs(filters = {}, page = 1, perPage = 20) {
	try {
		const session = await verifyAdmin()
		if (!session) return { success: false, error: "Unauthorized" }

		const offset = (page - 1) * perPage

		const whereConditions = []
		if (filters.action) {
			whereConditions.push(eq(activityLogs.action, filters.action))
		}
		if (filters.entityType) {
			whereConditions.push(eq(activityLogs.entityType, filters.entityType))
		}

		const finalWhere = whereConditions.length > 0 ? and(...whereConditions) : undefined

		// We use standard queries, but joining users and stores to get their names.
		// Since we didn't define relations in activity-log-schema explicitly for drizzle query builder, we can use sql or inner joins.
		// Drizzle relational query is easier if relations are defined, but since we didn't add it to relations.js yet, we use standard select.
		
		const dataQuery = db.select({
			id: activityLogs.id,
			userId: activityLogs.userId,
			storeId: activityLogs.storeId,
			action: activityLogs.action,
			entityType: activityLogs.entityType,
			entityId: activityLogs.entityId,
			details: activityLogs.details,
			ipAddress: activityLogs.ipAddress,
			userAgent: activityLogs.userAgent,
			createdAt: activityLogs.createdAt,
			userName: user.name,
			storeName: stores.name,
		})
		.from(activityLogs)
		.leftJoin(user, eq(activityLogs.userId, user.id))
		.leftJoin(stores, eq(activityLogs.storeId, stores.id))

		if (finalWhere) {
			dataQuery.where(finalWhere)
		}

		dataQuery.orderBy(desc(activityLogs.createdAt)).limit(perPage).offset(offset)

		const logs = await dataQuery

		// Get total count
		let countQuery = db.select({ count: sql`count(*)` }).from(activityLogs)
		if (finalWhere) {
			countQuery = countQuery.where(finalWhere)
		}
		const totalResult = await countQuery
		const total = Number(totalResult[0].count)

		return {
			success: true,
			data: logs,
			total,
			page,
			perPage,
			nextPage: offset + perPage < total ? page + 1 : null
		}
	} catch (error) {
		console.error("[getActivityLogs]", error)
		return { success: false, error: "Gagal mengambil log aktivitas." }
	}
}
