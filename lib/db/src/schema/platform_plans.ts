import { pgTable, text, serial, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformPlansTable = pgTable("platform_plans", {
  id: serial("id").primaryKey(),
  planId: text("plan_id").notNull().unique(),
  name: text("name").notNull(),
  price: real("price").notNull().default(0),
  currency: text("currency").notNull().default("NGN"),
  period: text("period").notNull().default("monthly"),
  badge: text("badge"),
  popular: boolean("popular").notNull().default(false),
  active: boolean("active").notNull().default(true),
  description: text("description"),
  features: text("features"),
  isAgency: boolean("is_agency").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlatformPlanSchema = createInsertSchema(platformPlansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPlatformPlan = z.infer<typeof insertPlatformPlanSchema>;
export type PlatformPlan = typeof platformPlansTable.$inferSelect;
