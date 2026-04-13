import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, savedCompetitorAnalysesTable, analysesTable, competitorAdsScansTable, insightsTable, actionTasksTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/user/saved-analyses/competitor", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const rows = await db
    .select()
    .from(savedCompetitorAnalysesTable)
    .where(eq(savedCompetitorAnalysesTable.sessionId, sessionId))
    .orderBy(desc(savedCompetitorAnalysesTable.createdAt));

  res.json(rows);
});

router.post("/user/saved-analyses/competitor", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { brandId, competitorId, brandName, competitorName, result } = req.body ?? {};

  if (!brandName || !competitorName || !result) {
    res.status(400).json({ error: "brandName, competitorName, and result are required" });
    return;
  }

  const [saved] = await db
    .insert(savedCompetitorAnalysesTable)
    .values({
      sessionId,
      brandId: brandId ?? null,
      competitorId: competitorId ?? null,
      brandName: String(brandName),
      competitorName: String(competitorName),
      result,
    })
    .returning();

  res.status(201).json(saved);
});

router.delete("/user/saved-analyses/competitor/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const deleted = await db
    .delete(savedCompetitorAnalysesTable)
    .where(and(eq(savedCompetitorAnalysesTable.id, id), eq(savedCompetitorAnalysesTable.sessionId, sessionId)))
    .returning({ id: savedCompetitorAnalysesTable.id });

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.get("/user/saved-analyses/brand", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const rows = await db
    .select()
    .from(analysesTable)
    .where(and(eq(analysesTable.sessionId, sessionId), eq(analysesTable.status, "completed")))
    .orderBy(desc(analysesTable.createdAt));

  res.json(rows);
});

router.delete("/user/saved-analyses/brand/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(insightsTable).where(eq(insightsTable.analysisId, id));
  await db.delete(actionTasksTable).where(eq(actionTasksTable.analysisId, id));
  const deleted = await db
    .delete(analysesTable)
    .where(and(eq(analysesTable.id, id), eq(analysesTable.sessionId, sessionId)))
    .returning({ id: analysesTable.id });

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

router.get("/user/saved-analyses/ads", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const rows = await db
    .select()
    .from(competitorAdsScansTable)
    .where(eq(competitorAdsScansTable.sessionId, sessionId))
    .orderBy(desc(competitorAdsScansTable.createdAt));

  res.json(rows);
});

router.delete("/user/saved-analyses/ads/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const deleted = await db
    .delete(competitorAdsScansTable)
    .where(and(eq(competitorAdsScansTable.id, id), eq(competitorAdsScansTable.sessionId, sessionId)))
    .returning({ id: competitorAdsScansTable.id });

  if (!deleted.length) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
