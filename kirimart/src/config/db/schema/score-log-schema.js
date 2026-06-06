import { pgTable, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core"
import { products } from "./product-schema"
import { stores } from "./store-schema"

export const scoreLogs = pgTable("score_logs", {
	id: serial("id").primaryKey(),
	productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
	storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull(),
	meritScore: integer("merit_score").notNull(),
	freshnessBoost: integer("freshness_boost").notNull(),
	randomizer: integer("randomizer").notNull(),
	totalScore: integer("total_score").notNull(),
	breakdown: jsonb("breakdown"), // { productQuality: 10, storeReputation: 20, activityBonus: 5, ... }
	calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});
