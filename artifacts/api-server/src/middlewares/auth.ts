import { Request, Response, NextFunction } from "express";

export function getSessionId(req: Request): string | null {
  const header = req.headers["x-session-id"];
  if (typeof header === "string" && header.trim()) return header.trim();
  const query = req.query?.sessionId;
  if (typeof query === "string" && query.trim()) return query.trim();
  return null;
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required. Please log in." });
    return;
  }
  (req as Request & { sessionId: string }).sessionId = sessionId;
  next();
}
