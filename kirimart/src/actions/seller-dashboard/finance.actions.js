/**
 * Seller Finance Server Actions
 * 
 * Operasi keuangan toko: cek saldo, tarik dana, riwayat penarikan.
 */
"use server"

import { db } from "@/config/db"
import { stores, withdrawals, orders } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, desc, sql, count, sum } from "drizzle-orm"
import { headers } from "next/headers"

// ============================================
// HELPER: Get current seller's store
// ============================================

async function getSellerStore() {
	const session = await auth.api.getSession({ headers: await headers() })
	if (!session) return null

	const store = await db.query.stores.findFirst({
		where: eq(stores.userId, session.user.id),
	})
	return store
}

// ============================================
// GET FINANCE SUMMARY
// ============================================

/**
 * Mengambil ringkasan keuangan toko:
 * - Saldo aktif (bisa ditarik)
 * - Total uang yang sudah ditarik
 * - Total pendapatan keseluruhan (saldo + ditarik)
 * - Info rekening bank
 * - Riwayat penarikan
 */
export async function getFinanceSummary(days = 7) {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		// Ambil riwayat penarikan
		const withdrawalHistory = await db.query.withdrawals.findMany({
			where: eq(withdrawals.storeId, store.id),
			orderBy: [desc(withdrawals.createdAt)],
		})

		// Hitung total pesanan selesai (all time)
		const [completedStats] = await db
			.select({
				totalOrders: count(),
				totalGross: sum(orders.grandTotal),
				totalShipping: sum(orders.totalShipping),
				totalPlatformFee: sum(orders.platformFee),
			})
			.from(orders)
			.where(and(
				eq(orders.storeId, store.id),
				eq(orders.status, "completed")
			))

		const totalGross = parseInt(completedStats?.totalGross || 0)
		const totalShipping = parseInt(completedStats?.totalShipping || 0)
		const totalPlatformFee = parseInt(completedStats?.totalPlatformFee || 0)
		const netIncome = totalGross - totalShipping - totalPlatformFee

		// --- HITUNG DATA GRAFIK (CHART DATA) ---
		// Batas tanggal
		const cutoffDate = new Date()
		cutoffDate.setDate(cutoffDate.getDate() - days)
		cutoffDate.setHours(0, 0, 0, 0)

		// Ambil data order beberapa hari terakhir untuk grafik
		const recentOrders = await db.query.orders.findMany({
			where: and(
				eq(orders.storeId, store.id),
				eq(orders.status, "completed"),
				sql`${orders.createdAt} >= ${cutoffDate}`
			),
			columns: {
				createdAt: true,
				grandTotal: true,
				totalShipping: true,
				platformFee: true,
			}
		})

		// Proses grouping harian pakai JS agar aman di berbagai tipe DB
		const chartMap = new Map()
		
		// Inisialisasi hari agar grafik tidak bolong jika hari itu tidak ada penjualan
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date()
			d.setDate(d.getDate() - i)
			const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
			chartMap.set(dateStr, { date: dateStr, netIncome: 0, gross: 0 })
		}

		recentOrders.forEach(o => {
			const d = new Date(o.createdAt)
			const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
			if (chartMap.has(dateStr)) {
				const current = chartMap.get(dateStr)
				const oGross = parseInt(o.grandTotal || 0)
				const oShip = parseInt(o.totalShipping || 0)
				const oFee = parseInt(o.platformFee || 0)
				const oNet = oGross - oShip - oFee

				chartMap.set(dateStr, {
					date: dateStr,
					netIncome: current.netIncome + oNet,
					gross: current.gross + oGross,
				})
			}
		})

		const chartData = Array.from(chartMap.values())

		return {
			success: true,
			data: {
				balance: store.balance,
				withdrawnAmount: store.withdrawnAmount,
				totalRevenue: (store.balance || 0) + (store.withdrawnAmount || 0),
				completedOrders: completedStats?.totalOrders || 0,
				// Breakdown detail
				totalGross,
				totalShipping,
				totalPlatformFee,
				netIncome,
				chartData, // <== Data baru untuk grafik
				bank: {
					bankName: store.bankName,
					accountNumber: store.bankAccountNumber,
					accountHolder: store.bankAccountHolder,
				},
				withdrawals: withdrawalHistory,
			}
		}
	} catch (error) {
		console.error("[getFinanceSummary]", error)
		return { success: false, error: "Gagal mengambil data keuangan." }
	}
}

// ============================================
// UPDATE BANK INFO
// ============================================

/**
 * Mengupdate informasi rekening bank toko.
 */
export async function updateBankInfo(bankName, accountNumber, accountHolder) {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		if (!bankName || !accountNumber || !accountHolder) {
			return { success: false, error: "Semua field rekening bank wajib diisi." }
		}

		await db.update(stores)
			.set({
				bankName,
				bankAccountNumber: accountNumber,
				bankAccountHolder: accountHolder,
			})
			.where(eq(stores.id, store.id))

		return { success: true, message: "Informasi rekening berhasil diperbarui." }
	} catch (error) {
		console.error("[updateBankInfo]", error)
		return { success: false, error: "Gagal memperbarui rekening." }
	}
}

// ============================================
// REQUEST WITHDRAWAL
// ============================================

/**
 * Meminta penarikan dana dari saldo toko.
 * Validasi:
 * - Toko harus sudah mengisi rekening bank
 * - Jumlah penarikan harus > 0 dan <= saldo aktif
 * - Minimal penarikan Rp 10.000
 */
export async function requestWithdrawal(amount) {
	try {
		const store = await getSellerStore()
		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		// Validasi: rekening bank harus sudah diisi
		if (!store.bankName || !store.bankAccountNumber || !store.bankAccountHolder) {
			return { success: false, error: "Anda harus mengisi informasi rekening bank terlebih dahulu sebelum menarik dana." }
		}

		// Validasi jumlah
		const withdrawAmount = parseInt(amount)
		if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
			return { success: false, error: "Jumlah penarikan tidak valid." }
		}

		if (withdrawAmount < 10000) {
			return { success: false, error: "Minimal penarikan adalah Rp 10.000." }
		}

		if (withdrawAmount > store.balance) {
			return { success: false, error: "Saldo tidak mencukupi." }
		}

		await db.transaction(async (tx) => {
			// 1. Kurangi saldo toko
			await tx.update(stores)
				.set({ balance: sql`balance - ${withdrawAmount}` })
				.where(eq(stores.id, store.id))

			// 2. Buat record withdrawal (snapshot data bank saat ini)
			await tx.insert(withdrawals).values({
				storeId: store.id,
				amount: withdrawAmount,
				bankName: store.bankName,
				bankAccountNumber: store.bankAccountNumber,
				bankAccountHolder: store.bankAccountHolder,
				status: "pending",
			})
		})

		return { success: true, message: "Permintaan penarikan dana berhasil dikirim. Menunggu persetujuan admin." }
	} catch (error) {
		console.error("[requestWithdrawal]", error)
		return { success: false, error: "Gagal membuat permintaan penarikan." }
	}
}
