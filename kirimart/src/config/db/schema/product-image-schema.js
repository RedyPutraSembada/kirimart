import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core"

export const productImages = pgTable("product_images", {
	id: serial("id").primaryKey(),
	productId: integer("product_id").notNull(),
	imageUrl: text("image_url").notNull(),
	isPrimary: boolean("is_primary").default(false),
})
