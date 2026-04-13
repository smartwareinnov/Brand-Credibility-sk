import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, brandMentionsTable, mentionSettingsTable, brandProfilesTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { chatCompletion } from "../lib/openai";

const router: IRouter = Router();

type Platform = "web" | "twitter" | "linkedin" | "facebook" | "news";
type Sentiment = "positive" | "neutral" | "negative";

interface GeneratedMention {
  platform: Platform;
  source: string;
  title: string;
  snippet: string;
  url: string;
  mentionDate: string;
  sentiment: Sentiment;
}

function seededRand(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233723) * 100000;
  return x - Math.floor(x);
}

function generateMentions(brandName: string, count = 8): GeneratedMention[] {
  const seed = brandName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const platforms: Platform[] = ["web", "twitter", "linkedin", "facebook", "news"];
  const sentiments: Sentiment[] = ["positive", "positive", "positive", "neutral", "neutral", "negative"];

  const positiveTemplates = [
    {
      title: `Top founder tools we're watching in 2026`,
      snippet: `${brandName} has been making waves this year, helping founders benchmark their brands before scaling their ad spend.`,
      source: "TechCrunch Africa",
      platform: "web" as Platform,
    },
    {
      title: `Why I delayed my ad campaign by 30 days`,
      snippet: `After running a ${brandName} analysis, I realised my brand wasn't ready for paid traffic. Here's what I changed.`,
      source: "LinkedIn",
      platform: "linkedin" as Platform,
    },
    {
      title: `Tweet — brand readiness check`,
      snippet: `Just used ${brandName} to check my brand score before launching Facebook ads. Got a 72 — honestly eye-opening 🔥`,
      source: "@founderbuilds",
      platform: "twitter" as Platform,
    },
    {
      title: `${brandName} named among must-try SaaS tools`,
      snippet: `The platform's Ad Readiness Score gives founders a clear picture of brand credibility before they commit ad budget.`,
      source: "Business Day NG",
      platform: "news" as Platform,
    },
    {
      title: `Founder community shoutout`,
      snippet: `Highly recommend ${brandName} if you're serious about knowing your brand's ad readiness score before running campaigns.`,
      source: "African Startup Hub",
      platform: "facebook" as Platform,
    },
  ];

  const neutralTemplates = [
    {
      title: `Are startups rushing into paid ads too early?`,
      snippet: `Experts say tools like ${brandName}, while useful, are just one part of the puzzle when it comes to ad readiness.`,
      source: "Nairametrics",
      platform: "web" as Platform,
    },
    {
      title: `New tools for African founders`,
      snippet: `${brandName} is among several platforms helping entrepreneurs evaluate their brand health before scaling.`,
      source: "Disrupt Africa",
      platform: "news" as Platform,
    },
  ];

  const negativeTemplates = [
    {
      title: `Feedback on ${brandName}`,
      snippet: `Tried ${brandName} — the insights are good but I wish the competitor analysis was more detailed for local brands.`,
      source: "@digitalnaijapreneur",
      platform: "twitter" as Platform,
    },
  ];

  const all = [...positiveTemplates, ...neutralTemplates, ...negativeTemplates];
  const results: GeneratedMention[] = [];

  for (let i = 0; i < Math.min(count, all.length); i++) {
    const template = all[i];
    const daysAgo = Math.floor(seededRand(seed, i) * 14);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const sentiment: Sentiment =
      i < positiveTemplates.length ? "positive"
      : i < positiveTemplates.length + neutralTemplates.length ? "neutral"
      : "negative";

    results.push({
      platform: template.platform,
      source: template.source,
      title: template.title,
      snippet: template.snippet,
      url: "#",
      mentionDate: date.toISOString().split("T")[0],
      sentiment,
    });
  }

  return results;
}

router.get("/user/mentions", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  let mentions = await db
    .select()
    .from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId))
    .orderBy(desc(brandMentionsTable.createdAt));

  if (mentions.length === 0) {
    const [brand] = await db
      .select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.sessionId, sessionId));

    const brandName = brand?.brandName ?? "Your Brand";
    const generated = generateMentions(brandName);

    if (generated.length > 0) {
      mentions = await db
        .insert(brandMentionsTable)
        .values(generated.map((m) => ({ ...m, sessionId })))
        .returning();
    }
  }

  const settings = await db
    .select()
    .from(mentionSettingsTable)
    .where(eq(mentionSettingsTable.sessionId, sessionId));

  res.json({
    mentions,
    settings: settings[0] ?? null,
  });
});

router.post("/user/mentions/refresh", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const [brand] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.sessionId, sessionId));

  const brandName = brand?.brandName ?? "Your Brand";
  const generated = generateMentions(brandName, 3);

  if (generated.length > 0) {
    await db
      .insert(brandMentionsTable)
      .values(generated.map((m) => ({ ...m, sessionId })));
  }

  const mentions = await db
    .select()
    .from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId))
    .orderBy(desc(brandMentionsTable.createdAt));

  res.json({ mentions, refreshed: generated.length });
});

router.put("/user/mentions/settings", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const {
    keywords,
    alertFrequency,
    mentionAlertsEnabled,
    positiveMentions,
    negativeMentions,
    neutralMentions,
  } = req.body ?? {};

  const existing = await db
    .select()
    .from(mentionSettingsTable)
    .where(eq(mentionSettingsTable.sessionId, sessionId));

  const updateData = {
    keywords: Array.isArray(keywords) ? JSON.stringify(keywords) : undefined,
    alertFrequency: typeof alertFrequency === "string" ? alertFrequency : undefined,
    mentionAlertsEnabled: typeof mentionAlertsEnabled === "boolean" ? mentionAlertsEnabled : undefined,
    positiveMentions: typeof positiveMentions === "boolean" ? positiveMentions : undefined,
    negativeMentions: typeof negativeMentions === "boolean" ? negativeMentions : undefined,
    neutralMentions: typeof neutralMentions === "boolean" ? neutralMentions : undefined,
  };

  const cleanUpdate = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== undefined));

  let settings;
  if (existing.length === 0) {
    const [inserted] = await db
      .insert(mentionSettingsTable)
      .values({ sessionId, ...cleanUpdate })
      .returning();
    settings = inserted;
  } else {
    const [updated] = await db
      .update(mentionSettingsTable)
      .set(cleanUpdate)
      .where(eq(mentionSettingsTable.sessionId, sessionId))
      .returning();
    settings = updated;
  }

  res.json(settings);
});

router.get("/user/mentions/sentiment-summary", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const mentions = await db.select().from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId))
    .orderBy(desc(brandMentionsTable.createdAt));

  const positive = mentions.filter(m => m.sentiment === "positive").length;
  const neutral = mentions.filter(m => m.sentiment === "neutral").length;
  const negative = mentions.filter(m => m.sentiment === "negative").length;
  const total = mentions.length;
  const sentimentScore = total > 0 ? Math.round(((positive * 100 + neutral * 50) / total)) : 50;

  if (total === 0) {
    res.json({ sentimentScore: 50, positive: 0, neutral: 0, negative: 0, total: 0, aiSummary: null });
    return;
  }

  const snippets = mentions.slice(0, 8).map(m => `[${m.sentiment}] ${m.snippet}`).join("\n");
  const prompt = `Analyze these brand mentions and provide a 2-3 sentence NLP sentiment summary:

${snippets}

Stats: ${positive} positive, ${neutral} neutral, ${negative} negative out of ${total} total mentions.

Write a concise, insight-rich sentiment analysis. Mention the dominant tone, any notable patterns, and one specific implication for the brand's ad readiness. Be direct and data-driven.`;

  const aiSummary = await chatCompletion([
    { role: "system", content: "You are a brand reputation analyst who specializes in NLP-powered sentiment analysis. Be concise and insightful." },
    { role: "user", content: prompt },
  ], { maxTokens: 200, temperature: 0.6 });

  res.json({ sentimentScore, positive, neutral, negative, total, aiSummary });
});

router.patch("/user/mentions/:id/read", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [updated] = await db
    .update(brandMentionsTable)
    .set({ isRead: true })
    .where(eq(brandMentionsTable.id, id))
    .returning();

  res.json(updated);
});

export default router;
