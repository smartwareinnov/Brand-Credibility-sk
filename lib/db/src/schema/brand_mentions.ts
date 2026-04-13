import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandMentionsTable = pgTable("brand_mentions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  platform: text("platform").notNull(),
  source: text("source").notNull(),
  title: text("title").notNull(),
  snippet: text("snippet").notNull(),
  url: text("url"),
  mentionDate: text("mention_date").notNull(),
  sentiment: text("sentiment").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const mentionSettingsTable = pgTable("mention_settings", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  keywords: text("keywords").notNull().default("[]"),
  alertFrequency: text("alert_frequency").notNull().default("daily"),
  mentionAlertsEnabled: boolean("mention_alerts_enabled").notNull().default(true),
  positiveMentions: boolean("positive_mentions").notNull().default(true),
  negativeMentions: boolean("negative_mentions").notNull().default(true),
  neutralMentions: boolean("neutral_mentions").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBrandMentionSchema = createInsertSchema(brandMentionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBrandMention = z.infer<typeof insertBrandMentionSchema>;
export type BrandMention = typeof brandMentionsTable.$inferSelect;

export const insertMentionSettingsSchema = createInsertSchema(mentionSettingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertMentionSettings = z.infer<typeof insertMentionSettingsSchema>;
export type MentionSettings = typeof mentionSettingsTable.$inferSelect;
