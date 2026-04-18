import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db, brandProfilesTable, userBrandsTable, analysesTable,
  platformSettingsTable, brandMentionsTable, userCompetitorsTable, actionTasksTable,
} from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { chatCompletion, generateImage } from "../lib/openai";

const router: IRouter = Router();

/* ─────────────────────────────────────────────────────────────────────────────
   RICH BRAND CONTEXT BUILDER
   Fetches everything available about a brand and returns a structured object
   used to build deeply personalised AI prompts.
───────────────────────────────────────────────────────────────────────────── */
interface RichBrandContext {
  brandName: string;
  industry: string;
  description: string;
  websiteUrl: string;
  targetAudience: string;
  tone: string;           // derived from brand data
  socialProfiles: string; // formatted list
  competitors: string;    // formatted list with scores
  scores: {
    overall: number | null;
    website: number | null;
    social: number | null;
    content: number | null;
    reviews: number | null;
    messaging: number | null;
    adReadiness: string;
  };
  weaknesses: string[];   // dimensions scoring below 60
  strengths: string[];    // dimensions scoring above 70
  pendingActions: string; // top 3 roadmap tasks
  mentionSentiment: string;
  hasAnalysis: boolean;
}

async function getRichBrandContext(
  sessionId: string,
  brandId?: number | null
): Promise<RichBrandContext> {
  // Defaults
  let brandName = "the brand";
  let industry = "business";
  let description = "";
  let websiteUrl = "";
  let targetAudience = "";
  let instagram = "";
  let linkedin = "";
  let twitter = "";
  let facebook = "";
  let youtube = "";
  let competitor1 = "";
  let competitor2 = "";
  let competitor3 = "";

  // ── Brand profile ──────────────────────────────────────────────────────────
  if (brandId) {
    const [ub] = await db.select().from(userBrandsTable)
      .where(and(eq(userBrandsTable.id, brandId), eq(userBrandsTable.sessionId, sessionId))).limit(1);
    if (ub) {
      brandName = ub.brandName ?? brandName;
      industry = ub.industry ?? industry;
      websiteUrl = ub.websiteUrl ?? "";
      instagram = ub.instagramHandle ?? "";
      linkedin = ub.linkedinUrl ?? "";
      twitter = ub.xHandle ?? "";
      facebook = ub.facebookUrl ?? "";
    }
  } else {
    const [bp] = await db.select().from(brandProfilesTable)
      .where(eq(brandProfilesTable.sessionId, sessionId)).limit(1);
    if (bp) {
      brandName = bp.brandName ?? brandName;
      industry = bp.industry ?? industry;
      description = bp.brandDescription ?? "";
      websiteUrl = bp.websiteUrl ?? "";
      targetAudience = bp.targetAudience ?? "";
      instagram = bp.instagramHandle ?? "";
      linkedin = bp.linkedinUrl ?? "";
      twitter = bp.twitterHandle ?? "";
      facebook = bp.facebookUrl ?? "";
      youtube = bp.youtubeUrl ?? "";
      competitor1 = bp.competitor1 ?? "";
      competitor2 = bp.competitor2 ?? "";
      competitor3 = bp.competitor3 ?? "";
    }
  }

  // ── Social profiles ────────────────────────────────────────────────────────
  const socialParts: string[] = [];
  if (instagram) socialParts.push(`Instagram: @${instagram}`);
  if (linkedin) socialParts.push(`LinkedIn: ${linkedin}`);
  if (twitter) socialParts.push(`X/Twitter: @${twitter}`);
  if (facebook) socialParts.push(`Facebook: ${facebook}`);
  if (youtube) socialParts.push(`YouTube: ${youtube}`);
  const socialProfiles = socialParts.length > 0 ? socialParts.join(", ") : "No social profiles set up yet";

  // ── Latest analysis scores ─────────────────────────────────────────────────
  const [latestAnalysis] = await db.select().from(analysesTable)
    .where(and(eq(analysesTable.sessionId, sessionId), eq(analysesTable.status, "completed")))
    .orderBy(desc(analysesTable.createdAt)).limit(1);

  const scores = {
    overall: latestAnalysis?.overallScore != null ? Math.round(latestAnalysis.overallScore) : null,
    website: latestAnalysis?.websiteScore != null ? Math.round(latestAnalysis.websiteScore) : null,
    social: latestAnalysis?.socialScore != null ? Math.round(latestAnalysis.socialScore) : null,
    content: latestAnalysis?.contentScore != null ? Math.round(latestAnalysis.contentScore) : null,
    reviews: latestAnalysis?.reviewsScore != null ? Math.round(latestAnalysis.reviewsScore) : null,
    messaging: latestAnalysis?.messagingScore != null ? Math.round(latestAnalysis.messagingScore) : null,
    adReadiness: latestAnalysis?.adReadinessLevel ?? "not_assessed",
  };

  // ── Strengths and weaknesses ───────────────────────────────────────────────
  const dimensionMap: Record<string, number | null> = {
    "Website Experience": scores.website,
    "Social Media Presence": scores.social,
    "Content Quality": scores.content,
    "Reviews & Trust": scores.reviews,
    "Messaging Clarity": scores.messaging,
  };
  const weaknesses = Object.entries(dimensionMap)
    .filter(([, v]) => v !== null && v < 60)
    .sort(([, a], [, b]) => (a as number) - (b as number))
    .map(([k, v]) => `${k} (${v}/100)`);
  const strengths = Object.entries(dimensionMap)
    .filter(([, v]) => v !== null && v >= 70)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .map(([k, v]) => `${k} (${v}/100)`);

  // ── Top pending roadmap tasks ──────────────────────────────────────────────
  let pendingActions = "No roadmap tasks yet — run a brand analysis first.";
  if (latestAnalysis) {
    const tasks = await db.select({ title: actionTasksTable.title, category: actionTasksTable.category })
      .from(actionTasksTable)
      .where(and(eq(actionTasksTable.analysisId, latestAnalysis.id), eq(actionTasksTable.isCompleted, false)))
      .orderBy(actionTasksTable.priority)
      .limit(3);
    if (tasks.length > 0) {
      pendingActions = tasks.map(t => `[${t.category}] ${t.title}`).join(" | ");
    }
  }

  // ── Tracked competitors ────────────────────────────────────────────────────
  const competitorRows = await db.select({ name: userCompetitorsTable.name, estimatedScore: userCompetitorsTable.estimatedScore })
    .from(userCompetitorsTable)
    .where(eq(userCompetitorsTable.sessionId, sessionId)).limit(5);

  const competitorParts: string[] = [];
  if (competitor1) competitorParts.push(competitor1);
  if (competitor2) competitorParts.push(competitor2);
  if (competitor3) competitorParts.push(competitor3);
  competitorRows.forEach(c => {
    const entry = c.estimatedScore ? `${c.name} (score: ${Math.round(c.estimatedScore)})` : c.name;
    if (!competitorParts.includes(c.name)) competitorParts.push(entry);
  });
  const competitors = competitorParts.length > 0 ? competitorParts.join(", ") : "No competitors tracked yet";

  // ── Brand mention sentiment ────────────────────────────────────────────────
  const mentions = await db.select({ sentiment: brandMentionsTable.sentiment })
    .from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId)).limit(50);
  let mentionSentiment = "No brand mentions tracked yet";
  if (mentions.length > 0) {
    const pos = mentions.filter(m => m.sentiment === "positive").length;
    const neg = mentions.filter(m => m.sentiment === "negative").length;
    const neu = mentions.filter(m => m.sentiment === "neutral").length;
    mentionSentiment = `${mentions.length} mentions — ${pos} positive, ${neu} neutral, ${neg} negative`;
  }

  // ── Derive brand tone from available data ──────────────────────────────────
  // Use industry + description to infer appropriate tone
  const industryLower = industry.toLowerCase();
  let tone = "professional and trustworthy";
  if (industryLower.includes("tech") || industryLower.includes("saas") || industryLower.includes("software")) {
    tone = "innovative, clear, and forward-thinking";
  } else if (industryLower.includes("fashion") || industryLower.includes("beauty") || industryLower.includes("lifestyle")) {
    tone = "aspirational, warm, and visually expressive";
  } else if (industryLower.includes("finance") || industryLower.includes("legal") || industryLower.includes("health")) {
    tone = "authoritative, trustworthy, and reassuring";
  } else if (industryLower.includes("food") || industryLower.includes("restaurant") || industryLower.includes("beverage")) {
    tone = "warm, sensory, and community-driven";
  } else if (industryLower.includes("ecommerce") || industryLower.includes("retail")) {
    tone = "benefit-focused, direct, and conversion-oriented";
  } else if (industryLower.includes("education") || industryLower.includes("edtech")) {
    tone = "encouraging, clear, and empowering";
  } else if (industryLower.includes("agency") || industryLower.includes("marketing") || industryLower.includes("consulting")) {
    tone = "confident, results-driven, and strategic";
  }

  return {
    brandName,
    industry,
    description,
    websiteUrl,
    targetAudience,
    tone,
    socialProfiles,
    competitors,
    scores,
    weaknesses,
    strengths,
    pendingActions,
    mentionSentiment,
    hasAnalysis: !!latestAnalysis,
  };
}

/** Formats the rich context into a concise block for injection into prompts */
function formatContextBlock(ctx: RichBrandContext): string {
  const lines = [
    `Brand: ${ctx.brandName}`,
    `Industry: ${ctx.industry}`,
  ];
  if (ctx.description) lines.push(`About: ${ctx.description}`);
  if (ctx.targetAudience) lines.push(`Target Audience: ${ctx.targetAudience}`);
  if (ctx.websiteUrl) lines.push(`Website: ${ctx.websiteUrl}`);
  lines.push(`Social Presence: ${ctx.socialProfiles}`);
  lines.push(`Competitors: ${ctx.competitors}`);
  lines.push(`Brand Tone: ${ctx.tone}`);

  if (ctx.hasAnalysis) {
    lines.push(`Overall Brand Score: ${ctx.scores.overall}/100`);
    lines.push(`Ad Readiness: ${ctx.scores.adReadiness.replace(/_/g, " ")}`);
    if (ctx.weaknesses.length > 0) lines.push(`Weakest Areas: ${ctx.weaknesses.join(", ")}`);
    if (ctx.strengths.length > 0) lines.push(`Strongest Areas: ${ctx.strengths.join(", ")}`);
    lines.push(`Top Roadmap Tasks: ${ctx.pendingActions}`);
  }
  lines.push(`Brand Mentions: ${ctx.mentionSentiment}`);
  return lines.join("\n");
}

router.post("/ai/content/generate", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { type, topic, tone: userTone, includeImage } = req.body ?? {};
  if (!type || !["blog", "social", "ad", "email"].includes(type)) {
    res.status(400).json({ error: "type must be one of: blog, social, ad, email" });
    return;
  }

  const ctx = await getRichBrandContext(sessionId, req.body?.brandId ?? null);
  const contextBlock = formatContextBlock(ctx);
  const effectiveTone = userTone ?? ctx.tone;
  const topicLine = topic || `the core value proposition of ${ctx.brandName} for ${ctx.targetAudience || ctx.industry + " professionals"}`;

  const systemPrompt = `You are a senior content strategist who specialises in creating high-converting content for ${ctx.industry} brands. You have deep knowledge of ${ctx.brandName}'s brand, audience, and competitive position. Every piece of content you create is specific to this brand — never generic.

BRAND CONTEXT:
${contextBlock}

RULES:
- Write exclusively for ${ctx.brandName}. Never produce generic content.
- Reflect the brand's tone: ${effectiveTone}
- Reference the target audience (${ctx.targetAudience || ctx.industry + " audience"}) naturally in the content
- If the brand has weaknesses (${ctx.weaknesses.join(", ") || "none identified"}), avoid content that highlights them
- Leverage the brand's strengths (${ctx.strengths.join(", ") || "to be determined"}) where relevant
- All content must feel like it was written by someone who knows this brand deeply`;

  const prompts: Record<string, string> = {
    blog: `Write a comprehensive, SEO-optimised blog post for ${ctx.brandName} about: "${topicLine}"

The post must:
- Speak directly to ${ctx.targetAudience || "the target audience"} in the ${ctx.industry} space
- Reflect ${ctx.brandName}'s brand voice: ${effectiveTone}
- Reference real pain points this audience faces
- Position ${ctx.brandName} as the authority on this topic

Format:
## Title: [compelling, SEO-rich title that includes the brand's niche]
## Meta Description: [150 chars, includes primary keyword]
## Outline:
1. [Section with H2]
2. [Section with H2]
3. [Section with H2]
4. [Section with H2]
5. [Conclusion with CTA]
## Opening Draft (400 words):
[Write the full opening section — hook, context, and first key point]`,

    social: `Write 3 social media posts for ${ctx.brandName} about: "${topicLine}"

Each post must:
- Sound like it comes from ${ctx.brandName}'s actual social voice
- Speak to ${ctx.targetAudience || "the target audience"} specifically
- Reference real industry context, not generic statements
- Drive engagement through a specific question, insight, or CTA

Post 1 — LinkedIn (professional, 150-200 words, thought leadership angle):
[Post content]
Hashtags: [5 niche-specific hashtags]

Post 2 — X/Twitter (punchy, under 280 chars, bold take or insight):
[Post content]
Hashtags: [3 hashtags]

Post 3 — Instagram (visual storytelling, 100-150 words, community-focused):
[Post content]
Hashtags: [8 hashtags including niche + brand tags]`,

    ad: `Write 3 direct-response ad variations for ${ctx.brandName} promoting: "${topicLine}"

Each ad must:
- Lead with the specific pain point of ${ctx.targetAudience || "the target audience"}
- Highlight ${ctx.brandName}'s unique positioning vs competitors (${ctx.competitors})
- Use ${effectiveTone} tone throughout
- Drive a clear, specific action

Ad 1 — Awareness (broad audience, problem-focused):
Headline: [max 30 chars]
Primary Text: [max 125 chars, lead with pain point]
Description: [max 30 chars]
CTA: [button text]

Ad 2 — Consideration (warm audience, solution-focused):
Headline: [max 30 chars]
Primary Text: [max 125 chars, lead with benefit]
Description: [max 30 chars]
CTA: [button text]

Ad 3 — Conversion (hot audience, offer-focused):
Headline: [max 30 chars]
Primary Text: [max 125 chars, urgency + social proof]
Description: [max 30 chars]
CTA: [button text]`,

    email: `Write a full marketing email for ${ctx.brandName} about: "${topicLine}"

The email must:
- Open with a subject line that speaks directly to ${ctx.targetAudience || "the audience"}'s biggest concern
- Feel personal and written by a human, not a template
- Reflect ${ctx.brandName}'s voice: ${effectiveTone}
- Include a clear, single CTA that drives one specific action

Subject Line: [compelling, personalised, under 50 chars]
Preview Text: [50 chars, complements subject line]

---
[Full email body — greeting, hook paragraph, value section, social proof or insight, CTA paragraph]
---

CTA Button: [specific action text]
P.S.: [optional — one-line reinforcement of the main message]`,
  };

  const content = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: prompts[type] },
  ], { model: "gpt-4o", maxTokens: 1400, temperature: 0.75 });

  if (!content) {
    res.status(503).json({ error: "Content generation is currently unavailable. Please try again later." });
    return;
  }

  let imageUrl: string | null = null;
  if (includeImage) {
    const imagePrompt = `Professional ${type === "blog" ? "blog hero image" : type === "social" ? "social media graphic" : "advertisement visual"} for ${ctx.brandName}, a ${ctx.industry} brand. Topic: ${topicLine}. Clean, modern, high-quality marketing visual, no text overlays.`;
    imageUrl = await generateImage(imagePrompt);
  }

  res.json({ content, imageUrl, type, brandName: ctx.brandName });
});

router.post("/ai/press-release", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { what, who, why, quote, contact, country } = req.body ?? {};
  if (!what || !who || !why) {
    res.status(400).json({ error: "what, who, and why are required" });
    return;
  }

  const ctx = await getRichBrandContext(sessionId, req.body?.brandId ?? null);
  const contextBlock = formatContextBlock(ctx);

  const systemPrompt = `You are a veteran PR strategist and press release writer who has placed stories in major publications across ${country ?? "global"} media. You know exactly how to frame a story for ${ctx.industry} brands and which journalists cover this space.

You are writing for ${ctx.brandName} — a ${ctx.industry} brand. You know this brand deeply:
${contextBlock}

Your press release must:
- Sound like it was written by ${ctx.brandName}'s own communications team
- Reflect the brand's tone: ${ctx.tone}
- Be newsworthy and specific — no vague corporate language
- Position ${ctx.brandName} credibly within the ${ctx.industry} landscape`;

  const prompt = `Write a publication-ready press release for ${ctx.brandName}.

ANNOUNCEMENT DETAILS:
- What: ${what}
- Who it's for: ${who}
- Why it matters: ${why}
- Quote: ${quote || `[To be provided by ${ctx.brandName} leadership]`}
- Press Contact: ${contact || `press@${ctx.brandName.toLowerCase().replace(/\s+/g, "")}.com`}
- Target Region: ${country ?? "Global"}

PRESS RELEASE FORMAT:
FOR IMMEDIATE RELEASE

[HEADLINE — newsworthy, specific, under 12 words]
[SUBHEADLINE — adds context, 1 sentence]

[CITY, DATE] — [Opening paragraph: the news hook in 2-3 sentences. Lead with the most newsworthy element.]

[Body paragraph 1: Context — why this matters now, market problem being solved]

[Body paragraph 2: Details — how it works, key features or milestones, data points if available]

[Body paragraph 3: Quote from ${ctx.brandName} leadership — make it sound authentic, not corporate]

[Body paragraph 4: Significance — broader industry impact, what this means for ${who}]

###

About ${ctx.brandName}:
[2-sentence boilerplate that captures the brand's positioning and mission in the ${ctx.industry} space]

Media Contact:
${contact || `press@${ctx.brandName.toLowerCase().replace(/\s+/g, "")}.com`}

---

JOURNALIST TARGETS FOR ${ctx.industry.toUpperCase()} IN ${(country ?? "GLOBAL").toUpperCase()}:

Provide 15 specific journalists, editors, newsletters, and media outlets that would genuinely cover this story. For each:
- Name / Publication
- Their beat / focus area
- Why they would cover this specific story (be specific to the announcement)
- Suggested pitch angle (1 sentence)`;

  const content = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ], { model: "gpt-4o", maxTokens: 2000, temperature: 0.6 });

  if (!content) {
    res.status(503).json({ error: "Press release generation is currently unavailable. Please try again later." });
    return;
  }

  res.json({ content, brandName: ctx.brandName });
});

router.post("/ai/review-templates", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { productService, targetReviewSite } = req.body ?? {};

  const ctx = await getRichBrandContext(sessionId, req.body?.brandId ?? null);
  const contextBlock = formatContextBlock(ctx);

  const systemPrompt = `You are a customer success specialist who writes review request messages that feel genuinely personal and achieve high response rates. You know ${ctx.brandName} deeply and write in their exact voice.

BRAND CONTEXT:
${contextBlock}

Your messages must:
- Sound like they come from a real person at ${ctx.brandName}, not a template
- Reflect the brand's tone: ${ctx.tone}
- Speak to ${ctx.targetAudience || "the customer"} in language they actually use
- Feel warm and conversational — never robotic or salesy
- Be short enough that people actually read them`;

  const prompt = `Write personalised review request templates for ${ctx.brandName}${productService ? ` specifically for their ${productService}` : ""}.

Target review platform: ${targetReviewSite ?? "Google Business Profile"}
Brand's audience: ${ctx.targetAudience || ctx.industry + " customers"}
Brand tone: ${ctx.tone}

Create 4 templates. Each must feel like it was written specifically for ${ctx.brandName}'s relationship with their customers.

[WHATSAPP]
Subject: N/A (WhatsApp message)
[Write a conversational WhatsApp message — 3-4 sentences max. Start with the customer's name placeholder. Reference their experience with ${ctx.brandName}. Make the ask feel natural. Include [REVIEW_LINK]. End warmly.]

[FOLLOW-UP-WHATSAPP]
[A gentle 2-sentence follow-up to send 3 days later if no response. Lighter touch, no pressure.]

[EMAIL]
Subject: [Personalised subject line that references their experience, not generic "leave a review"]
[Write a full email — greeting, 2-3 short paragraphs, clear CTA with [REVIEW_LINK]. Sign off with a real name placeholder. Should feel like it came from a founder or team member, not a marketing department.]

[FOLLOW-UP-EMAIL]
Subject: [Follow-up subject line]
[3-sentence follow-up email. Acknowledge they're busy. Keep it light.]

[DM]
[Instagram/Twitter DM — casual, 2-3 sentences. Feels like a genuine message from someone who cares about their experience. Include [REVIEW_LINK].]`;

  const content = await chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ], { model: "gpt-4o", maxTokens: 1400, temperature: 0.72 });

  if (!content) {
    res.status(503).json({ error: "Template generation is currently unavailable. Please try again later." });
    return;
  }

  res.json({ content, brandName: ctx.brandName });
});

router.post("/ai/strategy-decode", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { competitorName, competitorWebsite, competitorSocials, competitorDescription, industry: reqIndustry } = req.body ?? {};
  if (!competitorName) {
    res.status(400).json({ error: "competitorName is required" });
    return;
  }

  const { brand } = await getBrandInfo(sessionId, req.body?.brandId ?? null);
  const userBrandName = brand?.brandName ?? "your brand";
  const industry = reqIndustry ?? brand?.industry ?? "business";

  const prompt = `Analyze the marketing strategy of ${competitorName} and provide a strategic intelligence report.

Available data:
- Competitor: ${competitorName}
- Website: ${competitorWebsite ?? "not provided"}
- Social profiles: ${competitorSocials ?? "not provided"}
- Additional context: ${competitorDescription ?? "none"}
- Industry: ${industry}
- User's brand (for positioning context): ${userBrandName}

Provide a detailed Competitor Strategy Decoder report with these sections:

## 1. Brand Positioning Analysis
What message are they leading with? Who is their ideal customer? What pain points do they address?

## 2. Content Strategy
What content pillars are they using? What formats (video, blog, social)? How often do they publish?

## 3. Advertising Approach
Based on their ad library presence, what offers/hooks do they lead with? What platforms? What's their likely funnel?

## 4. Target Audience Profile
Demographics, psychographics, job titles, pain points based on their messaging

## 5. Strengths & Gaps
What they do exceptionally well. Where there are clear gaps or weaknesses you could exploit.

## 6. Strategic Opportunities for ${userBrandName}
3-5 specific ways ${userBrandName} can position against this competitor and win market share. Be specific and actionable.

## 7. Competitive Threat Level
Rate 1-10 and explain why.`;

  const content = await chatCompletion([
    { role: "system", content: "You are a competitive intelligence analyst with expertise in brand strategy, digital marketing, and market positioning. You provide actionable intelligence reports that help founders outmaneuver larger competitors." },
    { role: "user", content: prompt },
  ], { maxTokens: 1800, temperature: 0.6 });

  if (!content) {
    res.status(503).json({ error: "Strategy analysis is currently unavailable. Please try again later." });
    return;
  }

  res.json({ content, competitorName, userBrandName });
});

router.post("/ai/trust-score", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { followerCount, avgLikes, avgComments, responseRate } = req.body ?? {};

  const { brand, analysis } = await getBrandInfo(sessionId, req.body?.brandId ?? null);
  const brandName = brand?.brandName ?? "your brand";
  const industry = brand?.industry ?? "your industry";

  const overallScore = analysis?.overallScore ?? null;
  const websiteScore = analysis?.websiteScore ?? null;
  const socialScore = analysis?.socialScore ?? null;

  const recentMentions = await db
    .select({ sentiment: brandMentionsTable.sentiment })
    .from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId))
    .limit(50);

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const m of recentMentions) {
    const s = (m.sentiment ?? "neutral").toLowerCase();
    if (s === "positive") sentimentCounts.positive++;
    else if (s === "negative") sentimentCounts.negative++;
    else sentimentCounts.neutral++;
  }
  const totalMentions = recentMentions.length;
  const mentionSentimentScore = totalMentions > 0
    ? Math.round(((sentimentCounts.positive * 1 + sentimentCounts.neutral * 0.5) / totalMentions) * 100)
    : null;

  let engagementScore: number | null = null;
  if (followerCount && followerCount > 0 && (avgLikes != null || avgComments != null)) {
    const totalEngagement = (avgLikes ?? 0) + (avgComments ?? 0);
    const rate = totalEngagement / followerCount;
    engagementScore = Math.min(100, Math.round(rate * 2000));
  }

  const reviewTrustScore = overallScore != null ? Math.round(overallScore) : null;
  const contentCredScore = websiteScore != null ? Math.round(websiteScore) : null;
  const socialBaseScore = socialScore != null ? Math.round(socialScore) : null;
  const communityScore = engagementScore ?? socialBaseScore;
  const audienceScore = mentionSentimentScore ?? socialBaseScore;

  const dataContext = `
Brand: ${brandName} (${industry})
Overall Brand Score: ${overallScore != null ? `${overallScore}/100` : "Not yet analyzed"}
Website Credibility Score: ${websiteScore != null ? `${websiteScore}/100` : "Unknown"}
Social Media Score: ${socialScore != null ? `${socialScore}/100` : "Unknown"}
Engagement Stats (user-provided):
  - Followers: ${followerCount ?? "Not provided"}
  - Avg Likes/Post: ${avgLikes ?? "Not provided"}
  - Avg Comments/Post: ${avgComments ?? "Not provided"}
  - Response Rate: ${responseRate != null ? `${responseRate}%` : "Not provided"}
Brand Mentions Analyzed: ${totalMentions}
  - Positive: ${sentimentCounts.positive}, Neutral: ${sentimentCounts.neutral}, Negative: ${sentimentCounts.negative}
  - Mention Sentiment Score: ${mentionSentimentScore != null ? `${mentionSentimentScore}/100` : "Insufficient data"}
`.trim();

  const prompt = `You are a brand trust analyst. Based on the following data for ${brandName}, compute an Audience Trust Score and provide a structured analysis.

DATA:
${dataContext}

Respond with ONLY valid JSON in this exact structure:
{
  "overallScore": <0-100 number>,
  "grade": <"A+"|"A"|"B+"|"B"|"C"|"D"|"F">,
  "pillars": {
    "reviewTrust": { "score": <0-100>, "label": <"Excellent"|"Good"|"Fair"|"Weak">, "insight": "<1 sentence>" },
    "communityEngagement": { "score": <0-100>, "label": <"Excellent"|"Good"|"Fair"|"Weak">, "insight": "<1 sentence>" },
    "contentCredibility": { "score": <0-100>, "label": <"Excellent"|"Good"|"Fair"|"Weak">, "insight": "<1 sentence>" },
    "audienceConversation": { "score": <0-100>, "label": <"Excellent"|"Good"|"Fair"|"Weak">, "insight": "<1 sentence>" }
  },
  "summary": "<2-3 sentence overall assessment of audience trust and credibility>",
  "recommendations": ["<action 1>", "<action 2>", "<action 3>", "<action 4>"]
}`;

  const raw = await chatCompletion([
    { role: "system", content: "You are a brand credibility analyst. Always respond with valid JSON only, no markdown." },
    { role: "user", content: prompt },
  ], { maxTokens: 1000, temperature: 0.4 });

  if (!raw) {
    res.status(503).json({ error: "Trust Score analysis is currently unavailable. Please try again later." });
    return;
  }

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json({ ...parsed, brandName, dataAvailability: {
      hasAnalysis: overallScore != null,
      hasSocialStats: engagementScore != null,
      hasMentions: totalMentions > 0,
      preComputedPillars: { reviewTrustScore, contentCredScore, communityScore, audienceScore },
    }});
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
  }
});

router.post("/ai/viral-content", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { niche, platform = "youtube", region = "US" } = req.body ?? {};
  if (!niche || typeof niche !== "string") {
    res.status(400).json({ error: "niche is required" });
    return;
  }

  const [ytSetting] = await db
    .select({ value: platformSettingsTable.value })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, "youtubeApiKey"))
    .limit(1);

  const youtubeApiKey = ytSetting?.value || null;
  const youtubeConfigured = !!youtubeApiKey;

  let videos: {
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
    viewCount: string;
    likeCount: string;
    commentCount: string;
  }[] = [];

  if (youtubeApiKey && platform === "youtube") {
    try {
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&type=video&order=viewCount&maxResults=10&regionCode=${region}&key=${youtubeApiKey}`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json() as {
        items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string } }[];
        error?: { message: string };
      };

      if (searchData.error) {
        res.status(400).json({ error: "Video data could not be retrieved. Please try again later." });
        return;
      }

      const videoIds = (searchData.items ?? []).map((i) => i.id.videoId).filter(Boolean).join(",");

      if (videoIds) {
        const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${youtubeApiKey}`;
        const statsRes = await fetch(statsUrl);
        const statsData = await statsRes.json() as {
          items?: {
            id: string;
            snippet: { title: string; channelTitle: string; publishedAt: string };
            statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
          }[];
        };

        videos = (statsData.items ?? []).map((item) => ({
          videoId: item.id,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          viewCount: item.statistics.viewCount ?? "0",
          likeCount: item.statistics.likeCount ?? "0",
          commentCount: item.statistics.commentCount ?? "0",
        }));
      }
    } catch (err) {
      console.error("[viral-content] YouTube fetch error:", err);
    }
  }

  const videoContext = videos.length > 0
    ? videos.map((v, i) =>
        `${i + 1}. "${v.title}" by ${v.channelTitle} — ${parseInt(v.viewCount).toLocaleString()} views, ${parseInt(v.likeCount).toLocaleString()} likes, published ${new Date(v.publishedAt).toLocaleDateString()}`
      ).join("\n")
    : `No live video data available. Use your general knowledge about viral ${niche} content trends on ${platform}.`;

  const prompt = `You are a viral content strategist specializing in ${niche}. Analyze what makes content go viral in this niche on ${platform}.

Top trending content in "${niche}":
${videoContext}

Respond with ONLY valid JSON:
{
  "patterns": ["<pattern 1>", "<pattern 2>", "<pattern 3>", "<pattern 4>", "<pattern 5>"],
  "hooks": ["<proven hook format 1>", "<proven hook format 2>", "<proven hook format 3>"],
  "contentFormats": ["<format 1>", "<format 2>", "<format 3>"],
  "emotionalTriggers": ["<trigger 1>", "<trigger 2>", "<trigger 3>"],
  "actionableTips": ["<specific tip 1>", "<specific tip 2>", "<specific tip 3>", "<specific tip 4>"],
  "bestPostingTimes": "<when to post for max reach>",
  "summary": "<2-3 sentence overview of what's working in ${niche} right now>"
}`;

  const aiAnalysis = await chatCompletion([
    { role: "system", content: "You are an expert viral content strategist. Respond with valid JSON only." },
    { role: "user", content: prompt },
  ], { maxTokens: 1200, temperature: 0.7 });

  if (!aiAnalysis) {
    res.status(503).json({ error: "Viral content analysis is currently unavailable. Please try again later." });
    return;
  }

  try {
    const parsed = JSON.parse(aiAnalysis.replace(/```json|```/g, "").trim());
    res.json({ niche, platform, region, youtubeConfigured, videos, aiAnalysis: parsed });
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
  }
});

export default router;
