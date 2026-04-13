import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, aiChatMessagesTable, brandProfilesTable, analysesTable, userCompetitorsTable } from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { chatCompletion } from "../lib/openai";

const router: IRouter = Router();

async function getBrandContext(sessionId: string): Promise<string> {
  try {
    const [brand] = await db.select().from(brandProfilesTable).where(eq(brandProfilesTable.sessionId, sessionId)).limit(1);
    const [latestAnalysis] = await db.select().from(analysesTable)
      .where(eq(analysesTable.sessionId, sessionId))
      .orderBy(desc(analysesTable.createdAt)).limit(1);
    const competitors = await db.select().from(userCompetitorsTable).where(eq(userCompetitorsTable.sessionId, sessionId)).limit(5);

    const parts: string[] = [];
    if (brand) {
      parts.push(`Brand: ${brand.brandName ?? "Unknown"}`);
      if (brand.industry) parts.push(`Industry: ${brand.industry}`);
      if (brand.brandDescription) parts.push(`Description: ${brand.brandDescription}`);
      if (brand.websiteUrl) parts.push(`Website: ${brand.websiteUrl}`);
    }
    if (latestAnalysis && latestAnalysis.overallScore != null) {
      parts.push(`Current Brand Score: ${Math.round(latestAnalysis.overallScore)}/100`);
      parts.push(`Ad Readiness Level: ${latestAnalysis.adReadinessLevel ?? "unknown"}`);
      if (latestAnalysis.websiteScore != null) parts.push(`Website Score: ${Math.round(latestAnalysis.websiteScore)}`);
      if (latestAnalysis.socialScore != null) parts.push(`Social Score: ${Math.round(latestAnalysis.socialScore)}`);
      if (latestAnalysis.contentScore != null) parts.push(`Content Score: ${Math.round(latestAnalysis.contentScore)}`);
      if (latestAnalysis.reviewsScore != null) parts.push(`Reviews Score: ${Math.round(latestAnalysis.reviewsScore)}`);
    }
    if (competitors.length > 0) {
      parts.push(`Competitors tracked: ${competitors.map(c => c.name).join(", ")}`);
    }
    return parts.length > 0 ? parts.join("\n") : "No brand data available yet.";
  } catch {
    return "No brand data available yet.";
  }
}

router.get("/ai/coach/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const messages = await db.select().from(aiChatMessagesTable)
    .where(eq(aiChatMessagesTable.sessionId, sessionId))
    .orderBy(desc(aiChatMessagesTable.createdAt))
    .limit(50);

  res.json(messages.reverse());
});

router.post("/ai/coach/chat", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { message } = req.body ?? {};
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  await db.insert(aiChatMessagesTable).values({ sessionId, role: "user", content: message.trim() });

  const brandContext = await getBrandContext(sessionId);
  const history = await db.select().from(aiChatMessagesTable)
    .where(eq(aiChatMessagesTable.sessionId, sessionId))
    .orderBy(desc(aiChatMessagesTable.createdAt))
    .limit(20);

  const conversationHistory = history.reverse().slice(-10).map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = `You are an AI Brand Coach inside Skorvia, a platform that helps founders build ad-ready brands.

You have full context about this user's brand:
${brandContext}

Your role:
- Give personalized, actionable advice based on the brand's actual scores and data
- Help the user understand what their scores mean and how to improve them
- Write content when asked (LinkedIn posts, email copy, ad headlines, etc.)
- Suggest next priority actions based on weakest scores
- Explain competitor dynamics
- Be direct, concise, and founder-friendly

Always ground your advice in the user's actual brand data above. Never give generic advice that ignores their context.`;

  const reply = await chatCompletion([
    { role: "system", content: systemPrompt },
    ...conversationHistory,
  ], { maxTokens: 800, temperature: 0.75 });

  if (!reply) {
    res.status(503).json({ error: "AI coach is currently unavailable. Please try again later." });
    return;
  }

  const [saved] = await db.insert(aiChatMessagesTable)
    .values({ sessionId, role: "assistant", content: reply })
    .returning();

  res.json({ message: saved });
});

router.delete("/ai/coach/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  await db.delete(aiChatMessagesTable).where(eq(aiChatMessagesTable.sessionId, sessionId));
  res.json({ success: true });
});

export default router;
