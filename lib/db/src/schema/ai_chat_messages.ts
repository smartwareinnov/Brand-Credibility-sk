import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const aiChatMessagesTable = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  conversationId: integer("conversation_id"),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessagesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type AiChatMessage = typeof aiChatMessagesTable.$inferSelect;
