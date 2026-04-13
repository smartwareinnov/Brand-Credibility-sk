import {
  pgTable,
  text,
  serial,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userCompetitorsTable = pgTable("user_competitors", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name").notNull(),
  website: text("website"),
  instagram: text("instagram"),
  facebook: text("facebook"),
  xHandle: text("x_handle"),
  linkedin: text("linkedin"),
  estimatedScore: real("estimated_score"),
  websiteScore: real("website_score"),
  socialScore: real("social_score"),
  contentScore: real("content_score"),
  reviewsScore: real("reviews_score"),
  competitorScore: real("competitor_score"),
  messagingScore: real("messaging_score"),
  lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertUserCompetitorSchema = createInsertSchema(userCompetitorsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUserCompetitor = z.infer<typeof insertUserCompetitorSchema>;
export type UserCompetitor = typeof userCompetitorsTable.$inferSelect;
