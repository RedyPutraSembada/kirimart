import { pgTable, serial, text, integer, boolean, doublePrecision } from "drizzle-orm/pg-core"

export const addresses = pgTable("addresses", {
	id: serial("id").primaryKey(),
	userId: text("user_id"), // from Better Auth users.id
	storeId: integer("store_id"),
	label: text("label"), // "Rumah", "Kantor", "Gudang"
	biteshipAreaId: text("biteship_area_id"), // Cache: "IDNP6IDNC148IDND836IDZ12410"
	provinceId: text("province_id"),
	provinceName: text("province_name"), // Cache: "DKI Jakarta"
	cityId: text("city_id"),
	cityName: text("city_name"), // Cache: "Jakarta Selatan"
	kecamatanId: text("kecamatan_id"),
	kecamatanName: text("kecamatan_name"), // Cache: "Pesanggrahan"
	kelurahanId: text("kelurahan_id"),
	zipcode: text("zipcode"),
	detailAddress: text("detail_address").notNull(),
	recipientName: text("recipient_name"),
	recipientPhone: text("recipient_phone"),
	latitude: doublePrecision("latitude"),
	longitude: doublePrecision("longitude"),
	isDefault: boolean("is_default").default(false),
})
