import { db, auditLogsTable } from "@workspace/db";
import { Request } from "express";

export async function logAudit(opts: {
  req?: Request;
  actorSessionId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const ip = opts.req
      ? ((opts.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
          opts.req.socket.remoteAddress ?? null)
      : null;

    await db.insert(auditLogsTable).values({
      actorSessionId: opts.actorSessionId ?? null,
      actorEmail: opts.actorEmail ?? null,
      action: opts.action,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      ipAddress: ip,
    });
  } catch {
  }
}
