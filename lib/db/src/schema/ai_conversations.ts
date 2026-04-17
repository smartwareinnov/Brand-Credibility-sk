import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiConversationsTable = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  brandId: text("brand_id"),
  brandName: text("brand_name"),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAiConversationSchema = createInsertSchema(aiConversationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type AiConversation = typeof aiConversationsTable.$inferSelect;
