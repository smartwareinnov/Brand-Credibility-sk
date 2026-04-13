import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const brandProfilesTable = pgTable("brand_profiles", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  brandName: text("brand_name"),
  websiteUrl: text("website_url"),
  industry: text("industry"),
  instagramHandle: text("instagram_handle"),
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  facebookUrl: text("facebook_url"),
  youtubeUrl: text("youtube_url"),
  targetAudience: text("target_audience"),
  brandDescription: text("brand_description"),
  competitor1: text("competitor1"),
  competitor2: text("competitor2"),
  competitor3: text("competitor3"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertBrandProfileSchema = createInsertSchema(brandProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBrandProfile = z.infer<typeof insertBrandProfileSchema>;
export type BrandProfile = typeof brandProfilesTable.$inferSelect;
