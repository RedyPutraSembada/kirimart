import { pgTable, text, timestamp, integer, jsonb, serial } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { stores } from "./store-schema";

export const activityLogs = pgTable("activity_logs", {
	id: serial("id").primaryKey(),
	userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // Bisa null jika anonim
	storeId: integer("store_id").references(() => stores.id, { onDelete: "set null" }), // Null jika global
	action: text("action").notNull(),
	entityType: text("entity_type").notNull(),
	entityId: text("entity_id"),
	details: jsonb("details"), // Data before/after atau detail spesifik lainnya
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
});
