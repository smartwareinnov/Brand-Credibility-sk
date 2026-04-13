import crypto from "crypto";

interface AdminSession {
  adminId: number;
  username: string;
  role: string;
  expiresAt: Date;
}

const sessions = new Map<string, AdminSession>();

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createAdminSession(adminId: number, username: string, role: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    adminId,
    username,
    role,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export function getAdminSession(token: string): AdminSession | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function deleteAdminSession(token: string): void {
  sessions.delete(token);
}

export function purgeExpiredSessions(): void {
  const now = new Date();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) sessions.delete(token);
  }
}

setInterval(purgeExpiredSessions, 60 * 60 * 1000);
