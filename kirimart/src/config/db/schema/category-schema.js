import { pgTable, serial, text, boolean, integer } from "drizzle-orm/pg-core"

export const categories = pgTable("categories", {
	id: serial("id").primaryKey(),
	parentId: integer("parent_id").references(() => categories.id),
	name: text("name").notNull().unique(),
	slug: text("slug").notNull().unique(),
	iconUrl: text("icon_url"),
	description: text("description"),
	isActive: boolean("is_active").default(true),
})
