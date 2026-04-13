import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, usageTrackingTable, platformSettingsTable, userProfilesTable, subscriptionsTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";

const router: IRouter = Router();

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getPlatformLimit(key: string, defaultVal: number): Promise<number> {
  const [row] = await db.select({ value: platformSettingsTable.value }).from(platformSettingsTable).where(eq(platformSettingsTable.key, key));
  if (!row?.value) return defaultVal;
  const n = parseInt(row.value);
  return isNaN(n) ? defaultVal : n;
}

async function getUserPlanId(sessionId: string): Promise<string> {
  const [profile] = await db.select({ email: userProfilesTable.email }).from(userProfilesTable).where(eq(userProfilesTable.sessionId, sessionId));
  if (!profile?.email) return "free";
  const [sub] = await db.select({ planId: subscriptionsTable.planId }).from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, profile.email), eq(subscriptionsTable.isActive, true)));
  return sub?.planId ?? "free";
}

async function getOrCreateUsage(sessionId: string, month: string) {
  const [existing] = await db.select().from(usageTrackingTable)
    .where(and(eq(usageTrackingTable.sessionId, sessionId), eq(usageTrackingTable.month, month)));
  if (existing) return existing;
  const [created] = await db.insert(usageTrackingTable).values({ sessionId, month }).returning();
  return created;
}

router.get("/user/usage", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const month = getCurrentMonth();
  const planId = await getUserPlanId(sessionId);
  const usage = await getOrCreateUsage(sessionId, month);

  const [brandLimit, competitorAnalysisLimit, adsLimit] = await Promise.all([
    getPlatformLimit(`brandAnalysisLimit_${planId}`, planId === "free" ? 1 : planId.startsWith("starter") ? 3 : 999),
    getPlatformLimit(`competitorAnalysisLimit_${planId}`, planId === "free" ? 2 : planId.startsWith("starter") ? 5 : 999),
    getPlatformLimit(`adsIntelligenceLimit_${planId}`, planId === "free" ? 0 : planId.startsWith("starter") ? 3 : 999),
  ]);

  res.json({
    month,
    planId,
    usage: {
      brandAnalysis: usage.brandAnalysisCount,
      competitorAnalysis: usage.competitorAnalysisCount,
      adsIntelligence: usage.adsIntelligenceCount,
    },
    limits: {
      brandAnalysis: brandLimit,
      competitorAnalysis: competitorAnalysisLimit,
      adsIntelligence: adsLimit,
    },
  });
});

router.post("/user/usage/track", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { type } = req.body ?? {};
  if (!["brandAnalysis", "competitorAnalysis", "adsIntelligence"].includes(type)) {
    res.status(400).json({ error: "Invalid type" });
    return;
  }

  const month = getCurrentMonth();
  const planId = await getUserPlanId(sessionId);
  const usage = await getOrCreateUsage(sessionId, month);

  const limitKey = type === "brandAnalysis" ? `brandAnalysisLimit_${planId}`
    : type === "competitorAnalysis" ? `competitorAnalysisLimit_${planId}`
    : `adsIntelligenceLimit_${planId}`;
  const defaultLimit = type === "brandAnalysis"
    ? (planId === "free" ? 1 : planId.startsWith("starter") ? 3 : 999)
    : type === "competitorAnalysis"
    ? (planId === "free" ? 2 : planId.startsWith("starter") ? 5 : 999)
    : (planId === "free" ? 0 : planId.startsWith("starter") ? 3 : 999);

  const limit = await getPlatformLimit(limitKey, defaultLimit);
  const currentCount = type === "brandAnalysis" ? usage.brandAnalysisCount
    : type === "competitorAnalysis" ? usage.competitorAnalysisCount
    : usage.adsIntelligenceCount;

  if (limit !== 999 && currentCount >= limit) {
    res.status(429).json({ error: "Monthly limit reached", limit, used: currentCount });
    return;
  }

  const updateField = type === "brandAnalysis" ? { brandAnalysisCount: currentCount + 1 }
    : type === "competitorAnalysis" ? { competitorAnalysisCount: currentCount + 1 }
    : { adsIntelligenceCount: currentCount + 1 };

  const [updated] = await db.update(usageTrackingTable).set(updateField)
    .where(and(eq(usageTrackingTable.sessionId, sessionId), eq(usageTrackingTable.month, month)))
    .returning();

  res.json({ success: true, usage: updated });
});

export { getOrCreateUsage, getCurrentMonth, getPlatformLimit, getUserPlanId };
export default router;
