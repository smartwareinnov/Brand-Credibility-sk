import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const emailConfirmationsTable = pgTable("email_confirmations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  token: text("token").notNull().unique(),
  sessionId: text("session_id").notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEmailConfirmationSchema = createInsertSchema(
  emailConfirmationsTable
).omit({ id: true, createdAt: true });

export type InsertEmailConfirmation = z.infer<
  typeof insertEmailConfirmationSchema
>;
export type EmailConfirmation = typeof emailConfirmationsTable.$inferSelect;
