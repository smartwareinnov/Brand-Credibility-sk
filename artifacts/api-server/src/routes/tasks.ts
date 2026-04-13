import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, actionTasksTable, analysesTable } from "@workspace/db";
import {
  ListAnalysisTasksParams,
  CompleteTaskParams,
  UncompleteTaskParams,
} from "@workspace/api-zod";
import { chatCompletion } from "../lib/openai";
import { getSessionId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/analyses/:id/tasks", async (req, res): Promise<void> => {
  const params = ListAnalysisTasksParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const tasks = await db
    .select()
    .from(actionTasksTable)
    .where(eq(actionTasksTable.analysisId, params.data.id))
    .orderBy(actionTasksTable.priority);

  res.json(tasks);
});

router.patch("/tasks/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .update(actionTasksTable)
    .set({ isCompleted: true, completedAt: new Date() })
    .where(eq(actionTasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(task);
});

router.patch("/tasks/:id/uncomplete", async (req, res): Promise<void> => {
  const params = UncompleteTaskParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [task] = await db
    .update(actionTasksTable)
    .set({ isCompleted: false, completedAt: null })
    .where(eq(actionTasksTable.id, params.data.id))
    .returning();

  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }

  res.json(task);
});

router.post("/analyses/:id/tasks/regenerate", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [analysis] = await db.select().from(analysesTable).where(eq(analysesTable.id, id));
  if (!analysis || analysis.status !== "completed") {
    res.status(404).json({ error: "Completed analysis not found" }); return;
  }

  const currentTasks = await db.select().from(actionTasksTable)
    .where(eq(actionTasksTable.analysisId, id))
    .orderBy(actionTasksTable.priority);

  const completedTasks = currentTasks.filter(t => t.isCompleted);
  const pendingTasks = currentTasks.filter(t => !t.isCompleted);

  const prompt = `A founder has completed ${completedTasks.length} out of ${currentTasks.length} brand improvement tasks.

Brand current state:
- Overall Score: ${Math.round(analysis.overallScore ?? 0)}/100
- Website: ${Math.round(analysis.websiteScore ?? 0)}, Social: ${Math.round(analysis.socialScore ?? 0)}, Content: ${Math.round(analysis.contentScore ?? 0)}, Reviews: ${Math.round(analysis.reviewsScore ?? 0)}, Messaging: ${Math.round(analysis.messagingScore ?? 0)}
- Brand: ${analysis.brandName}, Industry: ${analysis.industry}

Completed tasks: ${completedTasks.map(t => t.title).join("; ") || "none yet"}

Remaining pending tasks (need reprioritization):
${pendingTasks.map((t, i) => `${i + 1}. [priority:${t.priority}] ${t.title}`).join("\n")}

Based on what's been completed and the current scores, reprioritize the remaining tasks. Return ONLY a JSON array of task IDs in the NEW optimal priority order, like: [3, 1, 5, 2, 4]
The IDs available are: ${pendingTasks.map(t => t.id).join(", ")}`;

  const aiReply = await chatCompletion([
    { role: "system", content: "You are a brand strategy expert. Respond only with the JSON array of IDs in priority order. No explanation, no markdown." },
    { role: "user", content: prompt },
  ], { maxTokens: 200, temperature: 0.4 });

  let newOrder: number[] = pendingTasks.map(t => t.id);
  if (aiReply) {
    try {
      const parsed = JSON.parse(aiReply.replace(/```json|```/g, "").trim());
      if (Array.isArray(parsed) && parsed.every(n => typeof n === "number")) {
        const validIds = new Set(pendingTasks.map(t => t.id));
        const filtered = parsed.filter((id: number) => validIds.has(id));
        if (filtered.length > 0) newOrder = filtered;
      }
    } catch {
      // keep original order
    }
  }

  for (let i = 0; i < newOrder.length; i++) {
    await db.update(actionTasksTable)
      .set({ priority: i + 1 })
      .where(eq(actionTasksTable.id, newOrder[i]));
  }

  const updatedTasks = await db.select().from(actionTasksTable)
    .where(eq(actionTasksTable.analysisId, id))
    .orderBy(actionTasksTable.priority);

  res.json({ tasks: updatedTasks, regenerated: newOrder.length, aiUsed: !!aiReply });
});

export default router;
