import { Router, type IRouter } from "express";
import { desc, eq, isNotNull, sql, and } from "drizzle-orm";
import { db, analysesTable, actionTasksTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);

  const whereClause = sessionId
    ? and(eq(analysesTable.sessionId, sessionId), isNotNull(analysesTable.overallScore))
    : isNotNull(analysesTable.overallScore);

  const [totals] = await db
    .select({
      totalAnalyses: sql<number>`count(*)::int`,
      averageScore: sql<number | null>`avg(${analysesTable.overallScore})`,
    })
    .from(analysesTable)
    .where(sessionId ? eq(analysesTable.sessionId, sessionId) : undefined);

  const userAnalyses = sessionId
    ? await db
        .select({ id: analysesTable.id })
        .from(analysesTable)
        .where(eq(analysesTable.sessionId, sessionId))
    : [];

  const analysisIds = userAnalyses.map((a) => a.id);

  const taskQuery = sessionId && analysisIds.length > 0
    ? db
        .select({
          completedTasks: sql<number>`count(*) filter (where ${actionTasksTable.isCompleted} = true)::int`,
          pendingTasks: sql<number>`count(*) filter (where ${actionTasksTable.isCompleted} = false)::int`,
        })
        .from(actionTasksTable)
        .where(sql`${actionTasksTable.analysisId} = any(${analysisIds})`)
    : db
        .select({
          completedTasks: sql<number>`count(*) filter (where ${actionTasksTable.isCompleted} = true)::int`,
          pendingTasks: sql<number>`count(*) filter (where ${actionTasksTable.isCompleted} = false)::int`,
        })
        .from(actionTasksTable);

  const [taskCounts] = await taskQuery;

  const [adReadyCounts] = await db
    .select({
      adReadyCount: sql<number>`count(*) filter (where ${analysesTable.adReadinessLevel} in ('ready', 'almost_ready'))::int`,
      notReadyCount: sql<number>`count(*) filter (where ${analysesTable.adReadinessLevel} in ('not_ready', 'getting_there'))::int`,
    })
    .from(analysesTable)
    .where(
      sessionId
        ? and(eq(analysesTable.sessionId, sessionId), isNotNull(analysesTable.adReadinessLevel))
        : isNotNull(analysesTable.adReadinessLevel)
    );

  res.json({
    totalAnalyses: totals?.totalAnalyses ?? 0,
    averageScore: totals?.averageScore ? Math.round(totals.averageScore) : null,
    completedTasks: taskCounts?.completedTasks ?? 0,
    pendingTasks: taskCounts?.pendingTasks ?? 0,
    adReadyCount: adReadyCounts?.adReadyCount ?? 0,
    notReadyCount: adReadyCounts?.notReadyCount ?? 0,
    topInsightCategory: "social_media",
  });
});

router.get("/dashboard/recent-analyses", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);

  const analyses = sessionId
    ? await db
        .select()
        .from(analysesTable)
        .where(and(eq(analysesTable.sessionId, sessionId), eq(analysesTable.status, "completed")))
        .orderBy(desc(analysesTable.createdAt))
        .limit(5)
    : await db
        .select()
        .from(analysesTable)
        .where(eq(analysesTable.status, "completed"))
        .orderBy(desc(analysesTable.createdAt))
        .limit(5);

  res.json(analyses);
});

export default router;
