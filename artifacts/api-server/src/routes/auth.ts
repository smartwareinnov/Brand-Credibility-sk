import { Router, type IRouter } from "express";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { db, userProfilesTable, emailConfirmationsTable, platformSettingsTable, waitlistSignupsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { sendConfirmationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../lib/email";
import { verifyRecaptcha } from "../lib/recaptcha";

const router: IRouter = Router();

const pending2FATokens = new Map<string, { sessionId: string; expires: number }>();

function generateTempToken(): string {
  return "tmp_" + randomBytes(24).toString("hex");
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pending2FATokens) {
    if (val.expires < now) pending2FATokens.delete(key);
  }
}, 60_000);

function getBaseUrl(req: Parameters<Parameters<typeof router.use>[0]>[0]): string {
  const appUrl = process.env.APP_URL;
  if (appUrl) return appUrl;
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  return `${proto}://${host}`;
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const { fullName, email, password, recaptchaToken } = req.body ?? {};

  try {
    const captcha = await verifyRecaptcha(recaptchaToken);
    if (!captcha.ok) { res.status(400).json({ error: captcha.error }); return; }

    const rows = await db.select().from(platformSettingsTable);
    const cfg: Record<string, string> = {};
    for (const r of rows) cfg[r.key] = r.value ?? "";
    if (cfg.maintenanceMode === "true") {
      res.status(503).json({ error: "The platform is currently under maintenance. Please try again later." });
      return;
    }
    if (cfg.waitlistMode === "true") {
      res.status(403).json({ error: "We are currently in waitlist mode. New registrations are paused.", code: "WAITLIST_MODE" });
      return;
    }
    if (cfg.allowSignups === "false") {
      res.status(403).json({ error: "New sign-ups are currently disabled.", code: "SIGNUPS_DISABLED" });
      return;
    }
  } catch {
    // If settings check fails, allow signup to proceed
  }

  if (!fullName || !email || !password) {
    res.status(400).json({ error: "fullName, email, and password are required" });
    return;
  }

  if (typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.email, email.toLowerCase().trim()));

  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const sessionId = "sess_" + randomBytes(16).toString("hex");
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [user] = await db
    .insert(userProfilesTable)
    .values({
      sessionId,
      email: email.toLowerCase().trim(),
      fullName,
      passwordHash,
      emailConfirmed: false,
      avatarInitials: initials,
    })
    .returning();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(emailConfirmationsTable).values({
    email: user.email!,
    fullName,
    token,
    sessionId,
    expiresAt,
  });

  const base = getBaseUrl(req);
  const confirmationUrl = `${base}/confirm-email?token=${token}`;

  const emailResult = await sendConfirmationEmail({
    to: user.email!,
    fullName,
    confirmationUrl,
  });

  logger.info({ email: user.email, confirmationUrl }, "User signed up");

  res.status(201).json({
    message: "Account created. Please check your email to confirm.",
  });
});

router.post("/auth/waitlist", async (req, res): Promise<void> => {
  const { fullName, email } = req.body ?? {};

  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    res.status(400).json({ error: "Full name is required" });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email address is required" });
    return;
  }

  try {
    await db
      .insert(waitlistSignupsTable)
      .values({ fullName: fullName.trim(), email: email.toLowerCase().trim() })
      .onConflictDoNothing();

    logger.info({ email }, "Waitlist signup recorded");
    res.status(201).json({ message: "You have been added to the waitlist.", code: "WAITLIST_JOINED" });
  } catch {
    res.status(500).json({ error: "Failed to join waitlist. Please try again." });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password, recaptchaToken } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const captcha = await verifyRecaptcha(recaptchaToken);
  if (!captcha.ok) { res.status(400).json({ error: captcha.error }); return; }

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.email, email.toLowerCase().trim()));

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.emailConfirmed) {
    res.status(403).json({ error: "Please confirm your email address before logging in" });
    return;
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = generateTempToken();
    pending2FATokens.set(tempToken, { sessionId: user.sessionId, expires: Date.now() + 5 * 60 * 1000 });
    logger.info({ email: user.email }, "2FA required for login");
    res.json({ requiresTwoFactor: true, tempToken });
    return;
  }

  logger.info({ email: user.email }, "User logged in");

  res.json({
    sessionId: user.sessionId,
    fullName: user.fullName,
    email: user.email,
    avatarInitials: user.avatarInitials,
  });
});

router.post("/auth/verify-2fa", async (req, res): Promise<void> => {
  const { tempToken, code } = req.body ?? {};

  if (!tempToken || !code) {
    res.status(400).json({ error: "tempToken and code are required" });
    return;
  }

  const pending = pending2FATokens.get(String(tempToken));
  if (!pending || pending.expires < Date.now()) {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, pending.sessionId));

  if (!user || !user.twoFactorSecret) {
    res.status(401).json({ error: "Invalid session" });
    return;
  }

  const isValid = speakeasy.totp.verify({
    token: String(code).replace(/\s/g, ""),
    secret: user.twoFactorSecret,
    encoding: "base32",
    window: 1,
  });

  if (!isValid) {
    res.status(401).json({ error: "Invalid verification code. Please try again." });
    return;
  }

  pending2FATokens.delete(String(tempToken));
  logger.info({ email: user.email }, "User logged in with 2FA");

  res.json({
    sessionId: user.sessionId,
    fullName: user.fullName,
    email: user.email,
    avatarInitials: user.avatarInitials,
  });
});

router.get("/auth/confirm", async (req, res): Promise<void> => {
  const { token } = req.query as Record<string, string>;

  if (!token) {
    res.status(400).json({ error: "Token is required" });
    return;
  }

  const [confirmation] = await db
    .select()
    .from(emailConfirmationsTable)
    .where(
      and(
        eq(emailConfirmationsTable.token, token),
        gt(emailConfirmationsTable.expiresAt, new Date())
      )
    );

  if (!confirmation) {
    res.status(400).json({ error: "Invalid or expired confirmation token" });
    return;
  }

  if (confirmation.confirmedAt) {
    const [user] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.sessionId, confirmation.sessionId));

    res.json({
      sessionId: confirmation.sessionId,
      fullName: user?.fullName ?? confirmation.fullName,
      email: confirmation.email,
      onboardingCompleted: user?.onboardingCompleted ?? false,
      alreadyConfirmed: true,
    });
    return;
  }

  await db
    .update(emailConfirmationsTable)
    .set({ confirmedAt: new Date() })
    .where(eq(emailConfirmationsTable.token, token));

  const [updatedUser] = await db
    .update(userProfilesTable)
    .set({ emailConfirmed: true })
    .where(eq(userProfilesTable.sessionId, confirmation.sessionId))
    .returning();

  sendWelcomeEmail({ to: confirmation.email, fullName: confirmation.fullName ?? "" }).catch(() => {});

  logger.info({ email: confirmation.email }, "Email confirmed");

  res.json({
    sessionId: confirmation.sessionId,
    fullName: updatedUser?.fullName ?? confirmation.fullName,
    email: confirmation.email,
    onboardingCompleted: updatedUser?.onboardingCompleted ?? false,
    alreadyConfirmed: false,
  });
});

async function getGoogleCredentials(): Promise<{ clientId: string; clientSecret: string } | null> {
  try {
    const rows = await db.select().from(platformSettingsTable);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value ?? "";
    const clientId = map["googleClientId"] ?? process.env.GOOGLE_CLIENT_ID ?? "";
    const clientSecret = map["googleClientSecret"] ?? process.env.GOOGLE_CLIENT_SECRET ?? "";
    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret };
  } catch {
    return null;
  }
}

router.get("/auth/google", async (req, res): Promise<void> => {
  const creds = await getGoogleCredentials();
  if (!creds) {
    res.status(503).json({ error: "Google OAuth is not configured. Set Google Client ID and Secret in Admin > API Integrations." });
    return;
  }

  const base = getBaseUrl(req);
  const redirectUri = `${base}/api/auth/google/callback`;
  const state = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code, error: oauthError } = req.query as Record<string, string>;

  const base = getBaseUrl(req);
  const frontendBase = base;
  const redirectUri = `${base}/api/auth/google/callback`;

  if (oauthError || !code) {
    res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent(oauthError ?? "No authorization code received")}`);
    return;
  }

  const creds = await getGoogleCredentials();
  if (!creds) {
    res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent("Google OAuth is not configured")}`);
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({})) as { error_description?: string };
      logger.error({ status: tokenRes.status, err: errData }, "Google token exchange failed");
      res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent("Failed to exchange Google authorization code")}`);
      return;
    }

    const tokenData = await tokenRes.json() as { access_token?: string };
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent("No access token received from Google")}`);
      return;
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent("Failed to get user info from Google")}`);
      return;
    }

    const googleUser = await userRes.json() as {
      sub: string;
      email: string;
      name: string;
      given_name?: string;
      email_verified?: boolean;
    };

    if (!googleUser.email) {
      res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent("Google did not return an email address")}`);
      return;
    }

    const emailLower = googleUser.email.toLowerCase().trim();

    const [existingUser] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.email, emailLower));

    let sessionId: string;
    let isNewUser = false;

    if (existingUser) {
      if (!existingUser.emailConfirmed) {
        await db
          .update(userProfilesTable)
          .set({ emailConfirmed: true })
          .where(eq(userProfilesTable.id, existingUser.id));
      }
      sessionId = existingUser.sessionId;
    } else {
      sessionId = "sess_" + randomBytes(16).toString("hex");
      const fullName = googleUser.name || googleUser.given_name || emailLower.split("@")[0] || "User";
      const initials = fullName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      await db.insert(userProfilesTable).values({
        sessionId,
        email: emailLower,
        fullName,
        emailConfirmed: true,
        avatarInitials: initials,
      });

      sendWelcomeEmail({ to: emailLower, fullName }).catch(() => {});
      isNewUser = true;
      logger.info({ email: emailLower }, "New user via Google OAuth");
    }

    logger.info({ email: emailLower, isNewUser }, "User signed in via Google");

    const params = new URLSearchParams({ sessionId });
    if (isNewUser) params.set("onboarding", "1");

    res.redirect(`${frontendBase}/auth/google/success?${params.toString()}`);
  } catch (err) {
    logger.error({ err }, "Google OAuth callback error");
    res.redirect(`${frontendBase}/auth/google/success?error=${encodeURIComponent("An unexpected error occurred during Google sign-in")}`);
  }
});

router.post("/auth/resend-confirmation", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.json({ message: "If that email is registered, a new confirmation link has been sent." });
    return;
  }

  if (user.emailConfirmed) {
    res.json({ message: "Email is already confirmed. You can log in." });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(emailConfirmationsTable).values({
    email: user.email!,
    fullName: user.fullName ?? "",
    token,
    sessionId: user.sessionId,
    expiresAt,
  });

  const base = getBaseUrl(req);
  const confirmationUrl = `${base}/confirm-email?token=${token}`;

  const emailResult = await sendConfirmationEmail({
    to: user.email!,
    fullName: user.fullName ?? "",
    confirmationUrl,
  });

  res.json({
    message: "Confirmation email resent.",
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body ?? {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.email, email.toLowerCase().trim()));

  if (!user) {
    res.json({ message: "If an account with that email exists, a reset link has been sent." });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await db
    .update(userProfilesTable)
    .set({ passwordResetToken: token, passwordResetExpiry: expiry })
    .where(eq(userProfilesTable.id, user.id));

  const base = getBaseUrl(req);
  const resetUrl = `${base}/reset-password?token=${token}`;

  const emailResult = await sendPasswordResetEmail({
    to: user.email!,
    fullName: user.fullName ?? "there",
    resetUrl,
  });

  logger.info({ email: user.email }, "Password reset requested");

  res.json({
    message: "If an account with that email exists, a reset link has been sent.",
  });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body ?? {};

  if (!token || !password) {
    res.status(400).json({ error: "Token and password are required" });
    return;
  }

  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(
      and(
        eq(userProfilesTable.passwordResetToken, token),
        gt(userProfilesTable.passwordResetExpiry!, new Date())
      )
    );

  if (!user) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(userProfilesTable)
    .set({
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    })
    .where(eq(userProfilesTable.id, user.id));

  logger.info({ email: user.email }, "Password reset successful");

  res.json({ message: "Password updated successfully. You can now log in." });
});

export default router;
