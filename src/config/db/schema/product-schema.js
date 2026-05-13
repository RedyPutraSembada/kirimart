import { pgTable, serial, text, integer, pgEnum, jsonb, decimal } from "drizzle-orm/pg-core"

export const productStatusEnum = pgEnum("status", [
	"active",
	"out_of_stock",
	"low_stock",
	"draft",
	"inactive",
	"deleted",
	"sold_out",
	"banned"
]);

export const products = pgTable("products", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id").notNull(),
	categoryId: integer("category_id").notNull(),
	name: text("name").notNull(),
	price: integer("price").notNull(),
	originalPrice: integer("original_price"),
	stock: integer("stock").notNull().default(0),
	weightGram: integer("weight_gram").notNull(),
	description: text("description"),

	// Marketing & Trust
	soldCount: integer("sold_count").default(0),
	rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0"),
	discountRules: jsonb("discount_rules"),

	// Status
	status: productStatusEnum("status").default("active"),
	bannedReason: text("banned_reason"),
});