import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import {
  db, aiChatMessagesTable, aiConversationsTable,
} from "@workspace/db";
import { getSessionId } from "../middlewares/auth";
import { getOpenAiClient } from "../lib/openai";
import { getBrandContextData, formatBrandContext, buildRitaSystemPrompt } from "../lib/ai-coach-context";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Retry wrapper for OpenAI calls ────────────────────────────────────────────
async function callWithRetry(
  fn: () => Promise<string | null>,
  retries = 2,
  delayMs = 1000
): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (result !== null) return result;
    } catch (err: unknown) {
      const isLast = attempt === retries;
      logger.warn({ err, attempt }, "AI coach call failed, retrying...");
      if (isLast) throw err;
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  return null;
}

// ── Rita AI response ──────────────────────────────────────────────────────────
async function getRitaResponse(
  sessionId: string,
  brandId: number | null,
  conversationMessages: { role: "user" | "assistant"; content: string }[]
): Promise<string | null> {
  const client = await getOpenAiClient();
  if (!client) {
    logger.warn("OpenAI client unavailable for AI coach");
    return null;
  }

  const contextData = await getBrandContextData(sessionId, brandId);
  const formattedContext = formatBrandContext(contextData);
  const systemPrompt = buildRitaSystemPrompt(formattedContext, contextData.brandName);

  return callWithRetry(async () => {
    const res = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
      max_tokens: 1200,
      temperature: 0.72,
    });
    return res.choices[0]?.message?.content ?? null;
  });
}

// ── List conversations ────────────────────────────────────────────────────────
router.get("/ai/coach/conversations", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  try {
    const conversations = await db.select().from(aiConversationsTable)
      .where(eq(aiConversationsTable.sessionId, sessionId))
      .orderBy(desc(aiConversationsTable.updatedAt));
    res.json(conversations);
  } catch (err) {
    logger.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

// ── Create conversation ───────────────────────────────────────────────────────
router.post("/ai/coach/conversations", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { brandId, brandName, title } = req.body ?? {};

  try {
    const [conversation] = await db.insert(aiConversationsTable).values({
      sessionId,
      brandId: brandId ? String(brandId) : null,
      brandName: brandName ?? null,
      title: title ?? "New Conversation",
    }).returning();
    res.status(201).json(conversation);
  } catch (err) {
    logger.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// ── Delete conversation ───────────────────────────────────────────────────────
router.delete("/ai/coach/conversations/:id", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(aiChatMessagesTable).where(
      and(eq(aiChatMessagesTable.conversationId, id), eq(aiChatMessagesTable.sessionId, sessionId))
    );
    await db.delete(aiConversationsTable).where(
      and(eq(aiConversationsTable.id, id), eq(aiConversationsTable.sessionId, sessionId))
    );
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete conversation");
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// ── Get messages for a conversation ──────────────────────────────────────────
router.get("/ai/coach/conversations/:id/messages", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const messages = await db.select().from(aiChatMessagesTable)
      .where(and(eq(aiChatMessagesTable.conversationId, id), eq(aiChatMessagesTable.sessionId, sessionId)))
      .orderBy(aiChatMessagesTable.createdAt);
    res.json(messages);
  } catch (err) {
    logger.error({ err }, "Failed to load messages");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

// ── Send message ──────────────────────────────────────────────────────────────
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

  try {
    // Save user message first
    await db.insert(aiChatMessagesTable).values({
      sessionId,
      conversationId,
      role: "user",
      content: message.trim(),
    });

    // Load conversation history for memory (last 20 messages)
    const history = await db.select().from(aiChatMessagesTable)
      .where(and(eq(aiChatMessagesTable.conversationId, conversationId), eq(aiChatMessagesTable.sessionId, sessionId)))
      .orderBy(aiChatMessagesTable.createdAt)
      .limit(20);

    const conversationMessages = history.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const brandId = conversation.brandId ? parseInt(conversation.brandId) : null;

    // Get Rita's response with retry logic
    const reply = await getRitaResponse(sessionId, brandId, conversationMessages);

    if (!reply) {
      // Remove the user message we just saved so the user can retry
      await db.delete(aiChatMessagesTable).where(
        and(
          eq(aiChatMessagesTable.sessionId, sessionId),
          eq(aiChatMessagesTable.conversationId, conversationId),
          eq(aiChatMessagesTable.role, "user"),
          eq(aiChatMessagesTable.content, message.trim())
        )
      );
      res.status(503).json({
        error: "Rita is temporarily unavailable. Please check that your API key is configured and try again.",
      });
      return;
    }

    // Save Rita's response
    const [saved] = await db.insert(aiChatMessagesTable)
      .values({ sessionId, conversationId, role: "assistant", content: reply })
      .returning();

    // Auto-title from first user message
    if (conversation.title === "New Conversation") {
      const autoTitle = message.trim().slice(0, 55) + (message.trim().length > 55 ? "..." : "");
      await db.update(aiConversationsTable)
        .set({ title: autoTitle, updatedAt: new Date() })
        .where(eq(aiConversationsTable.id, conversationId));
    } else {
      await db.update(aiConversationsTable)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversationsTable.id, conversationId));
    }

    res.json({ message: saved });
  } catch (err) {
    logger.error({ err }, "AI coach message failed");
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// ── Legacy endpoints (backward compatibility — do not remove) ─────────────────
router.get("/ai/coach/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    const messages = await db.select().from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.sessionId, sessionId))
      .orderBy(aiChatMessagesTable.createdAt).limit(50);
    res.json(messages);
  } catch {
    res.json([]);
  }
});

router.post("/ai/coach/chat", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { message } = req.body ?? {};
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  try {
    await db.insert(aiChatMessagesTable).values({ sessionId, role: "user", content: message.trim() });

    const history = await db.select().from(aiChatMessagesTable)
      .where(eq(aiChatMessagesTable.sessionId, sessionId))
      .orderBy(desc(aiChatMessagesTable.createdAt)).limit(10);

    const conversationMessages = history.reverse().map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const reply = await getRitaResponse(sessionId, null, conversationMessages);
    if (!reply) { res.status(503).json({ error: "Rita is temporarily unavailable." }); return; }

    const [saved] = await db.insert(aiChatMessagesTable)
      .values({ sessionId, role: "assistant", content: reply }).returning();

    res.json({ message: saved });
  } catch (err) {
    logger.error({ err }, "Legacy AI coach chat failed");
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.delete("/ai/coach/history", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }
  try {
    await db.delete(aiChatMessagesTable).where(eq(aiChatMessagesTable.sessionId, sessionId));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
