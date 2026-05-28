import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core"

// 1. Enum: Tipe diskon voucher
export const discountTypeEnum = pgEnum("discount_type", [
	"fixed",        // Potongan nominal tetap (Rp)
	"percentage",   // Potongan persentase (%)
	"free_shipping" // Gratis ongkir
]);

// 2. Enum: Status voucher
export const voucherStatusEnum = pgEnum("voucher_status", [
	"active",
	"inactive",
	"expired"
]);

// 3. Tabel Voucher
export const vouchers = pgTable("vouchers", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id"),                                                    // null = voucher global (admin)
	name: text("name").notNull(),                                                    // Nama voucher: "Diskon Akhir Pekan"
	code: text("code").notNull().unique(),                                           // Kode unik: "DISKON10K"
	discountType: discountTypeEnum("discount_type").notNull().default("fixed"),       // fixed / percentage / free_shipping
	discountValue: integer("discount_value").notNull(),                               // 10000 (Rp) atau 15 (%)
	maxDiscount: integer("max_discount"),                                             // Batas maks potongan (untuk percentage)
	minPurchase: integer("min_purchase").notNull().default(0),                        // Min belanja untuk pakai voucher
	quota: integer("quota").notNull().default(100),                                   // Total kuota penggunaan
	usedCount: integer("used_count").notNull().default(0),                            // Sudah terpakai
	startDate: timestamp("start_date").notNull(),                                     // Mulai berlaku
	endDate: timestamp("end_date").notNull(),                                         // Berakhir
	status: voucherStatusEnum("status").default("active"),                            // Status voucher
	imageUrl: text("image_url"),                                                      // Banner/gambar voucher (opsional)
})
