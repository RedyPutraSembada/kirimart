import { pgTable, serial, text, integer } from "drizzle-orm/pg-core"

export const products = pgTable("products", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id").notNull(),
	categoryId: integer("category_id").notNull(),
	name: text("name").notNull(),
	price: integer("price").notNull(),
	stock: integer("stock").notNull().default(0),
	weightGram: integer("weight_gram").notNull(),
})
