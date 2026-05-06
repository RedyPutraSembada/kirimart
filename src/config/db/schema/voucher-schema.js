import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const vouchers = pgTable("vouchers", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id"), // if null, global voucher
	code: text("code").notNull().unique(),
	discountAmount: integer("discount_amount").notNull(),
	imageUrl: text("image_url"),
})
