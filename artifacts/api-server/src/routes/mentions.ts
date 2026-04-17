import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, brandMentionsTable, mentionSettingsTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { chatCompletion } from "../lib/openai";

const router: IRouter = Router();

function normalizeSettings(raw: Record<string, unknown> | null | undefined) {
  if (!raw) return null;
  let keywords: string[] = [];
  try {
    const parsed = typeof raw.keywords === "string" ? JSON.parse(raw.keywords) : raw.keywords;
    keywords = Array.isArray(parsed) ? parsed : [];
  } catch { keywords = []; }
  return {
    mentionAlerts: raw.mentionAlertsEnabled ?? true,
    alertFrequency: raw.alertFrequency ?? "realtime",
    positiveMentions: raw.positiveMentions ?? true,
    negativeMentions: raw.negativeMentions ?? true,
    neutralMentions: raw.neutralMentions ?? false,
    trackedKeywords: keywords,
  };
}

router.get("/user/mentions", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const mentions = await db
    .select()
    .from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId))
    .orderBy(desc(brandMentionsTable.createdAt));

  const settingsRows = await db
    .select()
    .from(mentionSettingsTable)
    .where(eq(mentionSettingsTable.sessionId, sessionId));

  res.json({
    mentions,
    settings: normalizeSettings(settingsRows[0] as Record<string, unknown> | undefined),
  });
});

router.post("/user/mentions/refresh", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const mentions = await db
    .select()
    .from(brandMentionsTable)
    .where(eq(brandMentionsTable.sessionId, sessionId))
    .orderBy(desc(brandMentionsTable.createdAt));

  res.json({ mentions, refreshed: 0 });
});

router.put("/user/mentions/settings", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const body = req.body ?? {};
  // Accept both frontend names (mentionAlerts, trackedKeywords) and DB names
  const mentionAlertsEnabled = body.mentionAlerts ?? body.mentionAlertsEnabled;
  const keywords = body.trackedKeywords ?? body.keywords;
  const { alertFrequency, positiveMentions, negativeMentions, neutralMentions } = body;

  const existing = await db
    .select()
    .from(mentionSettingsTable)
    .where(eq(mentionSettingsTable.sessionId, sessionId));

  const updateData: Record<string, unknown> = {};
  if (Array.isArray(keywords)) updateData.keywords = JSON.stringify(keywords);
  if (typeof alertFrequency === "string") updateData.alertFrequency = alertFrequency;
  if (typeof mentionAlertsEnabled === "boolean") updateData.mentionAlertsEnabled = mentionAlertsEnabled;
  if (typeof positiveMentions === "boolean") updateData.positiveMentions = positiveMentions;
  if (typeof negativeMentions === "boolean") updateData.negativeMentions = negativeMentions;
  if (typeof neutralMentions === "boolean") updateData.neutralMentions = neutralMentions;

  let raw;
  if (existing.length === 0) {
    const [inserted] = await db
      .insert(mentionSettingsTable)
      .values({ sessionId, ...updateData })
      .returning();
    raw = inserted;
  } else {
    const [updated] = await db
      .update(mentionSettingsTable)
      .set(updateData)
      .where(eq(mentionSettingsTable.sessionId, sessionId))
      .returning();
    raw = updated;
  }

  res.json(normalizeSettings(raw as Record<string, unknown>));
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
