import { Router } from "express";
import {
  db,
  competitorAdsScansTable,
  userCompetitorsTable,
  platformSettingsTable,
  usageTrackingTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getSessionId } from "../middlewares/auth";
import { runFullAdsScan } from "../lib/ads-scanner";
import { getOrCreateUsage, getCurrentMonth, getPlatformLimit, getUserPlanId } from "./usage";
import { chatCompletion } from "../lib/openai";

const router = Router();

router.get("/user/competitor-ads/:competitorId", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const competitorId = parseInt(req.params.competitorId, 10);
    if (isNaN(competitorId)) { res.status(400).json({ error: "Invalid competitor ID" }); return; }

    const [competitor] = await db
      .select()
      .from(userCompetitorsTable)
      .where(and(eq(userCompetitorsTable.id, competitorId), eq(userCompetitorsTable.sessionId, sessionId)))
      .limit(1);

    if (!competitor) { res.status(404).json({ error: "Competitor not found" }); return; }

    const [existing] = await db
      .select()
      .from(competitorAdsScansTable)
      .where(and(
        eq(competitorAdsScansTable.competitorId, competitorId),
        eq(competitorAdsScansTable.sessionId, sessionId),
      ))
      .limit(1);

    const [metaSetting] = await db.select({ value: platformSettingsTable.value })
      .from(platformSettingsTable).where(eq(platformSettingsTable.key, "metaAdsToken")).limit(1);
    const [serpSetting] = await db.select({ value: platformSettingsTable.value })
      .from(platformSettingsTable).where(eq(platformSettingsTable.key, "serpApiKey")).limit(1);

    res.json({
      scan: existing ?? null,
      competitor: { id: competitor.id, name: competitor.name, website: competitor.website },
      apiStatus: {
        meta: !!metaSetting?.value,
        google: !!serpSetting?.value,
      },
    });
  } catch (err) {
    console.error("[AdsRoute] GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user/competitor-ads/scan", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { competitorId } = req.body as { competitorId?: number };
    if (!competitorId) { res.status(400).json({ error: "competitorId required" }); return; }

    const planId = await getUserPlanId(sessionId);
    const GROWTH_PLANS = ["growth-monthly", "growth-yearly", "starter-monthly"];
    if (!GROWTH_PLANS.includes(planId)) {
      res.status(403).json({ error: "Upgrade to a paid plan to use Competitor Ads Intelligence" });
      return;
    }

    const [competitor] = await db
      .select()
      .from(userCompetitorsTable)
      .where(and(eq(userCompetitorsTable.id, competitorId), eq(userCompetitorsTable.sessionId, sessionId)))
      .limit(1);

    if (!competitor) { res.status(404).json({ error: "Competitor not found" }); return; }

    const CACHE_HOURS = 24;
    const [existing] = await db
      .select()
      .from(competitorAdsScansTable)
      .where(and(
        eq(competitorAdsScansTable.competitorId, competitorId),
        eq(competitorAdsScansTable.sessionId, sessionId),
      ))
      .limit(1);

    if (existing) {
      const ageHours = (Date.now() - new Date(existing.cachedAt).getTime()) / (1000 * 60 * 60);
      const forceRefresh = (req.body as { force?: boolean }).force === true;
      if (ageHours < CACHE_HOURS && !forceRefresh) {
        res.json({ scan: existing, cached: true });
        return;
      }
    }

    const adsMonth = getCurrentMonth();
    const adsPlanId = await getUserPlanId(sessionId);
    const adsUsage = await getOrCreateUsage(sessionId, adsMonth);
    const adsLimit = await getPlatformLimit(`adsIntelligenceLimit_${adsPlanId}`, adsPlanId === "free" ? 0 : adsPlanId.startsWith("starter") ? 3 : 999);
    if (adsLimit !== 999 && adsUsage.adsIntelligenceCount >= adsLimit) {
      res.status(429).json({ error: "Monthly ads intelligence limit reached", limit: adsLimit, used: adsUsage.adsIntelligenceCount });
      return;
    }

    const scan = await runFullAdsScan({
      sessionId,
      competitorId: competitor.id,
      competitorName: competitor.name,
      competitorWebsite: competitor.website,
    });

    await db.update(usageTrackingTable)
      .set({ adsIntelligenceCount: adsUsage.adsIntelligenceCount + 1 })
      .where(and(eq(usageTrackingTable.sessionId, sessionId), eq(usageTrackingTable.month, adsMonth)));

    res.json({ scan, cached: false });
  } catch (err) {
    console.error("[AdsRoute] SCAN error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/user/competitor-ads/:competitorId", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const competitorId = parseInt(req.params.competitorId, 10);
    if (isNaN(competitorId)) { res.status(400).json({ error: "Invalid competitor ID" }); return; }

    await db
      .delete(competitorAdsScansTable)
      .where(and(
        eq(competitorAdsScansTable.competitorId, competitorId),
        eq(competitorAdsScansTable.sessionId, sessionId),
      ));

    res.json({ success: true });
  } catch (err) {
    console.error("[AdsRoute] DELETE error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user/competitor-ads/analyze-copy", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { adCopy, platform, competitorName } = req.body as {
      adCopy?: string; platform?: string; competitorName?: string;
    };
    if (!adCopy || adCopy.trim().length < 10) {
      res.status(400).json({ error: "adCopy is required (min 10 characters)" });
      return;
    }

    const prompt = `You are a direct-response advertising analyst. Deeply analyze this competitor ad copy and provide a structured breakdown.

Competitor: ${competitorName ?? "Unknown"}
Platform: ${platform ?? "Unknown"}
Ad Copy:
"""
${adCopy}
"""

Respond with ONLY valid JSON:
{
  "hook": "<the opening hook or attention-grabbing element>",
  "angle": "<the core persuasion angle (e.g. fear, aspiration, social proof, curiosity)>",
  "targetAudience": "<who this ad is clearly targeting>",
  "emotionalTriggers": ["<trigger 1>", "<trigger 2>", "<trigger 3>"],
  "painPointsAddressed": ["<pain 1>", "<pain 2>"],
  "ctaStyle": "<description of the call-to-action approach>",
  "valueProposition": "<the core promise or benefit offered>",
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "strengths": ["<strength 1>", "<strength 2>"],
  "overallRating": "<Excellent|Good|Average|Weak>",
  "counterOpportunity": "<1-2 sentence insight on how you can beat this ad with your own approach>"
}`;

    const raw = await chatCompletion([
      { role: "system", content: "You are an expert ad copy analyst. Respond with valid JSON only, no markdown." },
      { role: "user", content: prompt },
    ], { maxTokens: 1000, temperature: 0.4 });

    if (!raw) {
      res.status(503).json({ error: "Ad copy analysis is currently unavailable. Please try again later." });
      return;
    }

    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(parsed);
  } catch (err) {
    console.error("[AdsRoute] analyze-copy error:", err);
    res.status(500).json({ error: "Failed to analyze ad copy" });
  }
});

router.post("/user/competitor-ads/counter-strategy", async (req, res) => {
  try {
    const sessionId = getSessionId(req);
    if (!sessionId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { competitorId } = req.body as { competitorId?: number };
    if (!competitorId) { res.status(400).json({ error: "competitorId required" }); return; }

    const [competitor] = await db
      .select()
      .from(userCompetitorsTable)
      .where(and(eq(userCompetitorsTable.id, competitorId), eq(userCompetitorsTable.sessionId, sessionId)))
      .limit(1);

    if (!competitor) { res.status(404).json({ error: "Competitor not found" }); return; }

    const [scan] = await db
      .select()
      .from(competitorAdsScansTable)
      .where(and(eq(competitorAdsScansTable.competitorId, competitorId), eq(competitorAdsScansTable.sessionId, sessionId)))
      .limit(1);

    const metaAdSample = scan?.metaAds
      ? (scan.metaAds as { adCreativeBodies?: string[]; adCreativeLinkTitles?: string[] }[])
          .slice(0, 3)
          .map((a) => `Title: ${a.adCreativeLinkTitles?.[0] ?? "N/A"} | Body: ${a.adCreativeBodies?.[0]?.slice(0, 120) ?? "N/A"}`)
          .join("\n")
      : "No Meta ads data";

    const googleAdSample = scan?.googleAds
      ? (scan.googleAds as { title: string; description?: string }[])
          .slice(0, 3)
          .map((a) => `Title: ${a.title} | Desc: ${a.description ?? "N/A"}`)
          .join("\n")
      : "No Google ads data";

    const scanContext = scan
      ? `Activity Level: ${scan.activityLabel ?? "Unknown"} (Score: ${scan.overallActivityScore ?? 0}/100)
Meta Ads Running: ${scan.metaAds ? (scan.metaAds as unknown[]).length : 0} ads
Google Ads Running: ${scan.googleAds ? (scan.googleAds as unknown[]).length : 0} ads
Sample Meta Ads:\n${metaAdSample}
Sample Google Ads:\n${googleAdSample}
AI Summary: ${(scan.aiInsights as { summary?: string } | null)?.summary ?? "None"}`
      : "No scan data available — generate a counter-strategy based on the competitor name and website.";

    const prompt = `You are a competitive advertising strategist. Generate a counter-advertising strategy to beat ${competitor.name}${competitor.website ? ` (${competitor.website})` : ""}.

Their current ad activity:
${scanContext}

Respond with ONLY valid JSON:
{
  "competitorName": "${competitor.name}",
  "currentStrategy": "<1-2 sentence summary of their advertising approach>",
  "messagingGaps": ["<gap 1>", "<gap 2>", "<gap 3>"],
  "counterAngles": ["<positioning angle 1>", "<positioning angle 2>", "<positioning angle 3>"],
  "adConcepts": [
    { "platform": "Meta", "headline": "<headline>", "body": "<ad body text>", "cta": "<CTA text>" },
    { "platform": "Google", "headline": "<headline>", "body": "<description>", "cta": "<CTA text>" }
  ],
  "keywordOpportunities": ["<keyword 1>", "<keyword 2>", "<keyword 3>"],
  "recommendations": ["<action 1>", "<action 2>", "<action 3>"]
}`;

    const raw = await chatCompletion([
      { role: "system", content: "You are an expert competitive advertising strategist. Respond with valid JSON only." },
      { role: "user", content: prompt },
    ], { maxTokens: 1400, temperature: 0.6 });

    if (!raw) {
      res.status(503).json({ error: "Counter strategy generation is currently unavailable. Please try again later." });
      return;
    }

    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ ...parsed, hasScanData: !!scan });
  } catch (err) {
    console.error("[AdsRoute] counter-strategy error:", err);
    res.status(500).json({ error: "Failed to generate counter strategy" });
  }
});

export default router;
