import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usageTrackingTable = pgTable("usage_tracking", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  month: text("month").notNull(),
  brandAnalysisCount: integer("brand_analysis_count").notNull().default(0),
  competitorAnalysisCount: integer("competitor_analysis_count").notNull().default(0),
  adsIntelligenceCount: integer("ads_intelligence_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUsageTrackingSchema = createInsertSchema(usageTrackingTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UsageTracking = typeof usageTrackingTable.$inferSelect;
