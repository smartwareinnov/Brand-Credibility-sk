import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedCompetitorAnalysesTable = pgTable("saved_competitor_analyses", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  brandId: integer("brand_id"),
  competitorId: integer("competitor_id"),
  brandName: text("brand_name").notNull(),
  competitorName: text("competitor_name").notNull(),
  result: json("result").$type<{
    brand: { id: number; name: string; website: string | null; industry: string | null; scores: Record<string, number> };
    competitor: { id: number; name: string; website: string | null; scores: Record<string, number> };
    dimensions: Array<{ key: string; label: string; brandScore: number; competitorScore: number }>;
    overallWinner: "brand" | "competitor";
    scoreDiff: number;
    brandWins: number;
    competitorWins: number;
    recommendations: string[];
  }>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavedCompetitorAnalysisSchema = createInsertSchema(savedCompetitorAnalysesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedCompetitorAnalysis = z.infer<typeof insertSavedCompetitorAnalysisSchema>;
export type SavedCompetitorAnalysis = typeof savedCompetitorAnalysesTable.$inferSelect;
