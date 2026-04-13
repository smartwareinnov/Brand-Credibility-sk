import {
  pgTable,
  text,
  serial,
  integer,
  real,
  timestamp,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const metaAdSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  adCreativeBodies: z.array(z.string()).optional(),
  adCreativeLinkTitles: z.array(z.string()).optional(),
  adDeliveryStartTime: z.string().optional(),
  publisherPlatforms: z.array(z.string()).optional(),
  adSnapshotUrl: z.string().optional(),
  pageId: z.string().optional(),
  pageName: z.string().optional(),
});

export const googleAdSchema = z.object({
  position: z.number().optional(),
  block_position: z.string().optional(),
  title: z.string(),
  link: z.string().optional(),
  displayed_link: z.string().optional(),
  description: z.string().optional(),
  tracking_link: z.string().optional(),
});

export type MetaAd = z.infer<typeof metaAdSchema>;
export type GoogleAd = z.infer<typeof googleAdSchema>;

export const competitorAdsScansTable = pgTable("competitor_ads_scans", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  competitorId: integer("competitor_id").notNull(),
  competitorName: text("competitor_name").notNull(),
  metaAds: json("meta_ads").$type<MetaAd[]>(),
  googleAds: json("google_ads").$type<GoogleAd[]>(),
  metaActivityScore: real("meta_activity_score"),
  googleActivityScore: real("google_activity_score"),
  overallActivityScore: real("overall_activity_score"),
  activityLabel: text("activity_label"),
  metaEnabled: text("meta_enabled").default("false"),
  googleEnabled: text("google_enabled").default("false"),
  aiInsights: json("ai_insights").$type<{
    summary: string;
    metaInsights: string[];
    googleInsights: string[];
    recommendations: string[];
    competitivePosition: string;
  }>(),
  cachedAt: timestamp("cached_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCompetitorAdsScanSchema = createInsertSchema(competitorAdsScansTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCompetitorAdsScan = z.infer<typeof insertCompetitorAdsScanSchema>;
export type CompetitorAdsScan = typeof competitorAdsScansTable.$inferSelect;
