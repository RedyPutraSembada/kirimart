import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const stores = pgTable("stores", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	addressId: integer("address_id"),
	name: text("name").notNull(),
	domainSlug: text("domain_slug").notNull().unique(),
	logoUrl: text("logo_url"),
	bannerUrl: text("banner_url"),
	description: text("description"),
})
