import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitorScoreSnapshotsTable = pgTable("competitor_score_snapshots", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  competitorId: integer("competitor_id").notNull(),
  competitorName: text("competitor_name").notNull(),
  overallScore: real("overall_score"),
  websiteScore: real("website_score"),
  socialScore: real("social_score"),
  contentScore: real("content_score"),
  reviewsScore: real("reviews_score"),
  messagingScore: real("messaging_score"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompetitorScoreSnapshotSchema = createInsertSchema(competitorScoreSnapshotsTable).omit({
  id: true,
});
export type InsertCompetitorScoreSnapshot = z.infer<typeof insertCompetitorScoreSnapshotSchema>;
export type CompetitorScoreSnapshot = typeof competitorScoreSnapshotsTable.$inferSelect;
