import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, analysesTable, brandProfilesTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";

const router: IRouter = Router();

function anonymizeIndustry(industry: string): string {
  return industry.trim().toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

router.get("/benchmarks/industry", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const [userBrand] = await db.select({ industry: brandProfilesTable.industry })
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.sessionId, sessionId))
    .limit(1);

  const userIndustry = userBrand?.industry ?? null;

  const allAnalyses = await db.select({
    overallScore: analysesTable.overallScore,
    websiteScore: analysesTable.websiteScore,
    socialScore: analysesTable.socialScore,
    contentScore: analysesTable.contentScore,
    reviewsScore: analysesTable.reviewsScore,
    messagingScore: analysesTable.messagingScore,
    adReadinessLevel: analysesTable.adReadinessLevel,
    industry: analysesTable.industry,
    sessionId: analysesTable.sessionId,
  }).from(analysesTable)
    .where(eq(analysesTable.status, "completed"))
    .orderBy(desc(analysesTable.createdAt));

  const byIndustry: Record<string, {
    count: number;
    overall: number[];
    website: number[];
    social: number[];
    content: number[];
    reviews: number[];
    messaging: number[];
    adReady: number;
  }> = {};

  for (const a of allAnalyses) {
    const ind = anonymizeIndustry(a.industry ?? "general");
    if (!byIndustry[ind]) {
      byIndustry[ind] = { count: 0, overall: [], website: [], social: [], content: [], reviews: [], messaging: [], adReady: 0 };
    }
    const group = byIndustry[ind];
    group.count++;
    if (a.overallScore != null) group.overall.push(a.overallScore);
    if (a.websiteScore != null) group.website.push(a.websiteScore);
    if (a.socialScore != null) group.social.push(a.socialScore);
    if (a.contentScore != null) group.content.push(a.contentScore);
    if (a.reviewsScore != null) group.reviews.push(a.reviewsScore);
    if (a.messagingScore != null) group.messaging.push(a.messagingScore);
    if (a.adReadinessLevel === "ready") group.adReady++;
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  const benchmarks = Object.entries(byIndustry)
    .filter(([, g]) => g.count >= 1)
    .map(([industry, g]) => ({
      industry,
      brandCount: g.count,
      avgOverall: avg(g.overall),
      avgWebsite: avg(g.website),
      avgSocial: avg(g.social),
      avgContent: avg(g.content),
      avgReviews: avg(g.reviews),
      avgMessaging: avg(g.messaging),
      adReadyPercent: g.count > 0 ? Math.round((g.adReady / g.count) * 100) : 0,
    }))
    .sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));

  const userAnalysis = userIndustry
    ? allAnalyses.filter(a => a.sessionId === sessionId && a.overallScore != null).slice(0, 1)[0]
    : null;

  res.json({
    benchmarks,
    userIndustry: userIndustry ? anonymizeIndustry(userIndustry) : null,
    userLatestScore: userAnalysis?.overallScore ?? null,
    totalBrandsAnalyzed: allAnalyses.length,
  });
});

export default router;
