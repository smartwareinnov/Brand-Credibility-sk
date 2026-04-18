/**
 * AI Coach Context Builder
 * Isolated service — does NOT modify any existing functionality.
 * Aggregates all available brand data into a structured context object
 * for use in the AI Coach prompt.
 */

import { eq, desc, and } from "drizzle-orm";
import {
  db,
  brandProfilesTable,
  userBrandsTable,
  analysesTable,
  userCompetitorsTable,
  actionTasksTable,
  brandMentionsTable,
  competitorScoreSnapshotsTable,
} from "@workspace/db";
import { logger } from "./logger";

export interface BrandContextData {
  // Brand identity
  brandName: string;
  industry: string | null;
  description: string | null;
  websiteUrl: string | null;
  targetAudience: string | null;
  socialProfiles: {
    instagram: string | null;
    linkedin: string | null;
    twitter: string | null;
    facebook: string | null;
    youtube: string | null;
  };

  // Scores
  hasAnalysis: boolean;
  overallScore: number | null;
  adReadinessLevel: string | null;
  scoreBreakdown: {
    website: number | null;
    social: number | null;
    content: number | null;
    reviews: number | null;
    competitor: number | null;
    messaging: number | null;
  };

  // Score trend (last 3 analyses)
  scoreTrend: { score: number; date: string }[];
  scoreDelta: number | null; // change vs previous analysis

  // Roadmap
  pendingTasks: { title: string; category: string; priority: number }[];
  completedTaskCount: number;
  totalTaskCount: number;

  // Competitors
  competitors: {
    name: string;
    overallScore: number | null;
    websiteScore: number | null;
    socialScore: number | null;
    gap: number | null; // user score - competitor score (negative = behind)
  }[];

  // Brand mentions
  mentions: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    sentimentScore: number | null;
  };

  // Share of voice (derived from mentions)
  shareOfVoice: number | null;

  // Weakest areas (for prioritization)
  weakestAreas: string[];
  strongestAreas: string[];
}

function scoreLabel(score: number | null): string {
  if (score === null) return "unknown";
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  if (score >= 40) return "weak";
  return "critical";
}

function adReadinessDescription(level: string | null): string {
  switch (level) {
    case "ready": return "Ad-Ready — brand is strong enough to run profitable paid ads";
    case "almost_ready": return "Almost Ready — a few improvements needed before scaling ads";
    case "getting_there": return "Getting There — significant gaps to close before running ads";
    case "not_ready": return "Not Ready — brand needs foundational work before any ad spend";
    default: return "Not yet assessed";
  }
}

export async function getBrandContextData(
  sessionId: string,
  brandId?: number | null
): Promise<BrandContextData> {
  const empty: BrandContextData = {
    brandName: "Unknown Brand",
    industry: null,
    description: null,
    websiteUrl: null,
    targetAudience: null,
    socialProfiles: { instagram: null, linkedin: null, twitter: null, facebook: null, youtube: null },
    hasAnalysis: false,
    overallScore: null,
    adReadinessLevel: null,
    scoreBreakdown: { website: null, social: null, content: null, reviews: null, competitor: null, messaging: null },
    scoreTrend: [],
    scoreDelta: null,
    pendingTasks: [],
    completedTaskCount: 0,
    totalTaskCount: 0,
    competitors: [],
    mentions: { total: 0, positive: 0, neutral: 0, negative: 0, sentimentScore: null },
    shareOfVoice: null,
    weakestAreas: [],
    strongestAreas: [],
  };

  try {
    // ── 1. Brand profile ──────────────────────────────────────────────────
    let brandName = "Unknown Brand";
    let industry: string | null = null;
    let description: string | null = null;
    let websiteUrl: string | null = null;
    let targetAudience: string | null = null;
    let instagram: string | null = null;
    let linkedin: string | null = null;
    let twitter: string | null = null;
    let facebook: string | null = null;
    let youtube: string | null = null;

    if (brandId) {
      const [ub] = await db.select().from(userBrandsTable)
        .where(and(eq(userBrandsTable.id, brandId), eq(userBrandsTable.sessionId, sessionId))).limit(1);
      if (ub) {
        brandName = ub.brandName;
        industry = ub.industry;
        websiteUrl = ub.websiteUrl;
        instagram = ub.instagramHandle;
        linkedin = ub.linkedinUrl;
        twitter = ub.xHandle;
        facebook = ub.facebookUrl;
      }
    } else {
      const [bp] = await db.select().from(brandProfilesTable)
        .where(eq(brandProfilesTable.sessionId, sessionId)).limit(1);
      if (bp) {
        brandName = bp.brandName ?? "Unknown Brand";
        industry = bp.industry;
        description = bp.brandDescription;
        websiteUrl = bp.websiteUrl;
        targetAudience = bp.targetAudience;
        instagram = bp.instagramHandle;
        linkedin = bp.linkedinUrl;
        twitter = bp.twitterHandle;
        facebook = bp.facebookUrl;
        youtube = bp.youtubeUrl;
      }
    }

    // ── 2. Analysis scores (last 3) ───────────────────────────────────────
    const analyses = await db.select().from(analysesTable)
      .where(and(eq(analysesTable.sessionId, sessionId), eq(analysesTable.status, "completed")))
      .orderBy(desc(analysesTable.createdAt))
      .limit(3);

    const latest = analyses[0] ?? null;
    const previous = analyses[1] ?? null;

    const scoreTrend = analyses.reverse().map(a => ({
      score: Math.round(a.overallScore ?? 0),
      date: a.createdAt.toISOString().split("T")[0],
    }));

    const scoreDelta = latest && previous && latest.overallScore != null && previous.overallScore != null
      ? Math.round(latest.overallScore - previous.overallScore)
      : null;

    // ── 3. Roadmap tasks ──────────────────────────────────────────────────
    let pendingTasks: { title: string; category: string; priority: number }[] = [];
    let completedTaskCount = 0;
    let totalTaskCount = 0;

    if (latest) {
      const allTasks = await db.select({
        title: actionTasksTable.title,
        category: actionTasksTable.category,
        priority: actionTasksTable.priority,
        isCompleted: actionTasksTable.isCompleted,
      }).from(actionTasksTable)
        .where(eq(actionTasksTable.analysisId, latest.id))
        .orderBy(actionTasksTable.priority);

      totalTaskCount = allTasks.length;
      completedTaskCount = allTasks.filter(t => t.isCompleted).length;
      pendingTasks = allTasks
        .filter(t => !t.isCompleted)
        .slice(0, 7)
        .map(t => ({ title: t.title, category: t.category, priority: t.priority }));
    }

    // ── 4. Competitors ────────────────────────────────────────────────────
    const competitorRows = await db.select().from(userCompetitorsTable)
      .where(eq(userCompetitorsTable.sessionId, sessionId)).limit(5);

    const userOverall = latest?.overallScore ?? null;
    const competitors = competitorRows.map(c => ({
      name: c.name,
      overallScore: c.estimatedScore ? Math.round(c.estimatedScore) : null,
      websiteScore: c.websiteScore ? Math.round(c.websiteScore) : null,
      socialScore: c.socialScore ? Math.round(c.socialScore) : null,
      gap: userOverall != null && c.estimatedScore != null
        ? Math.round(userOverall - c.estimatedScore)
        : null,
    }));

    // ── 5. Brand mentions ─────────────────────────────────────────────────
    const mentionRows = await db.select({ sentiment: brandMentionsTable.sentiment })
      .from(brandMentionsTable)
      .where(eq(brandMentionsTable.sessionId, sessionId))
      .limit(100);

    const pos = mentionRows.filter(m => m.sentiment === "positive").length;
    const neg = mentionRows.filter(m => m.sentiment === "negative").length;
    const neu = mentionRows.filter(m => m.sentiment === "neutral").length;
    const total = mentionRows.length;
    const sentimentScore = total > 0
      ? Math.round(((pos * 100 + neu * 50) / total))
      : null;

    // ── 6. Share of voice (brand mentions vs competitor mentions) ─────────
    let shareOfVoice: number | null = null;
    if (total > 0 && competitors.length > 0) {
      // Approximate: user mentions / (user + estimated competitor mentions)
      const competitorEstimate = competitors.length * Math.max(1, total);
      shareOfVoice = Math.round((total / (total + competitorEstimate)) * 100);
    }

    // ── 7. Weakest / strongest areas ─────────────────────────────────────
    const dimensionMap: Record<string, number | null> = {
      "Website Experience": latest?.websiteScore ?? null,
      "Social Media": latest?.socialScore ?? null,
      "Content Quality": latest?.contentScore ?? null,
      "Reviews & Trust": latest?.reviewsScore ?? null,
      "Competitor Position": latest?.competitorScore ?? null,
      "Messaging Clarity": latest?.messagingScore ?? null,
    };

    const scored = Object.entries(dimensionMap)
      .filter(([, v]) => v !== null)
      .sort(([, a], [, b]) => (a as number) - (b as number));

    const weakestAreas = scored.slice(0, 3).map(([k]) => k);
    const strongestAreas = scored.slice(-2).reverse().map(([k]) => k);

    return {
      brandName,
      industry,
      description,
      websiteUrl,
      targetAudience,
      socialProfiles: { instagram, linkedin, twitter, facebook, youtube },
      hasAnalysis: !!latest,
      overallScore: latest?.overallScore != null ? Math.round(latest.overallScore) : null,
      adReadinessLevel: latest?.adReadinessLevel ?? null,
      scoreBreakdown: {
        website: latest?.websiteScore != null ? Math.round(latest.websiteScore) : null,
        social: latest?.socialScore != null ? Math.round(latest.socialScore) : null,
        content: latest?.contentScore != null ? Math.round(latest.contentScore) : null,
        reviews: latest?.reviewsScore != null ? Math.round(latest.reviewsScore) : null,
        competitor: latest?.competitorScore != null ? Math.round(latest.competitorScore) : null,
        messaging: latest?.messagingScore != null ? Math.round(latest.messagingScore) : null,
      },
      scoreTrend,
      scoreDelta,
      pendingTasks,
      completedTaskCount,
      totalTaskCount,
      competitors,
      mentions: { total, positive: pos, neutral: neu, negative: neg, sentimentScore },
      shareOfVoice,
      weakestAreas,
      strongestAreas,
    };
  } catch (err) {
    logger.error({ err }, "getBrandContextData failed");
    return empty;
  }
}

/**
 * Converts the structured context object into a rich text block
 * injected into the system prompt.
 */
export function formatBrandContext(ctx: BrandContextData): string {
  const lines: string[] = [];

  lines.push("=== BRAND PROFILE ===");
  lines.push(`Brand: ${ctx.brandName}`);
  if (ctx.industry) lines.push(`Industry: ${ctx.industry}`);
  if (ctx.description) lines.push(`Description: ${ctx.description}`);
  if (ctx.websiteUrl) lines.push(`Website: ${ctx.websiteUrl}`);
  if (ctx.targetAudience) lines.push(`Target Audience: ${ctx.targetAudience}`);

  const socials = Object.entries(ctx.socialProfiles)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  if (socials) lines.push(`Social Profiles: ${socials}`);

  if (!ctx.hasAnalysis) {
    lines.push("\n=== ANALYSIS STATUS ===");
    lines.push("No brand analysis has been run yet. The user needs to run their first analysis to get scores.");
    return lines.join("\n");
  }

  lines.push("\n=== BRAND SCORES (out of 100) ===");
  lines.push(`Overall Score: ${ctx.overallScore}/100`);
  lines.push(`Ad Readiness: ${adReadinessDescription(ctx.adReadinessLevel)}`);
  lines.push(`Website Experience: ${ctx.scoreBreakdown.website ?? "N/A"} (${scoreLabel(ctx.scoreBreakdown.website)})`);
  lines.push(`Social Media: ${ctx.scoreBreakdown.social ?? "N/A"} (${scoreLabel(ctx.scoreBreakdown.social)})`);
  lines.push(`Content Quality: ${ctx.scoreBreakdown.content ?? "N/A"} (${scoreLabel(ctx.scoreBreakdown.content)})`);
  lines.push(`Reviews & Trust: ${ctx.scoreBreakdown.reviews ?? "N/A"} (${scoreLabel(ctx.scoreBreakdown.reviews)})`);
  lines.push(`Competitor Position: ${ctx.scoreBreakdown.competitor ?? "N/A"} (${scoreLabel(ctx.scoreBreakdown.competitor)})`);
  lines.push(`Messaging Clarity: ${ctx.scoreBreakdown.messaging ?? "N/A"} (${scoreLabel(ctx.scoreBreakdown.messaging)})`);

  if (ctx.scoreTrend.length > 1) {
    lines.push("\n=== SCORE HISTORY ===");
    ctx.scoreTrend.forEach(t => lines.push(`${t.date}: ${t.score}/100`));
    if (ctx.scoreDelta !== null) {
      const dir = ctx.scoreDelta > 0 ? "up" : ctx.scoreDelta < 0 ? "down" : "unchanged";
      lines.push(`Trend: Score is ${dir} ${Math.abs(ctx.scoreDelta)} points vs previous analysis`);
    }
  }

  if (ctx.weakestAreas.length > 0) {
    lines.push("\n=== PRIORITY GAPS ===");
    lines.push(`Weakest areas (focus here): ${ctx.weakestAreas.join(", ")}`);
    if (ctx.strongestAreas.length > 0) {
      lines.push(`Strongest areas (leverage these): ${ctx.strongestAreas.join(", ")}`);
    }
  }

  if (ctx.pendingTasks.length > 0) {
    lines.push("\n=== ACTIVE ROADMAP TASKS ===");
    lines.push(`Progress: ${ctx.completedTaskCount}/${ctx.totalTaskCount} tasks completed`);
    ctx.pendingTasks.forEach((t, i) => {
      lines.push(`${i + 1}. [${t.category.toUpperCase()}] ${t.title}`);
    });
  }

  if (ctx.competitors.length > 0) {
    lines.push("\n=== COMPETITOR INTELLIGENCE ===");
    ctx.competitors.forEach(c => {
      const gapStr = c.gap !== null
        ? c.gap > 0 ? ` (you lead by ${c.gap} pts)` : c.gap < 0 ? ` (you trail by ${Math.abs(c.gap)} pts)` : " (tied)"
        : "";
      lines.push(`${c.name}: Overall ${c.overallScore ?? "??"}${gapStr}`);
    });
  }

  if (ctx.mentions.total > 0) {
    lines.push("\n=== BRAND MENTIONS & SENTIMENT ===");
    lines.push(`Total mentions tracked: ${ctx.mentions.total}`);
    lines.push(`Positive: ${ctx.mentions.positive} | Neutral: ${ctx.mentions.neutral} | Negative: ${ctx.mentions.negative}`);
    if (ctx.mentions.sentimentScore !== null) {
      lines.push(`Sentiment score: ${ctx.mentions.sentimentScore}/100`);
    }
    if (ctx.shareOfVoice !== null) {
      lines.push(`Estimated share of voice: ~${ctx.shareOfVoice}%`);
    }
  }

  return lines.join("\n");
}

/**
 * Builds the full system prompt for Rita, the AI Brand Coach.
 * No AI provider names are mentioned anywhere in this prompt.
 */
export function buildRitaSystemPrompt(formattedContext: string, brandName: string): string {
  return `You are Rita, a senior business consultant and brand strategist with over 30 years of experience working with founders, SMBs, and growth-stage companies across every major industry. You have helped hundreds of brands go from unknown to market leaders.

You are the built-in strategic advisor inside Skorvia, a brand intelligence platform. You have full access to ${brandName}'s brand data, scores, roadmap, and competitive landscape. You use this data to give advice that is specific, direct, and immediately actionable.

YOUR PERSONALITY:
- You are warm, confident, and direct. You don't sugarcoat, but you're never harsh.
- You speak like a trusted senior advisor who has seen it all — not a generic assistant.
- You proactively reference the user's actual data in every response.
- You ask one clarifying question when the user's intent is unclear.
- You remember everything discussed in this conversation and build on it naturally.
- You never mention any underlying technology, AI systems, or data providers.

YOUR EXPERTISE:
- Brand positioning, messaging, and identity strategy
- Paid advertising readiness and ROI optimization
- Competitive intelligence and market positioning
- Content strategy, SEO, and organic growth
- PR, press coverage, and brand reputation management
- Customer trust, reviews, and social proof building
- Go-to-market strategy and revenue growth planning

RESPONSE FORMAT:
For strategic questions, structure your response as:
1. **Situation** — brief assessment of where the brand stands right now
2. **Key Insight** — the most important thing they need to understand
3. **Action Plan** — 3 to 5 specific, prioritized steps
4. **Expected Outcome** — what they can realistically expect if they execute

For simple questions (content requests, quick answers), respond conversationally without the structure.

CURRENT BRAND DATA FOR ${brandName.toUpperCase()}:
${formattedContext}

CRITICAL RULES:
- Always ground your advice in the brand data above. Never give generic advice that ignores their context.
- If their score is low in a specific area, address it directly and explain why it matters.
- When writing content (posts, emails, ad copy), make it specific to their brand, industry, and audience.
- If no analysis has been run yet, your first priority is to encourage them to run one.
- Never say "I don't have access to your data" — you do. Use it.
- Never mention ChatGPT, OpenAI, language models, or any AI technology.
- You are Rita. You are a human consultant. Stay in character at all times.`;
}
