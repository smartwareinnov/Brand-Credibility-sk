import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db, aiChatMessagesTable, aiConversationsTable,
  brandProfilesTable, userBrandsTable, analysesTable,
  userCompetitorsTable, actionTasksTable, brandMentionsTable,
} from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { chatCompletion } from "../lib/openai";

const router: IRouter = Router();

async function getBrandContext(sessionId: string, brandId?: number | null): Promise<string> {
  try {
    const parts: string[] = [];

    // Prefer userBrandsTable if brandId provided, else fall back to brandProfilesTable
    if (brandId) {
      const [brand] = await db.select().from(userBrandsTable)
        .where(and(eq(userBrandsTable.id, brandId), eq(userBrandsTable.sessionId, sessionId))).limit(1);
      if (brand) {
        parts.push(`Brand Name: ${brand.brandName}`);
        if (brand.industry) parts.push(`Industry: ${brand.industry}`);
        if (brand.websiteUrl) parts.push(`Website: ${brand.websiteUrl}`);
        if (brand.instagramHandle) parts.push(`Instagram: @${brand.instagramHandle}`);
        if (brand.linkedinUrl) parts.push(`LinkedIn: ${brand.linkedinUrl}`);
      }
    } else {
      const [brand] = await db.select().from(brandProfilesTable)
        .where(eq(brandProfilesTable.sessionId, sessionId)).limit(1);
      if (brand) {
        parts.push(`Brand Name: ${brand.brandName ?? "Unknown"}`);
        if (brand.industry) parts.push(`Industry: ${brand.industry}`);
        if (brand.brandDescription) parts.push(`Brand Description: ${brand.brandDescription}`);
        if (brand.websiteUrl) parts.push(`Website: ${brand.websiteUrl}`);
        if (brand.targetAudience) parts.push(`Target Audience: ${brand.targetAudience}`);
        if (brand.instagramHandle) parts.push(`Instagram: @${brand.instagramHandle}`);
        if (brand.linkedinUrl) parts.push(`LinkedIn: ${brand.linkedinUrl}`);
        if (brand.twitterHandle) parts.push(`Twitter/X: @${brand.twitterHandle}`);
        if (brand.competitor1 || brand.competitor2 || brand.competitor3) {
          const comps = [brand.competitor1, brand.competitor2, brand.competitor3].filter(Boolean);
          parts.push(`Known Competitors: ${comps.join(", ")}`);
        }
      }
    }

    // Latest analysis scores
    const [latestAnalysis] = await db.select().from(analysesTable)
      .where(eq(analysesTable.sessionId, sessionId))
      .orderBy(desc(analysesTable.createdAt)).limit(1);

    if (latestAnalysis && latestAnalysis.overallScore != null) {
      parts.push(`\n--- LATEST BRAND ANALYSIS ---`);
      parts.push(`Overall Score: ${Math.round(latestAnalysis.overallScore)}/100`);
      parts.push(`Ad Readiness Level: ${latestAnalysis.adReadinessLevel ?? "unknown"}`);
      if (latestAnalysis.websiteScore != null) parts.push(`Website Score: ${Math.round(latestAnalysis.websiteScore)}/100`);
      if (latestAnalysis.socialScore != null) parts.push(`Social Media Score: ${Math.round(latestAnalysis.socialScore)}/100`);
      if (latestAnalysis.contentScore != null) parts.push(`Content Quality Score: ${Math.round(latestAnalysis.contentScore)}/100`);
      if (latestAnalysis.reviewsScore != null) parts.push(`Reviews & Trust Score: ${Math.round(latestAnalysis.reviewsScore)}/100`);
      if (latestAnalysis.messagingScore != null) parts.push(`Messaging Clarity Score: ${Math.round(latestAnalysis.messagingScore)}/100`);

      // Top pending tasks
      const pendingTasks = await db.select({ title: actionTasksTable.title, category: actionTasksTable.category, priority: actionTasksTable.priority })
        .from(actionTasksTable)
        .where(and(eq(actionTasksTable.analysisId, latestAnalysis.id), eq(actionTasksTable.isCompleted, false)))
        .orderBy(actionTasksTable.priority)
        .limit(5);
      if (pendingTasks.length > 0) {
        parts.push(`Top Pending Actions: ${pendingTasks.map(t => `[${t.category}] ${t.title}`).join(" | ")}`);
      }
    }

    // Tracked competitors
    const competitors = await db.select().from(userCompetitorsTable)
      .where(eq(userCompetitorsTable.sessionId, sessionId)).limit(5);
    if (competitors.length > 0) {
      parts.push(`\n--- COMPETITORS ---`);
      competitors.forEach(c => {
        parts.push(`${c.name}: Overall ${c.estimatedScore ?? "??"}/100`);
      });
    }

    // Recent brand mentions sentiment
    const mentions = await db.select({ sentiment: brandMentionsTable.sentiment })
      .from(brandMentionsTable)
      .where(eq(brandMentionsTable.sessionId, sessionId))
      .limit(30);
    if (mentions.length > 0) {
      const pos = mentions.filter(m => m.sentiment === "positive").length;
      const neg = mentions.filter(m => m.sentiment === "negative").length;
      const neu = mentions.filter(m => m.sentiment === "neutral").length;
      parts.push(`\n--- BRAND MENTIONS ---`);
      parts.push(`Total: ${mentions.length} | Positive: ${pos} | Neutral: ${neu} | Negative: ${neg}`);
    }

    return parts.length > 0 ? parts.join("\n") : "No brand data available yet. The user has not run a brand analysis.";
  } catch {
    return "No brand data available yet.";
  }
}

function buildSystemPrompt(brandContext: string): string {
  return `You are Marcus, a senior brand strategist and business consultant with over 30 years of experience helping founders build credible, scalable brands. You have worked with startups, SMBs, and Fortune 500 companies across every major industry.

You are embedded inside Skorvia, a brand intelligence platform. You have full access to this user's brand data, scores, roadmap, and competitor intelligence. You use this data to give advice that is specific, direct, and immediately actionable — never generic.

YOUR PERSONALITY:
- Warm but direct. You don't sugarcoat, but you're never harsh.
- You speak like a trusted advisor, not a chatbot.
- You ask clarifying questions when needed before giving advice.
- You remember everything discussed in this conversation and build on it.
- You proactively reference the user's actual data in your responses.

YOUR EXPERTISE:
- Brand positioning and messaging strategy
- Paid advertising readiness and ROI optimization
- Competitive intelligence and market positioning
- Content strategy, SEO, and social media growth
- PR, press, and brand reputation management
- Customer trust, reviews, and social proof
- Business growth strategy and go-to-market planning

CURRENT USER'S BRAND DATA:
${brandContext}

INSTRUCTIONS:
- Always reference the user's actual scores, tasks, and competitor data when relevant.
- If their score is low in a specific area, proactively address it.
- When writing content (posts, emails, ad copy), make it specific to their brand and industry.
- If the user hasn't run an analysis yet, encourage them to do so first.
- Keep responses focused and scannable. Use bullet points for lists of actions.
- Never say "I don't have access to your data" — you do. Use it.`;
}

// List all conversations
router.get("/ai/coach/conversations", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const conversations = await db.select().from(aiConversationsTable)
    .where(eq(aiConversationsTable.sessionId, sessionId))
    .orderBy(desc(aiConversationsTable.updatedAt));

  res.json(conversations);
});

// Create a new conversation
router.post("/ai/coach/conversations", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { brandId, brandName, title } = req.body ?? {};

  const [conversation] = await db.insert(aiConversationsTable).values({
    sessionId,
    brandId: brandId ? String(brandId) : null,
    brandName: brandName ?? null,
    title: title ?? "New Conversation",
  }).returning();

  res.status(201).json(conversation);
});

// Delete a conversation and its messages
router.delete("/ai/coach/conversations/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(aiChatMessagesTable).where(
    and(eq(aiChatMessagesTable.conversationId, id), eq(aiChatMessagesTable.sessionId, sessionId))
  );
  await db.delete(aiConversationsTable).where(
    and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.sessionId, sessionId))
  );

  res.json({ success: true });
});

// Get messages for a conversation
router.get("/ai/coach/conversations/:id/messages", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const messages = await db.select().from(aiChatMessagesTable)
    .where(and(eq(aiChatMessagesTable.conversationId, id), eq(aiChatMessagesTable.sessionId, sessionId)))
    .orderBy(aiChatMessagesTable.createdAt);

  res.json(messages);
});

// Send a message in a conversation
router.post("/ai/coach/conversations/:id/messages", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const conversationId = parseInt(req.params.id);
  if (isNaN(conversationId)) { res.status(400).json({ error: "Invalid conversation id" }); return; }

  const { message } = req.body ?? {};
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  // Verify conversation belongs to this session
  const [conversation] = await db.select().from(aiConversationsTable)
    .where(and(eq(aiConversationsTable.id, conversationId), eq(aiConversationsTable.sessionId, sessionId)));
  if (!conversation) { res.status(404).json({ error: "Conversation not found" }); return; }

  // Save user message
  await db.insert(aiChatMessagesTable).values({
    sessionId,
    conversationId,
    role: "user",
    content: message.trim(),
  });

  // Get brand context
  const brandId = conversation.brandId ? parseInt(conversation.brandId) : null;
  const brandContext = await getBrandContext(sessionId, brandId);

  // Get conversation history (last 20 messages for context)
  const history = await db.select().from(aiChatMessagesTable)
    .where(and(eq(aiChatMessagesTable.conversationId, conversationId), eq(aiChatMessagesTable.sessionId, sessionId)))
    .orderBy(aiChatMessagesTable.createdAt)
    .limit(20);

  const conversationMessages = history.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const systemPrompt = buildSystemPrompt(brandContext);

  const reply = await chatCompletion([
    { role: "system", content: systemPrompt },
    ...conversationMessages,
  ], { model: "gpt-4o", maxTokens: 1000, temperature: 0.7 });

  if (!reply) {
    res.status(503).json({ error: "AI coach is currently unavailable. Please try again." });
    return;
  }

  const [saved] = await db.insert(aiChatMessagesTable)
    .values({ sessionId, conversationId, role: "assistant", content: reply })
    .returning();

  // Auto-generate title from first user message if still default
  if (conversation.title === "New Conversation") {
    const autoTitle = message.trim().slice(0, 60) + (message.trim().length > 60 ? "..." : "");
    await db.update(aiConversationsTable)
      .set({ title: autoTitle, updatedAt: new Date() })
      .where(eq(aiConversationsTable.id, conversationId));
  } else {
    await db.update(aiConversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversationsTable.id, conversationId));
  }

  res.json({ message: saved });
});

// Legacy endpoints — keep for backward compat
router.get("/ai/coach/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }
  const messages = await db.select().from(aiChatMessagesTable)
    .where(and(eq(aiChatMessagesTable.sessionId, sessionId)))
    .orderBy(aiChatMessagesTable.createdAt).limit(50);
  res.json(messages);
});

router.delete("/ai/coach/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }
  await db.delete(aiChatMessagesTable).where(eq(aiChatMessagesTable.sessionId, sessionId));
  res.json({ success: true });
});

export default router;
