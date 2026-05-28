/**
 * Chat Server Actions
 *
 * Semua operasi database terkait fitur chat antara pembeli dan penjual.
 *
 * Alur Chat:
 * 1. Pembeli klik "Chat Penjual" di halaman produk
 *    → getOrCreateConversation(storeId) → buka halaman /chat
 *
 * 2. Halaman chat load daftar percakapan
 *    → getMyConversations() → tampilkan di sidebar kiri
 *
 * 3. User klik satu percakapan
 *    → getConversationMessages(convId) → tampilkan bubble chat
 *
 * 4. User ketik dan kirim pesan
 *    → sendMessage(convId, body) → simpan ke DB + trigger WS broadcast
 *
 * Tabel yang digunakan:
 * - conversations (buyerId, storeId, updatedAt)
 * - messages (conversationId, senderId, body, imageUrl, createdAt)
 */
"use server"

import { db } from "@/config/db"
import { conversations, messages, stores, user as userTable } from "@/config/db/schema"
import { auth } from "@/lib/auth"
import { eq, and, desc, or, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { wsEmit } from "@/lib/ws-emit"

// ============================================
// GET MY CONVERSATIONS
// ============================================

/**
 * Mengambil semua percakapan milik user yang sedang login.
 * User bisa sebagai BUYER (percakapan pribadi) atau SELLER (percakapan ke toko).
 *
 * Return format yang kompatibel dengan UI chat-view.jsx:
 * {
 *   id, store: { name, logo, slug, isStar },
 *   lastMessage, lastTime, unread,
 *   messages: [] (kosong, di-load terpisah saat klik)
 * }
 */
export async function getMyConversations() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		const userId = session.user.id

		// Cek apakah user punya toko (untuk ambil chat sebagai seller juga)
		const myStore = await db.query.stores.findFirst({
			where: eq(stores.userId, userId),
			columns: { id: true },
		})

		// Query: ambil semua percakapan di mana user adalah buyer ATAU pemilik toko
		let convs
		if (myStore) {
			// User punya toko → ambil chat sebagai buyer DAN seller
			convs = await db.query.conversations.findMany({
				where: or(
					eq(conversations.buyerId, userId),
					eq(conversations.storeId, myStore.id)
				),
				orderBy: [desc(conversations.updatedAt)],
				with: {
					store: {
						columns: { id: true, name: true, logoUrl: true, domainSlug: true, isStar: true },
					},
					buyer: {
						columns: { id: true, name: true, image: true },
					},
					messages: {
						orderBy: [desc(messages.createdAt)],
						limit: 1, // Hanya ambil pesan terakhir untuk preview
					},
				},
			})
		} else {
			// User biasa → hanya ambil chat sebagai buyer
			convs = await db.query.conversations.findMany({
				where: eq(conversations.buyerId, userId),
				orderBy: [desc(conversations.updatedAt)],
				with: {
					store: {
						columns: { id: true, name: true, logoUrl: true, domainSlug: true, isStar: true },
					},
					buyer: {
						columns: { id: true, name: true, image: true },
					},
					messages: {
						orderBy: [desc(messages.createdAt)],
						limit: 1,
					},
				},
			})
		}

		// Format agar kompatibel dengan UI
		const formatted = convs.map((conv) => {
			const lastMsg = conv.messages?.[0]
			const isSeller = myStore && conv.storeId === myStore.id

			return {
				id: conv.id,
				storeId: conv.storeId,
				buyerId: conv.buyerId,
				isSeller, // Apakah user ini adalah penjual dalam percakapan ini
				store: {
					id: conv.store.id,
					name: conv.store.name,
					logo: conv.store.logoUrl || "/images/kawanbelanja.png",
					slug: conv.store.domainSlug,
					isStar: conv.store.isStar,
				},
				buyer: {
					id: conv.buyer.id,
					name: conv.buyer.name,
					image: conv.buyer.image,
				},
				// Product context dari database (tersedia untuk buyer DAN seller)
				productContext: conv.productId ? {
					id: conv.productId,
					name: conv.productName,
					image: conv.productImage,
					price: conv.productPrice,
				} : null,
				lastMessage: lastMsg?.body || "Belum ada pesan",
				lastTime: lastMsg
					? formatChatTime(lastMsg.createdAt)
					: formatChatTime(conv.updatedAt),
				unread: 0, // TODO: implementasi unread count (perlu tabel read_status)
			}
		})

		return { success: true, data: formatted }
	} catch (error) {
		console.error("[getMyConversations]", error)
		return { success: false, error: "Gagal mengambil daftar percakapan." }
	}
}

// ============================================
// GET CONVERSATION MESSAGES
// ============================================

/**
 * Mengambil riwayat pesan dalam satu percakapan.
 * Validasi: user harus jadi buyer ATAU pemilik toko dalam percakapan ini.
 *
 * @param {number} conversationId
 * @param {number} limit - Jumlah pesan (default 50)
 * @param {number} offset - Untuk pagination
 */
export async function getConversationMessages(conversationId, limit = 50, offset = 0) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		// Validasi akses: user harus participant
		const conv = await db.query.conversations.findFirst({
			where: eq(conversations.id, parseInt(conversationId)),
			with: {
				store: { columns: { userId: true } },
			},
		})

		if (!conv) {
			return { success: false, error: "Percakapan tidak ditemukan." }
		}

		const userId = session.user.id
		const isBuyer = conv.buyerId === userId
		const isSeller = conv.store.userId === userId

		if (!isBuyer && !isSeller) {
			return { success: false, error: "Anda tidak memiliki akses ke percakapan ini." }
		}

		// Ambil pesan (terbaru duluan, lalu reverse untuk tampilan chat)
		const msgs = await db.query.messages.findMany({
			where: eq(messages.conversationId, parseInt(conversationId)),
			orderBy: [desc(messages.createdAt)],
			limit,
			offset,
			with: {
				sender: {
					columns: { id: true, name: true, image: true },
				},
			},
		})

		// Reverse agar urutan kronologis (pesan lama di atas)
		const chronological = msgs.reverse()

		return {
			success: true,
			data: chronological,
			hasMore: msgs.length === limit, // Jika full, mungkin ada lagi
		}
	} catch (error) {
		console.error("[getConversationMessages]", error)
		return { success: false, error: "Gagal mengambil pesan." }
	}
}

// ============================================
// SEND MESSAGE
// ============================================

/**
 * Kirim pesan baru dalam percakapan.
 * 1. Simpan ke database
 * 2. Update updatedAt di conversations (agar sorting benar)
 * 3. Trigger WebSocket broadcast ke lawan bicara
 *
 * @param {number} conversationId
 * @param {string} body - Isi pesan
 * @param {string|null} imageUrl - URL gambar (opsional)
 */
export async function sendMessage(conversationId, body, imageUrl = null) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Unauthorized" }
		}

		if (!body?.trim() && !imageUrl) {
			return { success: false, error: "Pesan tidak boleh kosong." }
		}

		// Validasi: user harus participant
		const conv = await db.query.conversations.findFirst({
			where: eq(conversations.id, parseInt(conversationId)),
			with: {
				store: { columns: { id: true, userId: true, name: true } },
				buyer: { columns: { id: true, name: true } },
			},
		})

		if (!conv) {
			return { success: false, error: "Percakapan tidak ditemukan." }
		}

		const userId = session.user.id
		const isBuyer = conv.buyerId === userId
		const isSeller = conv.store.userId === userId

		if (!isBuyer && !isSeller) {
			return { success: false, error: "Anda tidak memiliki akses." }
		}

		// 1. Simpan pesan ke database
		const [newMessage] = await db.insert(messages).values({
			conversationId: parseInt(conversationId),
			senderId: userId,
			body: body?.trim() || null,
			imageUrl: imageUrl || null,
		}).returning()

		// 2. Update updatedAt agar conversation naik ke atas
		await db.update(conversations)
			.set({ updatedAt: new Date() })
			.where(eq(conversations.id, parseInt(conversationId)))

		// 3. Trigger WebSocket broadcast
		// Kirim ke room conversation (untuk update bubble chat real-time)
		const messagePayload = {
			conversationId: parseInt(conversationId),
			message: {
				id: newMessage.id,
				senderId: userId,
				senderName: session.user.name,
				body: newMessage.body,
				imageUrl: newMessage.imageUrl,
				createdAt: newMessage.createdAt.toISOString(),
			},
		}

		await wsEmit("chat", `conversation:${conversationId}`, "new-message", messagePayload)

		// Kirim ke USER ROOM di /chat namespace → agar sidebar update real-time
		// Kedua user perlu update sidebar mereka
		const receiverUserId = isBuyer ? conv.store.userId : conv.buyerId
		await wsEmit("chat", `user:${receiverUserId}`, "sidebar-update", {
			conversationId: parseInt(conversationId),
			lastMessage: (body || "📷 Gambar").substring(0, 80),
			senderName: session.user.name,
			senderId: userId,
			createdAt: newMessage.createdAt.toISOString(),
		})
		// Sender juga butuh update sidebar (agar sorting benar)
		await wsEmit("chat", `user:${userId}`, "sidebar-update", {
			conversationId: parseInt(conversationId),
			lastMessage: (body || "📷 Gambar").substring(0, 80),
			senderName: session.user.name,
			senderId: userId,
			createdAt: newMessage.createdAt.toISOString(),
		})

		// Kirim notifikasi ke lawan bicara
		if (isBuyer) {
			// Buyer kirim pesan → notif ke seller (room store)
			await wsEmit("notifications", `user:${conv.store.userId}`, "new-message", {
				conversationId: parseInt(conversationId),
				senderName: session.user.name,
				preview: (body || "📷 Gambar").substring(0, 50),
				storeName: conv.store.name,
			})
		} else {
			// Seller kirim pesan → notif ke buyer
			await wsEmit("notifications", `user:${conv.buyerId}`, "new-message", {
				conversationId: parseInt(conversationId),
				senderName: conv.store.name,
				preview: (body || "📷 Gambar").substring(0, 50),
			})
		}

		return {
			success: true,
			data: {
				id: newMessage.id,
				senderId: userId,
				body: newMessage.body,
				imageUrl: newMessage.imageUrl,
				createdAt: newMessage.createdAt.toISOString(),
			},
		}
	} catch (error) {
		console.error("[sendMessage]", error)
		return { success: false, error: "Gagal mengirim pesan." }
	}
}

// ============================================
// GET OR CREATE CONVERSATION
// ============================================

/**
 * Membuat percakapan baru antara buyer dan toko, atau mengembalikan
 * yang sudah ada jika sudah pernah chat sebelumnya.
 *
 * Dipanggil saat user klik "Chat Penjual" di halaman produk/toko.
 *
 * @param {number} storeId - ID toko yang ingin di-chat
 * @param {Object|null} productContext - Info produk jika chat dari halaman produk
 * @returns {{ success: boolean, data?: { conversationId: number } }}
 */
export async function getOrCreateConversation(storeId, productContext = null) {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) {
			return { success: false, error: "Silakan login terlebih dahulu untuk chat." }
		}

		const userId = session.user.id

		// Cek: user tidak boleh chat ke toko sendiri
		const store = await db.query.stores.findFirst({
			where: eq(stores.id, parseInt(storeId)),
		})

		if (!store) {
			return { success: false, error: "Toko tidak ditemukan." }
		}

		if (store.userId === userId) {
			return { success: false, error: "Anda tidak bisa chat ke toko sendiri." }
		}

		// Cek apakah sudah ada percakapan sebelumnya
		const existing = await db.query.conversations.findFirst({
			where: and(
				eq(conversations.buyerId, userId),
				eq(conversations.storeId, parseInt(storeId))
			),
		})

		if (existing) {
			// Update product context jika ada (buyer buka dari produk baru)
			if (productContext?.id) {
				await db.update(conversations)
					.set({
						productId: productContext.id,
						productName: productContext.name || null,
						productImage: productContext.image || null,
						productPrice: productContext.price || null,
					})
					.where(eq(conversations.id, existing.id))
			}
			return { success: true, data: { conversationId: existing.id } }
		}

		// Buat percakapan baru (dengan product context jika ada)
		const insertValues = {
			buyerId: userId,
			storeId: parseInt(storeId),
		}
		if (productContext?.id) {
			insertValues.productId = productContext.id
			insertValues.productName = productContext.name || null
			insertValues.productImage = productContext.image || null
			insertValues.productPrice = productContext.price || null
		}

		const [newConv] = await db.insert(conversations).values(insertValues).returning()

		return { success: true, data: { conversationId: newConv.id } }
	} catch (error) {
		console.error("[getOrCreateConversation]", error)
		return { success: false, error: "Gagal memulai percakapan." }
	}
}

// ============================================
// HELPER: Format waktu chat
// ============================================

function formatChatTime(date) {
	if (!date) return ""
	const d = new Date(date)
	const now = new Date()
	const diffMs = now - d
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		// Hari ini → tampilkan jam
		return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
	} else if (diffDays === 1) {
		return "Kemarin"
	} else if (diffDays < 7) {
		return d.toLocaleDateString("id-ID", { weekday: "long" })
	} else {
		return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })
	}
}

// ============================================
// GET UNREAD CHAT COUNT
// ============================================

/**
 * Hitung jumlah percakapan yang punya pesan belum dibaca.
 * Definisi "belum dibaca": pesan terakhir di conversation BUKAN dari user ini.
 * (Sampai ada tabel read_status, ini heuristik terbaik.)
 */
export async function getUnreadChatCount() {
	try {
		const session = await auth.api.getSession({ headers: await headers() })
		if (!session) return { success: true, data: 0 }

		const userId = session.user.id

		// Cek apakah user punya toko
		const myStore = await db.query.stores.findFirst({
			where: eq(stores.userId, userId),
			columns: { id: true },
		})

		// Ambil semua conversation yang user ikuti
		let convs
		if (myStore) {
			convs = await db.query.conversations.findMany({
				where: or(
					eq(conversations.buyerId, userId),
					eq(conversations.storeId, myStore.id)
				),
				with: {
					messages: {
						orderBy: [desc(messages.createdAt)],
						limit: 1,
						columns: { senderId: true },
					},
				},
			})
		} else {
			convs = await db.query.conversations.findMany({
				where: eq(conversations.buyerId, userId),
				with: {
					messages: {
						orderBy: [desc(messages.createdAt)],
						limit: 1,
						columns: { senderId: true },
					},
				},
			})
		}

		// Hitung: berapa conversation yang pesan terakhirnya BUKAN dari kita
		const unreadCount = convs.filter((conv) => {
			const lastMsg = conv.messages?.[0]
			if (!lastMsg) return false
			return lastMsg.senderId !== userId
		}).length

		return { success: true, data: unreadCount }
	} catch (error) {
		console.error("[getUnreadChatCount]", error)
		return { success: true, data: 0 }
	}
}
