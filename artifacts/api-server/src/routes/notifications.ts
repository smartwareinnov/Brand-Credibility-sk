import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, notificationsTable, userProfilesTable } from "@workspace/db";
import { requireSession, getSessionId } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireSession, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req)!;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.sessionId, sessionId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(100);

  res.json(notifications);
});

router.get("/notifications/unread-count", requireSession, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req)!;

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.sessionId, sessionId),
        eq(notificationsTable.isRead, false)
      )
    );

  res.json({ count: row?.count ?? 0 });
});

router.patch("/notifications/read-all", requireSession, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req)!;

  await db
    .update(notificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.sessionId, sessionId),
        eq(notificationsTable.isRead, false)
      )
    );

  res.json({ success: true });
});

router.patch("/notifications/:id/read", requireSession, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req)!;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  const [updated] = await db
    .update(notificationsTable)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.sessionId, sessionId)
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json(updated);
});

router.delete("/notifications/clear-read", requireSession, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req)!;

  const deleted = await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.sessionId, sessionId),
        eq(notificationsTable.isRead, true)
      )
    )
    .returning({ id: notificationsTable.id });

  res.json({ success: true, deleted: deleted.length });
});

router.delete("/notifications/:id", requireSession, async (req, res): Promise<void> => {
  const sessionId = getSessionId(req)!;
  const id = parseInt(req.params.id);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid notification ID" });
    return;
  }

  const deleted = await db
    .delete(notificationsTable)
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.sessionId, sessionId)
      )
    )
    .returning({ id: notificationsTable.id });

  if (deleted.length === 0) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({ success: true });
});

export default router;
