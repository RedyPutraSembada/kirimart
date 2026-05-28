import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"

export const messages = pgTable("messages", {
	id: serial("id").primaryKey(),
	conversationId: integer("conversation_id").notNull(),
	senderId: text("sender_id").notNull(),
	body: text("body"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
})
