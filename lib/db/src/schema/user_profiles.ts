import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  fullName: text("full_name"),
  email: text("email"),
  passwordHash: text("password_hash"),
  emailConfirmed: boolean("email_confirmed").notNull().default(false),
  company: text("company"),
  phone: text("phone"),
  country: text("country"),
  timezone: text("timezone"),
  avatarInitials: text("avatar_initials"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  notificationPrefs: text("notification_prefs"),
  status: text("status").notNull().default("active"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  role: text("role"),
  hasRunAds: text("has_run_ads"),
  companySize: text("company_size"),
  yearlyRevenue: text("yearly_revenue"),
  industry: text("industry"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry", { withTimezone: true }),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
