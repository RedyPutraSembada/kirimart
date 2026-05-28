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
	
	// Base values for discovery
	basePrice: integer("base_price").notNull(), // Starting price shown in catalog
	originalPrice: integer("original_price"),
	baseStock: integer("base_stock").default(0), // Total stock or default stock
	
	weightGram: integer("weight_gram").notNull(),
	description: text("description"),

	// Marketing & Trust
	soldCount: integer("sold_count").default(0),
	rating: decimal("rating", { precision: 2, scale: 1 }).default("5.0"),
	totalReviews: integer("total_reviews").notNull().default(0),
	discountRules: jsonb("discount_rules"),

	// Status
	status: productStatusEnum("status").default("active"),
	bannedReason: text("banned_reason"),
});

// Definitions for Options (UI Metadata)
export const productOptions = pgTable("product_options", {
	id: serial("id").primaryKey(),
	productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
	name: text("name").notNull(), // e.g. "Warna", "Ukuran"
	values: jsonb("values").notNull(), // e.g. ["Jet Black", "Brown"]
	displayType: text("display_type").default("text"), // "text" or "image"
	position: integer("position").default(0), // Ordering
});

// Definitions for specific SKUs (The combinations)
export const productVariants = pgTable("product_variants", {
	id: serial("id").primaryKey(),
	productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
	attributes: jsonb("attributes").notNull(), // e.g. {"Warna": "Jet Black", "Ukuran": "S"}
	price: integer("price").notNull(),
	stock: integer("stock").notNull().default(0),
	sku: text("sku").unique(),
	imageUrl: text("image_url"),
	status: text("status").default("active"),
});