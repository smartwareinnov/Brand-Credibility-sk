import {
  pgTable,
  text,
  serial,
  timestamp,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  brandName: text("brand_name").notNull(),
  websiteUrl: text("website_url").notNull(),
  brandDescription: text("brand_description"),
  instagramHandle: text("instagram_handle"),
  linkedinUrl: text("linkedin_url"),
  facebookUrl: text("facebook_url"),
  xHandle: text("x_handle"),
  competitor1: text("competitor1"),
  competitor2: text("competitor2"),
  competitor3: text("competitor3"),
  industry: text("industry").notNull(),
  email: text("email"),
  status: text("status").notNull().default("pending"),
  overallScore: real("overall_score"),
  websiteScore: real("website_score"),
  socialScore: real("social_score"),
  contentScore: real("content_score"),
  reviewsScore: real("reviews_score"),
  competitorScore: real("competitor_score"),
  messagingScore: real("messaging_score"),
  adReadinessLevel: text("ad_readiness_level"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
