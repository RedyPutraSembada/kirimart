import { pgTable, serial, text, integer, boolean, decimal } from "drizzle-orm/pg-core"

export const stores = pgTable("stores", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	addressId: integer("address_id"),
	name: text("name").notNull(),
	domainSlug: text("domain_slug").notNull().unique(),
	logoUrl: text("logo_url"),
	bannerUrl: text("banner_url"),
	description: text("description"),
	isStar: boolean("is_star").default(false),
	status: text("status").default("active"),
	bannedReason: text("banned_reason"),
	metaPixelId: text("meta_pixel_id"),
	// Keuangan: Informasi Rekening Bank
	bankName: text("bank_name"),
	bankAccountNumber: text("bank_account_number"),
	bankAccountHolder: text("bank_account_holder"),
	// Keuangan: Saldo
	balance: integer("balance").notNull().default(0),
	withdrawnAmount: integer("withdrawn_amount").notNull().default(0),
	// Pengiriman: Kurir yang diaktifkan seller (wajib diisi)
	enabledCouriers: text("enabled_couriers"), // "jne,sicepat,jnt" — comma separated
	// Profil Toko: Jam Operasional
	openTime: text("open_time").default("09:00"),
	closeTime: text("close_time").default("21:00"),
	// Profil Toko: Badge
	isVerified: boolean("is_verified").default(false), // Badge: Penjual Tepercaya
	isOfficial: boolean("is_official").default(false), // Badge: Produk Original 100%
	// Profil Toko: Agregasi (di-update otomatis saat ada review baru)
	rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0"),
	totalReviews: integer("total_reviews").notNull().default(0),
	followerCount: integer("follower_count").notNull().default(0),
})

