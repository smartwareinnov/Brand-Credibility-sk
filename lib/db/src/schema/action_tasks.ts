import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { analysesTable } from "./analyses";

export const actionTasksTable = pgTable("action_tasks", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id")
    .notNull()
    .references(() => analysesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: integer("priority").notNull().default(0),
  category: text("category").notNull(),
  estimatedDays: integer("estimated_days").notNull().default(3),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  isDailyTask: boolean("is_daily_task").notNull().default(false),
  dayNumber: integer("day_number").notNull().default(1),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertActionTaskSchema = createInsertSchema(actionTasksTable).omit(
  {
    id: true,
    createdAt: true,
  }
);
export type InsertActionTask = z.infer<typeof insertActionTaskSchema>;
export type ActionTask = typeof actionTasksTable.$inferSelect;
