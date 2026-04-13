import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, analysesTable, insightsTable, actionTasksTable, usageTrackingTable } from "@workspace/db";
import { chatCompletion } from "../lib/openai";
import {
  CreateAnalysisBody,
  GetAnalysisParams,
  RunAnalysisParams,
  ListAnalysisTasksParams,
} from "@workspace/api-zod";
import { runBrandAnalysis } from "../lib/ai-analyzer";
import { getSessionId } from "../middlewares/auth";
import { logAudit } from "../lib/audit";
import { getOrCreateUsage, getCurrentMonth, getPlatformLimit, getUserPlanId } from "./usage";

const router: IRouter = Router();

router.get("/analyses", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const analyses = sessionId
    ? await db
        .select()
        .from(analysesTable)
        .where(eq(analysesTable.sessionId, sessionId))
        .orderBy(desc(analysesTable.createdAt))
    : await db.select().from(analysesTable).orderBy(desc(analysesTable.createdAt));
  res.json(analyses);
});

router.post("/analyses", async (req, res): Promise<void> => {
  const parsed = CreateAnalysisBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sessionId = getSessionId(req);

  const [analysis] = await db
    .insert(analysesTable)
    .values({
      sessionId: sessionId ?? null,
      brandName: parsed.data.brandName,
      websiteUrl: parsed.data.websiteUrl,
      brandDescription: parsed.data.brandDescription ?? null,
      instagramHandle: parsed.data.instagramHandle ?? null,
      linkedinUrl: parsed.data.linkedinUrl ?? null,
      facebookUrl: parsed.data.facebookUrl ?? null,
      xHandle: parsed.data.xHandle ?? null,
      competitor1: parsed.data.competitor1 ?? null,
      competitor2: parsed.data.competitor2 ?? null,
      competitor3: parsed.data.competitor3 ?? null,
      industry: parsed.data.industry,
      email: parsed.data.email ?? null,
      status: "pending",
    })
    .returning();

  await logAudit({
    req,
    actorSessionId: sessionId,
    action: "analysis.created",
    targetType: "analysis",
    targetId: String(analysis.id),
    metadata: { brandName: analysis.brandName },
  });

  res.status(201).json(analysis);
});

router.get("/analyses/:id", async (req, res): Promise<void> => {
  const params = GetAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, params.data.id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  const insights = await db
    .select()
    .from(insightsTable)
    .where(eq(insightsTable.analysisId, params.data.id));

  const tasks = await db
    .select()
    .from(actionTasksTable)
    .where(eq(actionTasksTable.analysisId, params.data.id))
    .orderBy(actionTasksTable.priority);

  res.json({ analysis, insights, tasks });
});

router.post("/analyses/:id/run", async (req, res): Promise<void> => {
  const params = RunAnalysisParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [analysis] = await db
    .select()
    .from(analysesTable)
    .where(eq(analysesTable.id, params.data.id));

  if (!analysis) {
    res.status(404).json({ error: "Analysis not found" });
    return;
  }

  const runningSessionId = getSessionId(req);
  if (runningSessionId) {
    const month = getCurrentMonth();
    const planId = await getUserPlanId(runningSessionId);
    const usage = await getOrCreateUsage(runningSessionId, month);
    const limit = await getPlatformLimit(`brandAnalysisLimit_${planId}`, planId === "free" ? 1 : planId.startsWith("starter") ? 3 : 999);
    if (limit !== 999 && usage.brandAnalysisCount >= limit) {
      res.status(429).json({ error: "Monthly brand analysis limit reached", limit, used: usage.brandAnalysisCount });
      return;
    }
  }

  await db
    .update(analysesTable)
    .set({ status: "analyzing" })
    .where(eq(analysesTable.id, params.data.id));

  try {
    const result = await runBrandAnalysis({
      brandName: analysis.brandName,
      websiteUrl: analysis.websiteUrl,
      brandDescription: analysis.brandDescription,
      instagramHandle: analysis.instagramHandle,
      linkedinUrl: analysis.linkedinUrl,
      facebookUrl: analysis.facebookUrl,
      xHandle: analysis.xHandle,
      industry: analysis.industry,
    });

    const [updatedAnalysis] = await db
      .update(analysesTable)
      .set({
        status: "completed",
        overallScore: result.scores.overallScore,
        websiteScore: result.scores.websiteScore,
        socialScore: result.scores.socialScore,
        contentScore: result.scores.contentScore,
        reviewsScore: result.scores.reviewsScore,
        competitorScore: result.scores.competitorScore,
        messagingScore: result.scores.messagingScore,
        adReadinessLevel: result.scores.adReadinessLevel,
      })
      .where(eq(analysesTable.id, params.data.id))
      .returning();

    const insightValues = result.insights.map((i) => ({
      analysisId: params.data.id,
      category: i.category,
      title: i.title,
      description: i.description,
      severity: i.severity,
    }));

    const insertedInsights = insightValues.length > 0
      ? await db.insert(insightsTable).values(insightValues).returning()
      : [];

    const taskValues = result.tasks.map((t) => ({
      analysisId: params.data.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      category: t.category,
      estimatedDays: t.estimatedDays,
      isDailyTask: t.isDailyTask,
      dayNumber: t.dayNumber,
      isCompleted: false,
    }));

    await logAudit({
      req,
      actorSessionId: getSessionId(req),
      action: "analysis.completed",
      targetType: "analysis",
      targetId: String(params.data.id),
      metadata: { score: result.scores.overallScore, level: result.scores.adReadinessLevel },
    });

    const insertedTasks = taskValues.length > 0
      ? await db.insert(actionTasksTable).values(taskValues).returning()
      : [];

    if (runningSessionId) {
      const month = getCurrentMonth();
      const usage = await getOrCreateUsage(runningSessionId, month);
      await db.update(usageTrackingTable)
        .set({ brandAnalysisCount: usage.brandAnalysisCount + 1 })
        .where(and(eq(usageTrackingTable.sessionId, runningSessionId), eq(usageTrackingTable.month, month)));
    }

    res.json({
      analysis: updatedAnalysis,
      insights: insertedInsights,
      tasks: insertedTasks,
    });
  } catch (err) {
    req.log.error({ err }, "Analysis run failed");
    await db
      .update(analysesTable)
      .set({ status: "failed" })
      .where(eq(analysesTable.id, params.data.id));
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.post("/analyses/:id/predict-readiness", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [analysis] = await db.select().from(analysesTable).where(eq(analysesTable.id, id));
  if (!analysis || analysis.status !== "completed") {
    res.status(404).json({ error: "Completed analysis not found" });
    return;
  }

  const score = analysis.overallScore ?? 0;
  const level = analysis.adReadinessLevel ?? "not_ready";

  if (level === "ready" || score >= 80) {
    res.json({ daysEstimate: 0, message: "Your brand is ad-ready right now!", confident: true });
    return;
  }

  const prompt = `A brand has these scores (out of 100):
- Overall: ${Math.round(score)}
- Website: ${Math.round(analysis.websiteScore ?? 0)}
- Social: ${Math.round(analysis.socialScore ?? 0)}
- Content: ${Math.round(analysis.contentScore ?? 0)}
- Reviews: ${Math.round(analysis.reviewsScore ?? 0)}
- Messaging: ${Math.round(analysis.messagingScore ?? 0)}
- Ad Readiness Level: ${level}

Target to be "ad-ready" is an overall score of 80+.

Estimate how many days it would realistically take a motivated founder working consistently to reach 80+. Consider:
- Low-hanging fruit: social setup takes 1-3 days, reviews take 7-14 days, content takes 14-30 days
- The gap between current score and 80
- Which specific areas need most work

Respond with ONLY a JSON object: {"days": <number>, "reasoning": "<1-2 sentences explaining the key factors>", "topPriorities": ["<action1>", "<action2>", "<action3>"]}`;

  const aiReply = await chatCompletion([
    { role: "system", content: "You are a brand readiness expert. Respond only with the JSON object requested, no markdown, no extra text." },
    { role: "user", content: prompt },
  ], { maxTokens: 300, temperature: 0.5 });

  let daysEstimate = score >= 70 ? 14 : score >= 60 ? 30 : score >= 40 ? 60 : 90;
  let reasoning = "Based on your current score gap and the typical time to implement brand improvements.";
  let topPriorities = ["Set up missing social profiles", "Collect 10 customer reviews", "Publish 3 SEO blog posts"];

  if (aiReply) {
    try {
      const parsed = JSON.parse(aiReply.replace(/```json|```/g, "").trim());
      if (parsed.days) daysEstimate = parsed.days;
      if (parsed.reasoning) reasoning = parsed.reasoning;
      if (parsed.topPriorities) topPriorities = parsed.topPriorities;
    } catch {
      // keep defaults
    }
  }

  res.json({ daysEstimate, reasoning, topPriorities, currentScore: Math.round(score), targetScore: 80 });
});

export default router;
