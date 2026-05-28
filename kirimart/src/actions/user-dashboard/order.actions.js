"use server"

import { db } from "@/config/db"
import { payments, orders, stores, reviews, products, orderItems } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, desc, and, avg, sql } from "drizzle-orm"
import { headers } from "next/headers"

/**
 * Mengambil semua riwayat transaksi/pembayaran milik user yang sedang login.
 * Menampilkan transaksi pending, sukses, maupun gagal.
 */
export async function getMyTransactionHistory() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const myPayments = await db.query.payments.findMany({
			where: eq(payments.userId, session.user.id),
			orderBy: [desc(payments.createdAt)],
			with: {
				orders: {
					with: {
						store: {
							columns: { id: true, name: true, logoUrl: true }
						},
						items: {
							with: {
								product: {
									with: { images: true }
								}
							}
						}
					}
				}
			}
		})

		return { success: true, data: myPayments }
	} catch (error) {
		console.error("[getMyTransactionHistory]", error)
		return { success: false, error: "Gagal mengambil riwayat transaksi" }
	}
}

/**
 * Mengambil detail pesanan berdasarkan ID Pesanan (Order ID),
 * lengkap dengan relasi toko, items, payment, dan pengiriman.
 */
export async function getOrderDetail(orderId) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const order = await db.query.orders.findFirst({
			where: eq(orders.id, parseInt(orderId)),
			with: {
				store: {
					columns: { id: true, name: true, logoUrl: true }
				},
				payment: true,
				shipment: true,
				items: {
					with: {
						product: {
							with: { images: true }
						}
					}
				}
			}
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan" }
		}

		// Pastikan user hanya bisa melihat pesanannya sendiri (kecuali admin/seller nantinya)
		if (order.userId !== session.user.id) {
			return { success: false, error: "Unauthorized" }
		}

		return { success: true, data: order }
	} catch (error) {
		console.error("[getOrderDetail]", error)
		return { success: false, error: "Gagal mengambil detail pesanan" }
	}
}

// ============================================
// COMPLETE ORDER & SUBMIT REVIEW
// ============================================

/**
 * Menyelesaikan pesanan dan menyimpan ulasan produk.
 * Rating WAJIB diisi oleh pembeli, komentar opsional.
 * Setelah review disimpan, rating produk dihitung ulang secara otomatis.
 *
 * @param {number} orderId
 * @param {{ orderItemId: number, productId: number, rating: number, comment?: string }[]} reviewsData
 */
export async function completeOrderAndReview(orderId, reviewsData) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		// Validasi: pesanan harus milik user ini dan statusnya shipped
		const order = await db.query.orders.findFirst({
			where: and(
				eq(orders.id, parseInt(orderId)),
				eq(orders.userId, session.user.id)
			),
		})

		if (!order) {
			return { success: false, error: "Pesanan tidak ditemukan." }
		}

		if (order.status !== "shipped") {
			return { success: false, error: "Pesanan ini belum dikirim atau sudah selesai." }
		}

		// Validasi rating wajib 1-5
		for (const r of reviewsData) {
			if (!r.rating || r.rating < 1 || r.rating > 5) {
				return { success: false, error: "Rating wajib diisi (1-5 bintang)." }
			}
		}

		await db.transaction(async (tx) => {
			// 1. Update status order menjadi completed
			await tx.update(orders)
				.set({ status: "completed" })
				.where(eq(orders.id, parseInt(orderId)))

			// 2. Update soldCount untuk setiap produk dalam pesanan
			const items = await tx.select({
				productId: orderItems.productId,
				quantity: orderItems.quantity,
			}).from(orderItems).where(eq(orderItems.orderId, parseInt(orderId)))

			for (const item of items) {
				await tx.update(products)
					.set({ soldCount: sql`COALESCE(sold_count, 0) + ${item.quantity}` })
					.where(eq(products.id, item.productId))
			}

			// 3. Simpan semua review
			if (reviewsData.length > 0) {
				await tx.insert(reviews).values(
					reviewsData.map(r => ({
						orderItemId: r.orderItemId,
						productId: r.productId,
						userId: session.user.id,
						rating: r.rating,
						comment: r.comment || null,
						imageUrl: r.imageUrl || null,
					}))
				)
			}

			// 4. Hitung ulang rating + totalReviews untuk setiap produk yang di-review
			const productIds = [...new Set(reviewsData.map(r => r.productId))]
			for (const productId of productIds) {
				const [result] = await tx
					.select({
						avgRating: avg(reviews.rating),
						totalReviews: sql`COUNT(*)::int`,
					})
					.from(reviews)
					.where(eq(reviews.productId, productId))

				const newRating = result?.avgRating
					? parseFloat(parseFloat(result.avgRating).toFixed(1))
					: 5.0
				const newTotalReviews = result?.totalReviews || 0

				await tx.update(products)
					.set({ rating: String(newRating), totalReviews: newTotalReviews })
					.where(eq(products.id, productId))
			}

			// 5. Hitung ulang rating TOKO (rata-rata dari semua review produk di toko ini)
			const [storeRatingResult] = await tx
				.select({
					avgRating: avg(reviews.rating),
					totalReviews: sql`COUNT(*)::int`,
				})
				.from(reviews)
				.innerJoin(products, eq(reviews.productId, products.id))
				.where(eq(products.storeId, order.storeId))

			const storeRating = storeRatingResult?.avgRating
				? parseFloat(parseFloat(storeRatingResult.avgRating).toFixed(1))
				: 5.0
			const storeTotalReviews = storeRatingResult?.totalReviews || 0

			await tx.update(stores)
				.set({
					rating: String(storeRating),
					totalReviews: storeTotalReviews,
				})
				.where(eq(stores.id, order.storeId))

			// 6. Tambahkan saldo ke dompet toko
			// Seller mendapat: grandTotal - ongkir - komisi platform
			// Ongkir → untuk kurir, platformFee → untuk platform
			const sellerIncome = order.grandTotal - (order.totalShipping || 0) - (order.platformFee || 0)
			if (sellerIncome > 0) {
				await tx.update(stores)
					.set({ balance: sql`balance + ${sellerIncome}` })
					.where(eq(stores.id, order.storeId))
			}
		})

		return { success: true, message: "Pesanan selesai! Terima kasih atas ulasan Anda." }
	} catch (error) {
		console.error("[completeOrderAndReview]", error)
		return { success: false, error: "Gagal menyelesaikan pesanan." }
	}
}
