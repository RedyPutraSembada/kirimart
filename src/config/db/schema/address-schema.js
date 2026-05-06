import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const addresses = pgTable("addresses", {
	id: serial("id").primaryKey(),
	userId: text("user_id"), // from Better Auth users.id
	storeId: integer("store_id"),
	provinceId: text("province_id"), // RajaOngkir
	cityId: text("city_id"), // RajaOngkir
	detailAddress: text("detail_address").notNull(),
})
