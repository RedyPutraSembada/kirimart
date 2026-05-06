import { pgTable, serial, text } from "drizzle-orm/pg-core"

export const categories = pgTable("categories", {
	id: serial("id").primaryKey(),
	name: text("name").notNull(),
})
