import { db } from "@/config/db"
import { activityLogs } from "@/config/db/schema"
import { headers } from "next/headers"

/**
 * Fungsi pembantu untuk mencatat aktivitas sistem (Audit Trail).
 * 
 * @param {Object} params
 * @param {string|null} [params.userId=null] - ID Pengguna (bisa null jika anonim)
 * @param {number|null} [params.storeId=null] - ID Toko (jika aktivitas terkait toko tertentu)
 * @param {string} params.action - Aksi yang dilakukan (misal: "UPDATE_ORDER_STATUS", "LOGIN_FAILED")
 * @param {string} params.entityType - Tipe entitas (misal: "order", "product", "auth")
 * @param {string|null} [params.entityId=null] - ID entitas yang dipengaruhi
 * @param {Object} [params.details={}] - Data tambahan (JSON) seperti perubahan status
 * @param {any} [tx=null] - Database transaction object (opsional, jika fungsi dipanggil di dalam db.transaction)
 */
export async function logActivity({
	userId = null,
	storeId = null,
	action,
	entityType,
	entityId = null,
	details = {}
}, tx = null) {
	try {
		// Dapatkan informasi jaringan (bersifat opsional jika tidak dipanggil via request HTTP)
		let ipAddress = "unknown";
		let userAgent = "unknown";
		try {
			const reqHeaders = await headers();
			ipAddress = reqHeaders.get("x-forwarded-for") || reqHeaders.get("x-real-ip") || "unknown";
			userAgent = reqHeaders.get("user-agent") || "unknown";
		} catch (headerError) {
			// Mengabaikan error jika fungsi tidak dijalankan di konteks request Next.js (contoh: cron job)
		}

		const data = {
			userId,
			storeId,
			action,
			entityType,
			entityId: entityId ? String(entityId) : null,
			details,
			ipAddress,
			userAgent,
		};

		// Gunakan transaksi jika disediakan, agar konsisten dengan rollback
		if (tx) {
			await tx.insert(activityLogs).values(data);
		} else {
			await db.insert(activityLogs).values(data);
		}
		
	} catch (error) {
		// Log failed silently agar tidak menghentikan fungsi bisnis utama
		console.error("[ActivityLogger] Failed to log activity:", error);
	}
}
