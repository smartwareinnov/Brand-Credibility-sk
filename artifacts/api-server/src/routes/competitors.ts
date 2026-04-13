import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  userCompetitorsTable,
  brandProfilesTable,
  userProfilesTable,
  subscriptionsTable,
  platformSettingsTable,
  userBrandsTable,
  usageTrackingTable,
  brandMentionsTable,
  competitorScoreSnapshotsTable,
} from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { getOrCreateUsage, getCurrentMonth, getPlatformLimit, getUserPlanId } from "./usage";

const router: IRouter = Router();

function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(hash);
}

function generateCompetitorScores(name: string, opts: {
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  xHandle?: string | null;
  linkedin?: string | null;
}) {
  const seed = hashString(name);
  const rng = (offset: number, min = 20, max = 75) => {
    const x = Math.sin(seed + offset) * 10000;
    const base = (x - Math.floor(x)) * (max - min) + min;
    return Math.round(base);
  };

  const hasWebsite = !!opts.website?.trim();
  const socialCount = [opts.instagram, opts.facebook, opts.xHandle, opts.linkedin].filter(Boolean).length;

  const website = Math.min(95, rng(1, 25, 70) + (hasWebsite ? 15 : 0));
  const social = Math.min(95, rng(2, 15, 65) + socialCount * 7);
  const content = Math.min(95, rng(3, 20, 70) + (hasWebsite ? 8 : 0) + (socialCount > 1 ? 5 : 0));
  const reviews = rng(4, 20, 65);
  const competitor = rng(5, 20, 60);
  const messaging = Math.min(95, rng(6, 25, 70) + (hasWebsite ? 5 : 0));
  const overall = Math.round((website + social + content + reviews + competitor + messaging) / 6);

  return { website, social, content, reviews, competitor, messaging, overall };
}

async function getCompetitorLimit(sessionId: string): Promise<{ limit: number; planId: string }> {
  const DEFAULT_LIMITS: Record<string, number> = {
    free: 1,
    "starter-monthly": 3,
    "growth-monthly": 5,
    "growth-yearly": 999,
  };

  try {
    const [user] = await db
      .select({ email: userProfilesTable.email })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.sessionId, sessionId));

    if (!user?.email) return { limit: DEFAULT_LIMITS.free!, planId: "free" };

    const [activeSub] = await db
      .select({ planId: subscriptionsTable.planId })
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.email, user.email),
          eq(subscriptionsTable.isActive, true),
          eq(subscriptionsTable.status, "active")
        )
      )
      .limit(1);

    const planId = activeSub?.planId ?? "free";

    const settingKey = `competitorLimit_${planId}`;
    const [setting] = await db
      .select({ value: platformSettingsTable.value })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, settingKey))
      .limit(1);

    const limit = setting?.value ? parseInt(setting.value) : (DEFAULT_LIMITS[planId] ?? DEFAULT_LIMITS.free!);

    return { limit: isNaN(limit) ? DEFAULT_LIMITS.free! : limit, planId };
  } catch {
    return { limit: DEFAULT_LIMITS.free!, planId: "free" };
  }
}

router.get("/user/competitors/limit", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { limit, planId } = await getCompetitorLimit(sessionId);

  const current = await db
    .select({ id: userCompetitorsTable.id })
    .from(userCompetitorsTable)
    .where(eq(userCompetitorsTable.sessionId, sessionId));

  res.json({ limit, planId, current: current.length, canAdd: current.length < limit });
});

router.get("/user/competitors", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  let competitors = await db
    .select()
    .from(userCompetitorsTable)
    .where(eq(userCompetitorsTable.sessionId, sessionId));

  if (competitors.length === 0) {
    const [brand] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.sessionId, sessionId));

    if (brand) {
      const fromBrand = [brand.competitor1, brand.competitor2, brand.competitor3].filter(Boolean) as string[];
      if (fromBrand.length > 0) {
        const toInsert = fromBrand.map((name) => {
          const scores = generateCompetitorScores(name, {});
          return {
            sessionId,
            name,
            estimatedScore: scores.overall,
            websiteScore: scores.website,
            socialScore: scores.social,
            contentScore: scores.content,
            reviewsScore: scores.reviews,
            competitorScore: scores.competitor,
            messagingScore: scores.messaging,
            source: "brand_setup",
          };
        });
        competitors = await db.insert(userCompetitorsTable).values(toInsert).returning();
      }
    }
  }

  res.json(competitors);
});

router.post("/user/competitors", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { name, website, instagram, facebook, xHandle, linkedin } = req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Competitor name is required" });
    return;
  }

  const { limit, planId } = await getCompetitorLimit(sessionId);

  const existing = await db
    .select({ id: userCompetitorsTable.id })
    .from(userCompetitorsTable)
    .where(eq(userCompetitorsTable.sessionId, sessionId));

  if (existing.length >= limit) {
    res.status(403).json({
      error: `Your ${planId === "free" ? "free" : planId} plan allows up to ${limit} competitor${limit === 1 ? "" : "s"}. Please upgrade to add more.`,
      limitReached: true,
      planId,
      limit,
    });
    return;
  }

  const scores = generateCompetitorScores(name.trim(), { website, instagram, facebook, xHandle, linkedin });

  const [competitor] = await db
    .insert(userCompetitorsTable)
    .values({
      sessionId,
      name: name.trim(),
      website: website?.trim() || null,
      instagram: instagram?.trim() || null,
      facebook: facebook?.trim() || null,
      xHandle: xHandle?.trim() || null,
      linkedin: linkedin?.trim() || null,
      estimatedScore: scores.overall,
      websiteScore: scores.website,
      socialScore: scores.social,
      contentScore: scores.content,
      reviewsScore: scores.reviews,
      competitorScore: scores.competitor,
      messagingScore: scores.messaging,
      source: "manual",
    })
    .returning();

  res.status(201).json(competitor);
});

router.patch("/user/competitors/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid competitor id" }); return; }

  const { name, website, instagram, facebook, xHandle, linkedin } = req.body ?? {};
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Competitor name is required" });
    return;
  }

  const scores = generateCompetitorScores(name.trim(), { website, instagram, facebook, xHandle, linkedin });

  const [updated] = await db
    .update(userCompetitorsTable)
    .set({
      name: name.trim(),
      website: website?.trim() || null,
      instagram: instagram?.trim() || null,
      facebook: facebook?.trim() || null,
      xHandle: xHandle?.trim() || null,
      linkedin: linkedin?.trim() || null,
      estimatedScore: scores.overall,
      websiteScore: scores.website,
      socialScore: scores.social,
      contentScore: scores.content,
      reviewsScore: scores.reviews,
      competitorScore: scores.competitor,
      messagingScore: scores.messaging,
    })
    .where(and(eq(userCompetitorsTable.id, id), eq(userCompetitorsTable.sessionId, sessionId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Competitor not found" }); return; }

  res.json(updated);
});

router.post("/user/competitor-analysis", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const month = getCurrentMonth();
  const planId = await getUserPlanId(sessionId);
  const usageNow = await getOrCreateUsage(sessionId, month);
  const compLimit = await getPlatformLimit(`competitorAnalysisLimit_${planId}`, planId === "free" ? 2 : planId.startsWith("starter") ? 5 : 999);
  if (compLimit !== 999 && usageNow.competitorAnalysisCount >= compLimit) {
    res.status(429).json({ error: "Monthly competitor analysis limit reached", limit: compLimit, used: usageNow.competitorAnalysisCount });
    return;
  }

  const { brandId, competitorId } = req.body ?? {};
  if (!brandId || !competitorId) {
    res.status(400).json({ error: "brandId and competitorId are required" });
    return;
  }

  const [brand] = await db
    .select()
    .from(userBrandsTable)
    .where(and(eq(userBrandsTable.id, parseInt(brandId)), eq(userBrandsTable.sessionId, sessionId)));

  if (!brand) { res.status(404).json({ error: "Brand not found" }); return; }

  const [competitor] = await db
    .select()
    .from(userCompetitorsTable)
    .where(and(eq(userCompetitorsTable.id, parseInt(competitorId)), eq(userCompetitorsTable.sessionId, sessionId)));

  if (!competitor) { res.status(404).json({ error: "Competitor not found" }); return; }

  const brandScores = generateCompetitorScores(brand.brandName, {
    website: brand.websiteUrl,
    instagram: brand.instagramHandle,
    facebook: brand.facebookUrl,
    xHandle: brand.xHandle,
    linkedin: brand.linkedinUrl,
  });

  const competitorScores = {
    website: competitor.websiteScore ?? generateCompetitorScores(competitor.name, { website: competitor.website, instagram: competitor.instagram, facebook: competitor.facebook, xHandle: competitor.xHandle, linkedin: competitor.linkedin }).website,
    social: competitor.socialScore ?? 40,
    content: competitor.contentScore ?? 40,
    reviews: competitor.reviewsScore ?? 35,
    competitor: competitor.competitorScore ?? 38,
    messaging: competitor.messagingScore ?? 40,
    overall: competitor.estimatedScore ?? 45,
  };

  const dimensions = [
    { key: "website", label: "Website & SEO", brandScore: brandScores.website, competitorScore: competitorScores.website },
    { key: "social", label: "Social Media", brandScore: brandScores.social, competitorScore: competitorScores.social },
    { key: "content", label: "Content Quality", brandScore: brandScores.content, competitorScore: competitorScores.content },
    { key: "reviews", label: "Customer Reviews", brandScore: brandScores.reviews, competitorScore: competitorScores.reviews },
    { key: "positioning", label: "Market Positioning", brandScore: brandScores.competitor, competitorScore: competitorScores.competitor },
    { key: "messaging", label: "Brand Messaging", brandScore: brandScores.messaging, competitorScore: competitorScores.messaging },
  ];

  const brandWins = dimensions.filter(d => d.brandScore > d.competitorScore).length;
  const competitorWins = dimensions.filter(d => d.competitorScore > d.brandScore).length;
  const overallWinner = brandScores.overall >= competitorScores.overall ? "brand" : "competitor";
  const scoreDiff = Math.abs(brandScores.overall - competitorScores.overall);

  const weakDimensions = dimensions.filter(d => d.brandScore < d.competitorScore).sort((a, b) => (b.competitorScore - b.brandScore) - (a.competitorScore - a.brandScore));
  const strongDimensions = dimensions.filter(d => d.brandScore > d.competitorScore).sort((a, b) => (b.brandScore - b.competitorScore) - (a.brandScore - a.competitorScore));

  const recommendations: string[] = [];

  if (weakDimensions.length > 0) {
    const topWeak = weakDimensions[0];
    recommendations.push(`Priority gap: ${brand.brandName} scores ${topWeak.brandScore} vs ${competitor.name}'s ${topWeak.competitorScore} on ${topWeak.label}. Close this gap first as it's your biggest competitive weakness.`);
  }
  if (strongDimensions.length > 0) {
    const topStrong = strongDimensions[0];
    recommendations.push(`Key advantage: ${brand.brandName} leads on ${topStrong.label} (${topStrong.brandScore} vs ${topStrong.competitorScore}). Amplify this in your ad copy and positioning to differentiate from ${competitor.name}.`);
  }
  if (overallWinner === "competitor") {
    recommendations.push(`${competitor.name} is currently ahead overall. Focus your next 30 days on improving ${weakDimensions.slice(0, 2).map(d => d.label.toLowerCase()).join(" and ")} to close the gap.`);
  } else {
    recommendations.push(`${brand.brandName} leads overall. Maintain your advantage by continuously monitoring ${competitor.name}'s moves and staying ahead on your strongest dimensions.`);
  }

  if (!brand.instagramHandle && !brand.linkedinUrl) {
    recommendations.push(`${brand.brandName} has no social media presence — this is a critical vulnerability. ${competitor.name} almost certainly has active social profiles that validate their brand to ad-referred visitors.`);
  }

  await db.update(usageTrackingTable)
    .set({ competitorAnalysisCount: usageNow.competitorAnalysisCount + 1 })
    .where(and(eq(usageTrackingTable.sessionId, sessionId), eq(usageTrackingTable.month, month)));

  res.json({
    brand: {
      id: brand.id,
      name: brand.brandName,
      website: brand.websiteUrl,
      industry: brand.industry,
      scores: { ...brandScores, overall: brandScores.overall },
    },
    competitor: {
      id: competitor.id,
      name: competitor.name,
      website: competitor.website,
      scores: { ...competitorScores },
    },
    dimensions,
    overallWinner,
    scoreDiff,
    brandWins,
    competitorWins,
    recommendations,
  });
});

router.post("/user/competitors/:id/scan", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid competitor id" }); return; }

  const [competitor] = await db
    .select()
    .from(userCompetitorsTable)
    .where(and(eq(userCompetitorsTable.id, id), eq(userCompetitorsTable.sessionId, sessionId)));

  if (!competitor) {
    res.status(404).json({ error: "Competitor not found" });
    return;
  }

  const scores = generateCompetitorScores(competitor.name, {
    website: competitor.website,
    instagram: competitor.instagram,
    facebook: competitor.facebook,
    xHandle: competitor.xHandle,
    linkedin: competitor.linkedin,
  });

  const noise = () => Math.floor(Math.random() * 10) - 5;

  const [updated] = await db
    .update(userCompetitorsTable)
    .set({
      estimatedScore: Math.min(95, Math.max(5, scores.overall + noise())),
      websiteScore: Math.min(95, Math.max(5, scores.website + noise())),
      socialScore: Math.min(95, Math.max(5, scores.social + noise())),
      contentScore: Math.min(95, Math.max(5, scores.content + noise())),
      reviewsScore: Math.min(95, Math.max(5, scores.reviews + noise())),
      competitorScore: Math.min(95, Math.max(5, scores.competitor + noise())),
      messagingScore: Math.min(95, Math.max(5, scores.messaging + noise())),
      lastScannedAt: new Date(),
    })
    .where(and(eq(userCompetitorsTable.id, id), eq(userCompetitorsTable.sessionId, sessionId)))
    .returning();

  res.json(updated);
});

router.delete("/user/competitors/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid competitor id" }); return; }

  const deleted = await db
    .delete(userCompetitorsTable)
    .where(and(eq(userCompetitorsTable.id, id), eq(userCompetitorsTable.sessionId, sessionId)))
    .returning({ id: userCompetitorsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Competitor not found" });
    return;
  }

  res.json({ success: true });
});

router.get("/user/brands", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const brands = await db
    .select()
    .from(userBrandsTable)
    .where(eq(userBrandsTable.sessionId, sessionId));

  res.json(brands);
});

router.post("/user/brands", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { planId } = await getCompetitorLimit(sessionId);
  const isGrowth = planId === "growth-monthly" || planId === "growth-yearly";

  const { brandName, websiteUrl, industry, instagramHandle, facebookUrl, xHandle, linkedinUrl } = req.body ?? {};
  if (!brandName?.trim()) {
    res.status(400).json({ error: "Brand name is required" });
    return;
  }

  const existing = await db
    .select({ id: userBrandsTable.id })
    .from(userBrandsTable)
    .where(eq(userBrandsTable.sessionId, sessionId));

  if (!isGrowth && existing.length >= 1) {
    res.status(403).json({ error: "Free plan allows 1 brand. Upgrade to Growth to add more.", planId });
    return;
  }

  if (existing.length >= 10) {
    res.status(403).json({ error: "Maximum of 10 brands reached." });
    return;
  }

  const isFirst = existing.length === 0;
  const [brand] = await db
    .insert(userBrandsTable)
    .values({
      sessionId,
      brandName: brandName.trim(),
      websiteUrl: websiteUrl?.trim() || null,
      industry: industry?.trim() || null,
      instagramHandle: instagramHandle?.trim() || null,
      facebookUrl: facebookUrl?.trim() || null,
      xHandle: xHandle?.trim() || null,
      linkedinUrl: linkedinUrl?.trim() || null,
      isDefault: isFirst,
    })
    .returning();

  res.status(201).json(brand);
});

router.patch("/user/brands/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid brand id" }); return; }

  const { planId } = await getCompetitorLimit(sessionId);
  if (planId === "free") {
    res.status(403).json({ error: "Free plan users cannot edit brands. Please upgrade to manage your brands.", planId });
    return;
  }

  const { brandName, websiteUrl, industry, instagramHandle, facebookUrl, xHandle, linkedinUrl } = req.body ?? {};
  if (!brandName?.trim()) {
    res.status(400).json({ error: "Brand name is required" });
    return;
  }

  const [updated] = await db
    .update(userBrandsTable)
    .set({
      brandName: brandName.trim(),
      websiteUrl: websiteUrl?.trim() || null,
      industry: industry?.trim() || null,
      instagramHandle: instagramHandle?.trim() || null,
      facebookUrl: facebookUrl?.trim() || null,
      xHandle: xHandle?.trim() || null,
      linkedinUrl: linkedinUrl?.trim() || null,
    })
    .where(and(eq(userBrandsTable.id, id), eq(userBrandsTable.sessionId, sessionId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json(updated);
});

router.delete("/user/brands/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid brand id" }); return; }

  const { planId } = await getCompetitorLimit(sessionId);
  if (planId === "free") {
    res.status(403).json({ error: "Free plan users cannot delete brands. Please upgrade to manage your brands.", planId });
    return;
  }

  const deleted = await db
    .delete(userBrandsTable)
    .where(and(eq(userBrandsTable.id, id), eq(userBrandsTable.sessionId, sessionId)))
    .returning({ id: userBrandsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Brand not found" });
    return;
  }

  res.json({ success: true });
});

router.get("/user/competitors/share-of-voice", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const [brand] = await db.select().from(brandProfilesTable).where(eq(brandProfilesTable.sessionId, sessionId)).limit(1);
  const competitors = await db.select().from(userCompetitorsTable).where(eq(userCompetitorsTable.sessionId, sessionId));
  const mentions = await db.select({ source: brandMentionsTable.source, sentiment: brandMentionsTable.sentiment })
    .from(brandMentionsTable).where(eq(brandMentionsTable.sessionId, sessionId));

  const brandName = brand?.brandName ?? "Your Brand";
  const brandMentionCount = mentions.length;

  function seededCount(name: string, base: number): number {
    let h = 5381;
    for (let i = 0; i < name.length; i++) h = (h * 33) ^ name.charCodeAt(i);
    const x = Math.sin(Math.abs(h)) * 10000;
    const frac = x - Math.floor(x);
    return Math.max(1, Math.round(base * (0.4 + frac * 0.8)));
  }

  const competitorMentionCounts: { name: string; count: number }[] = competitors.map(c => ({
    name: c.name,
    count: seededCount(c.name, Math.max(1, brandMentionCount)),
  }));

  const total = brandMentionCount + competitorMentionCounts.reduce((s, c) => s + c.count, 0);
  const brandShare = total > 0 ? Math.round((brandMentionCount / total) * 100) : 0;

  const sentimentCounts = mentions.reduce((acc, m) => {
    acc[m.sentiment as string] = (acc[m.sentiment as string] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    brandName,
    brandMentions: brandMentionCount,
    brandSharePercent: brandShare,
    competitors: competitorMentionCounts.map(c => ({
      name: c.name,
      mentions: c.count,
      sharePercent: total > 0 ? Math.round((c.count / total) * 100) : 0,
    })),
    sentimentBreakdown: {
      positive: sentimentCounts.positive ?? 0,
      neutral: sentimentCounts.neutral ?? 0,
      negative: sentimentCounts.negative ?? 0,
    },
    totalMentions: total,
  });
});

router.post("/user/competitors/:id/snapshot", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [competitor] = await db.select().from(userCompetitorsTable)
    .where(and(eq(userCompetitorsTable.id, id), eq(userCompetitorsTable.sessionId, sessionId)));

  if (!competitor) { res.status(404).json({ error: "Competitor not found" }); return; }

  const [snapshot] = await db.insert(competitorScoreSnapshotsTable).values({
    sessionId,
    competitorId: competitor.id,
    competitorName: competitor.name,
    overallScore: competitor.estimatedScore,
    websiteScore: competitor.websiteScore,
    socialScore: competitor.socialScore,
    contentScore: competitor.contentScore,
    reviewsScore: competitor.reviewsScore,
    messagingScore: competitor.messagingScore,
  }).returning();

  res.json(snapshot);
});

router.get("/user/competitors/:id/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const snapshots = await db.select().from(competitorScoreSnapshotsTable)
    .where(and(
      eq(competitorScoreSnapshotsTable.sessionId, sessionId),
      eq(competitorScoreSnapshotsTable.competitorId, id)
    ))
    .orderBy(desc(competitorScoreSnapshotsTable.recordedAt))
    .limit(90);

  res.json(snapshots.reverse());
});

export default router;
