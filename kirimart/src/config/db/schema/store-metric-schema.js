import { pgTable, serial, integer, timestamp, decimal, boolean } from "drizzle-orm/pg-core"
import { stores } from "./store-schema"

export const storeMetrics = pgTable("store_metrics", {
	id: serial("id").primaryKey(),
	storeId: integer("store_id").references(() => stores.id, { onDelete: "cascade" }).notNull().unique(),
	totalOrders: integer("total_orders").notNull().default(0),
	completedOrders: integer("completed_orders").notNull().default(0),
	cancelledOrders: integer("cancelled_orders").notNull().default(0),
	totalComplaints: integer("total_complaints").notNull().default(0),
	complaintRate: decimal("complaint_rate", { precision: 5, scale: 4 }).notNull().default("0.0000"),
	hasActiveVoucher: boolean("has_active_voucher").notNull().default(false),
	lastProductAt: timestamp("last_product_at"),
	profileCompleteness: integer("profile_completeness").notNull().default(0), // 0-100
	updatedAt: timestamp("updated_at").defaultNow(),
});
