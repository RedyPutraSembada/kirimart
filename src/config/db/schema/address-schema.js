import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const addresses = pgTable("addresses", {
	id: serial("id").primaryKey(),
	userId: text("user_id"), // from Better Auth users.id
	storeId: integer("store_id"),
	provinceId: text("province_id"),
	cityId: text("city_id"),
	kecamatanId: text("kecamatan_id"),
	kelurahanId: text("kelurahan_id"),
	zipcode: text("zipcode"),
	detailAddress: text("detail_address").notNull(),
	recipientName: text("recipient_name"),
	recipientPhone: text("recipient_phone"),
})
