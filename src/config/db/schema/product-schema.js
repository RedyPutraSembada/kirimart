import { pgTable, serial, text, integer, pgEnum } from "drizzle-orm/pg-core"

export const productStatusEnum = pgEnum("status", [
	"active",
	"out_of_stock",
	"low_stock",
	"draft",
	"inactive",
	"deleted",
	"sold_out"
]);

export const products = pgTable("products", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id").notNull(),
	categoryId: integer("category_id").notNull(),
	name: text("name").notNull(),
	price: integer("price").notNull(),
	stock: integer("stock").notNull().default(0),
	weightGram: integer("weight_gram").notNull(),
	description: text("description"),

	// 2. Gunakan variabel Enum yang sudah dideklarasikan
	status: productStatusEnum("status").default("active"),
});