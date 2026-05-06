import { pgTable, serial, text } from "drizzle-orm/pg-core"

export const carts = pgTable("carts", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
})
