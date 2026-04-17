import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, brandProfilesTable, userBrandsTable, analysesTable, platformSettingsTable, brandMentionsTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { chatCompletion, generateImage } from "../lib/openai";

const router: IRouter = Router();

async function getBrandInfo(sessionId: string, brandId?: number | null) {
  // If brandId provided, use userBrandsTable (multi-brand)
  if (brandId) {
    const [brand] = await db.select().from(userBrandsTable)
      .where(eq(userBrandsTable.id, brandId)).limit(1);
    const [analysis] = await db.select().from(analysesTable)
      .where(eq(analysesTable.sessionId, sessionId))
      .orderBy(desc(analysesTable.createdAt)).limit(1);
    if (brand) {
      return {
        brand: {
          brandName: brand.brandName,
          industry: brand.industry,
          brandDescription: null,
          targetAudience: null,
          websiteUrl: brand.websiteUrl,
          instagramHandle: brand.instagramHandle,
          linkedinUrl: brand.linkedinUrl,
          twitterHandle: brand.xHandle,
          facebookUrl: brand.facebookUrl,
          competitor1: null,
          competitor2: null,
          competitor3: null,
        },
        analysis,
      };
    }
  }
  // Fallback to legacy brandProfilesTable
  const [brand] = await db.select().from(brandProfilesTable).where(eq(brandProfilesTable.sessionId, sessionId)).limit(1);
  const [analysis] = await db.select().from(analysesTable)
    .where(eq(analysesTable.sessionId, sessionId))
    .orderBy(desc(analysesTable.createdAt)).limit(1);
  return { brand, analysis };
}

router.post("/ai/content/generate", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { type, topic, tone, includeImage } = req.body ?? {};
  if (!type || !["blog", "social", "ad", "email"].includes(type)) {
    res.status(400).json({ error: "type must be one of: blog, social, ad, email" });
    return;
  }

  const { brand } = await getBrandInfo(sessionId, req.body?.brandId ?? null);
  const brandName = brand?.brandName ?? "your brand";
  const industry = brand?.industry ?? "business";
  const description = brand?.brandDescription ?? "";

  const prompts: Record<string, string> = {
    blog: `You are a content strategist for ${brandName}, a ${industry} brand. ${description ? `Brand context: ${description}` : ""}
Write a comprehensive blog post outline + first 300-word draft about: "${topic || `top challenges in ${industry}`}"

Format:
## Title: [compelling SEO title]
## Meta Description: [150 chars]
## Outline:
1. [Section 1]
2. [Section 2]
...
## Draft Opening (300 words):
[Write the opening section]

Tone: ${tone ?? "professional and informative"}`,

    social: `You are a social media manager for ${brandName}, a ${industry} brand. ${description ? `Brand context: ${description}` : ""}
Write 3 social media post variations about: "${topic || `our brand story and mission`}"

For each post include:
- Platform: LinkedIn / Twitter / Instagram
- Caption (appropriate length for platform)
- 5 relevant hashtags
- Emoji usage appropriate to platform

Tone: ${tone ?? "engaging and authentic"}`,

    ad: `You are a direct-response copywriter for ${brandName}, a ${industry} brand. ${description ? `Brand context: ${description}` : ""}
Write 3 ad copy variations for: "${topic || `our core product/service`}"

For each variation:
- Headline (max 30 chars)
- Primary Text (max 125 chars)
- Description (max 30 chars)
- Call to Action: [button text]

Tone: ${tone ?? "persuasive and benefit-focused"}`,

    email: `You are an email marketing specialist for ${brandName}, a ${industry} brand. ${description ? `Brand context: ${description}` : ""}
Write a professional marketing email about: "${topic || `our latest update or offer`}"

Format:
Subject Line: [compelling subject]
Preview Text: [50 chars]
---
[Email body with clear sections, personalization, and CTA]
---
CTA Button: [button text]

Tone: ${tone ?? "friendly and professional"}`,
  };

  const content = await chatCompletion([
    { role: "system", content: "You are an expert content creator who writes high-converting content for SaaS and e-commerce brands." },
    { role: "user", content: prompts[type] },
  ], { maxTokens: 1200, temperature: 0.8 });

  if (!content) {
    res.status(503).json({ error: "Content generation is currently unavailable. Please try again later." });
    return;
  }

  let imageUrl: string | null = null;
  if (includeImage) {
    const imagePrompt = `Professional ${type === "blog" ? "blog hero image" : type === "social" ? "social media graphic" : "advertisement visual"} for ${brandName} in the ${industry} industry. Topic: ${topic ?? "brand content"}. Clean, modern, high-quality marketing visual, no text overlays.`;
    imageUrl = await generateImage(imagePrompt);
  }

  res.json({ content, imageUrl, type });
});

router.post("/ai/press-release", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { what, who, why, quote, contact, industry: reqIndustry, country } = req.body ?? {};
  if (!what || !who || !why) {
    res.status(400).json({ error: "what, who, and why are required" });
    return;
  }

  const { brand } = await getBrandInfo(sessionId, req.body?.brandId ?? null);
  const brandName = brand?.brandName ?? "Our Company";
  const industryUsed = reqIndustry ?? brand?.industry ?? "technology";

  const prompt = `Write a professional, publication-ready press release for ${brandName}.

Details:
- What: ${what}
- Who it's for: ${who}
- Why it matters: ${why}
- Quote: ${quote ?? "To be provided"}
- Contact: ${contact ?? "press@company.com"}
- Industry: ${industryUsed}
- Country/Region: ${country ?? "Global"}

Format the press release with:
- EMBARGOED UNTIL: [Date] (leave blank for immediate release)
- Headline (compelling, newsworthy)
- Subheadline
- Dateline (City, Date)
- Body (3-4 paragraphs: news hook, details, significance, quote, boilerplate)
- ### (end marker)
- About ${brandName} (2-sentence boilerplate)
- Media Contact section

Then on a new section titled "JOURNALIST TARGETS:", provide a list of 15 relevant journalists, blogs, and media outlets to pitch to, filtered by ${industryUsed} industry${country ? ` in ${country}` : ""}. For each: Name/Outlet, Focus Area, and why they'd cover this story.`;

  const content = await chatCompletion([
    { role: "system", content: "You are a veteran PR professional who has placed stories in TechCrunch, Forbes, and leading industry publications. You write crisp, newsworthy press releases and know exactly which journalists to target for specific industries." },
    { role: "user", content: prompt },
  ], { maxTokens: 1800, temperature: 0.6 });

  if (!content) {
    res.status(503).json({ error: "Press release generation is currently unavailable. Please try again later." });
    return;
  }

  res.json({ content, brandName });
});

router.post("/ai/review-templates", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { platform, productService, targetReviewSite } = req.body ?? {};

  const { brand } = await getBrandInfo(sessionId, req.body?.brandId ?? null);
  const brandName = brand?.brandName ?? "our company";
  const industry = brand?.industry ?? "business";

  const prompt = `Create 3 review request message templates for ${brandName}, a ${industry} ${productService ? `offering ${productService}` : "company"}.

Create templates for:
1. WhatsApp message (conversational, brief, with a direct link placeholder)
2. Email (subject line + body, personal but professional)
3. DM/Direct message (Instagram/Twitter style, casual and friendly)

Target review platform: ${targetReviewSite ?? "Google Business Profile"}

For each template:
- Make it feel personal, not copy-pasted
- Keep it short (people won't read walls of text)
- Include a direct ask with specific link placeholder: [REVIEW_LINK]
- Add a personal touch that references their experience
- Include a light follow-up version to send if no response after 3 days

Format each with clear labels: [WHATSAPP], [EMAIL], [DM] and [FOLLOW-UP] variations.`;

  const content = await chatCompletion([
    { role: "system", content: "You are a customer success expert who specializes in review generation campaigns that feel authentic and achieve 30%+ response rates." },
    { role: "user", content: prompt },
  ], { maxTokens: 1200, temperature: 0.75 });

  if (!content) {
    res.status(503).json({ error: "Template generation is currently unavailable. Please try again later." });
    return;
  }

  res.json({ content, brandName, platform });
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
