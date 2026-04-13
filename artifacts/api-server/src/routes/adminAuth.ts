import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { eq } from "drizzle-orm";
import { db, adminAccountsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { createAdminSession, getAdminSession, deleteAdminSession } from "../lib/adminSessions";
import { verifyRecaptcha } from "../lib/recaptcha";
import crypto from "crypto";

const adminResetTokens = new Map<string, { adminId: number; username: string; expiresAt: number }>();
const adminPending2FA = new Map<string, { adminId: number; username: string; email: string | null; role: string; expiresAt: number; attempts: number }>();

function generateResetCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function pruneExpiredTokens() {
  const now = Date.now();
  for (const [code, data] of adminResetTokens.entries()) {
    if (data.expiresAt < now) adminResetTokens.delete(code);
  }
}

const router: IRouter = Router();

export async function seedAdminAccount(): Promise<void> {
  try {
    const existing = await db.select().from(adminAccountsTable).limit(1);
    if (existing.length > 0) return;

    const username = process.env.ADMIN_USERNAME ?? "admin";
    const plainPassword = process.env.ADMIN_PASSWORD ?? "skorvia-admin-2024";
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    await db.insert(adminAccountsTable).values({
      username,
      passwordHash,
      role: "superadmin",
    });

    logger.info({ username }, "Default admin account created");
  } catch (err) {
    logger.error({ err }, "Failed to seed admin account");
  }
}

router.post("/admin/login", async (req, res) => {
  const { username, password, recaptchaToken } = req.body ?? {};

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  try {
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) { res.status(400).json({ error: captcha.error }); return; }

    const [admin] = await db
      .select()
      .from(adminAccountsTable)
      .where(eq(adminAccountsTable.username, username))
      .limit(1);

    if (!admin || !admin.isActive) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    if (admin.twoFactorEnabled && admin.twoFactorSecret) {
      const tempToken = crypto.randomBytes(32).toString("hex");
      adminPending2FA.set(tempToken, {
        adminId: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
      });
      res.json({ requiresTwoFactor: true, tempToken });
      return;
    }

    await db
      .update(adminAccountsTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminAccountsTable.id, admin.id));

    const token = createAdminSession(admin.id, admin.username, admin.role);

    logger.info({ username: admin.username }, "Admin logged in");

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    logger.error({ err }, "Admin login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/admin/verify-2fa", async (req, res) => {
  const { tempToken, code } = req.body ?? {};

  if (!tempToken || !code) {
    res.status(400).json({ error: "Temp token and code are required" });
    return;
  }

  const pending = adminPending2FA.get(tempToken);
  if (!pending || Date.now() > pending.expiresAt) {
    adminPending2FA.delete(tempToken);
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  if (pending.attempts >= 5) {
    adminPending2FA.delete(tempToken);
    logger.warn({ adminId: pending.adminId }, "Admin 2FA max attempts exceeded");
    res.status(429).json({ error: "Too many attempts. Please log in again." });
    return;
  }

  pending.attempts++;

  try {
    const [admin] = await db
      .select()
      .from(adminAccountsTable)
      .where(eq(adminAccountsTable.id, pending.adminId))
      .limit(1);

    if (!admin || !admin.twoFactorSecret) {
      res.status(400).json({ error: "2FA not configured" });
      return;
    }

    const isValid = speakeasy.totp.verify({
      token: String(code).replace(/\s/g, ""),
      secret: admin.twoFactorSecret,
      encoding: "base32",
      window: 1,
    });

    if (!isValid) {
      const remaining = 5 - pending.attempts;
      res.status(400).json({ error: `Invalid code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` });
      return;
    }

    adminPending2FA.delete(tempToken);

    await db
      .update(adminAccountsTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(adminAccountsTable.id, admin.id));

    const token = createAdminSession(admin.id, admin.username, admin.role);
    logger.info({ username: admin.username }, "Admin logged in with 2FA");

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    logger.error({ err }, "Admin 2FA verify error");
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/admin/logout", (req, res) => {
  const token =
    (req.headers["x-admin-token"] as string) ??
    (req.headers.authorization?.replace("Bearer ", "") as string);

  if (token) deleteAdminSession(token);
  res.json({ success: true });
});

router.get("/admin/me", (req, res) => {
  const token =
    (req.headers["x-admin-token"] as string) ??
    (req.headers.authorization?.replace("Bearer ", "") as string);

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const session = getAdminSession(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }

  res.json({
    id: session.adminId,
    username: session.username,
    role: session.role,
  });
});

router.post("/admin/change-password", async (req, res) => {
  const token =
    (req.headers["x-admin-token"] as string) ??
    (req.headers.authorization?.replace("Bearer ", "") as string);

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const session = getAdminSession(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid" });
    return;
  }

  const { currentPassword, newPassword } = req.body ?? {};

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  try {
    const [admin] = await db
      .select()
      .from(adminAccountsTable)
      .where(eq(adminAccountsTable.id, session.adminId))
      .limit(1);

    if (!admin) {
      res.status(404).json({ error: "Admin account not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(adminAccountsTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(adminAccountsTable.id, admin.id));

    logger.info({ username: admin.username }, "Admin password changed");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Admin change-password error");
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.post("/admin/forgot-password", async (req, res) => {
  const { username } = req.body ?? {};
  if (!username || typeof username !== "string") {
    res.status(400).json({ error: "Username is required" });
    return;
  }

  try {
    const [admin] = await db
      .select()
      .from(adminAccountsTable)
      .where(eq(adminAccountsTable.username, username.trim()))
      .limit(1);

    if (!admin || !admin.isActive) {
      res.status(404).json({ error: "No admin account found with that username" });
      return;
    }

    pruneExpiredTokens();

    const code = generateResetCode();
    const expiresAt = Date.now() + 30 * 60 * 1000;
    adminResetTokens.set(code, { adminId: admin.id, username: admin.username, expiresAt });

    logger.info({ username: admin.username }, "Admin password reset code generated");

    res.json({
      success: true,
      resetCode: code,
      message: "Reset code generated. Use it within 30 minutes.",
    });
  } catch (err) {
    logger.error({ err }, "Admin forgot-password error");
    res.status(500).json({ error: "Failed to generate reset code" });
  }
});

router.post("/admin/reset-password", async (req, res) => {
  const { code, newPassword, username } = req.body ?? {};

  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Reset code is required" });
    return;
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  pruneExpiredTokens();

  const tokenData = adminResetTokens.get(code.trim().toUpperCase());
  if (!tokenData || Date.now() > tokenData.expiresAt) {
    res.status(400).json({ error: "Reset code is invalid or has expired. Please generate a new one." });
    return;
  }

  if (username && tokenData.username !== username.trim()) {
    res.status(400).json({ error: "Reset code does not match the provided username" });
    return;
  }

  try {
    const newHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(adminAccountsTable)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(adminAccountsTable.id, tokenData.adminId));

    adminResetTokens.delete(code.trim().toUpperCase());

    logger.info({ username: tokenData.username }, "Admin password reset successfully");
    res.json({ success: true, message: "Password has been reset successfully" });
  } catch (err) {
    logger.error({ err }, "Admin reset-password error");
    res.status(500).json({ error: "Failed to reset password" });
  }
});

function getAuthAdmin(req: any): ReturnType<typeof getAdminSession> {
  const token =
    (req.headers["x-admin-token"] as string) ??
    (req.headers.authorization?.replace("Bearer ", "") as string);
  return token ? getAdminSession(token) : undefined;
}

router.get("/admin/2fa/status", async (req, res) => {
  const session = getAuthAdmin(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const [admin] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.id, session.adminId)).limit(1);
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }
    res.json({ twoFactorEnabled: !!admin.twoFactorEnabled });
  } catch (err) {
    logger.error({ err }, "Admin 2FA status error");
    res.status(500).json({ error: "Failed to get 2FA status" });
  }
});

router.post("/admin/2fa/setup", async (req, res) => {
  const session = getAuthAdmin(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  try {
    const [admin] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.id, session.adminId)).limit(1);
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }

    const secretObj = speakeasy.generateSecret({
      name: `Skorvia Admin:${admin.username}`,
      issuer: "Skorvia",
      length: 20,
    });
    const secret = secretObj.base32;
    const otpauth = secretObj.otpauth_url ?? `otpauth://totp/Skorvia%20Admin:${encodeURIComponent(admin.username)}?secret=${secret}&issuer=Skorvia`;
    const qrCode = await QRCode.toDataURL(otpauth);

    await db.update(adminAccountsTable)
      .set({ twoFactorSecret: secret, twoFactorEnabled: false, updatedAt: new Date() })
      .where(eq(adminAccountsTable.id, admin.id));

    res.json({ secret, qrCode, otpauth });
  } catch (err) {
    logger.error({ err }, "Admin 2FA setup error");
    res.status(500).json({ error: "Failed to set up 2FA" });
  }
});

router.post("/admin/2fa/enable", async (req, res) => {
  const session = getAuthAdmin(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { code } = req.body ?? {};
  if (!code) { res.status(400).json({ error: "Verification code is required" }); return; }

  try {
    const [admin] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.id, session.adminId)).limit(1);
    if (!admin || !admin.twoFactorSecret) { res.status(400).json({ error: "2FA not set up. Please run setup first." }); return; }

    const isValid = speakeasy.totp.verify({
      token: String(code).replace(/\s/g, ""),
      secret: admin.twoFactorSecret,
      encoding: "base32",
      window: 1,
    });

    if (!isValid) { res.status(400).json({ error: "Invalid code. Please try again." }); return; }

    await db.update(adminAccountsTable)
      .set({ twoFactorEnabled: true, updatedAt: new Date() })
      .where(eq(adminAccountsTable.id, admin.id));

    logger.info({ username: admin.username }, "Admin 2FA enabled");
    res.json({ success: true, message: "Two-factor authentication enabled" });
  } catch (err) {
    logger.error({ err }, "Admin 2FA enable error");
    res.status(500).json({ error: "Failed to enable 2FA" });
  }
});

router.post("/admin/2fa/disable", async (req, res) => {
  const session = getAuthAdmin(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { password } = req.body ?? {};
  if (!password) { res.status(400).json({ error: "Password is required to disable 2FA" }); return; }

  try {
    const [admin] = await db.select().from(adminAccountsTable).where(eq(adminAccountsTable.id, session.adminId)).limit(1);
    if (!admin) { res.status(404).json({ error: "Admin not found" }); return; }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) { res.status(401).json({ error: "Incorrect password" }); return; }

    await db.update(adminAccountsTable)
      .set({ twoFactorSecret: null, twoFactorEnabled: false, updatedAt: new Date() })
      .where(eq(adminAccountsTable.id, admin.id));

    logger.info({ username: admin.username }, "Admin 2FA disabled");
    res.json({ success: true, message: "Two-factor authentication disabled" });
  } catch (err) {
    logger.error({ err }, "Admin 2FA disable error");
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
});

export default router;
