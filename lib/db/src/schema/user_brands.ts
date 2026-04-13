import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userBrandsTable = pgTable("user_brands", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  brandName: text("brand_name").notNull(),
  websiteUrl: text("website_url"),
  industry: text("industry"),
  instagramHandle: text("instagram_handle"),
  facebookUrl: text("facebook_url"),
  xHandle: text("x_handle"),
  linkedinUrl: text("linkedin_url"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserBrandSchema = createInsertSchema(userBrandsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserBrand = z.infer<typeof insertUserBrandSchema>;
export type UserBrand = typeof userBrandsTable.$inferSelect;
