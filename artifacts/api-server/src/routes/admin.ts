import { Router, type IRouter } from "express";
import { eq, sql, and, gte, desc, inArray, or } from "drizzle-orm";
import {
  db,
  platformSettingsTable,
  userProfilesTable,
  analysesTable,
  subscriptionsTable,
  actionTasksTable,
  auditLogsTable,
  notificationsTable,
  platformPlansTable,
  couponsTable,
} from "@workspace/db";
import {
  UpdateAdminSettingsBody,
  UploadLogoBody,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { getAdminSession } from "../lib/adminSessions";
import { sendBroadcastEmail, sendPlanAssignedEmail } from "../lib/email";

const router: IRouter = Router();

async function writeAuditLog(params: {
  actorEmail?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      actorEmail: params.actorEmail ?? "admin",
      action: params.action,
      targetType: params.targetType ?? null,
      targetId: params.targetId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    // Audit log failure must never break the operation
  }
}

function checkAdminAuth(req: Parameters<Parameters<typeof router.use>[0]>[0], res: Parameters<Parameters<typeof router.use>[0]>[1]): boolean {
  const token =
    (req.headers["x-admin-token"] as string) ??
    (req.headers.authorization?.replace("Bearer ", "") as string);

  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return false;
  }

  const session = getAdminSession(token);
  if (!session) {
    res.status(401).json({ error: "Session expired or invalid — please log in again" });
    return false;
  }

  return true;
}

const SETTINGS_KEYS = [
  "siteName", "siteTagline", "logoUrl", "faviconUrl", "lightLogoUrl",
  "brandColor", "accentColor", "typography", "metaDescription",
  "footerText", "privacyUrl", "termsUrl", "supportEmail",
  // SEO / SERP
  "serpApiKey", "keywordDataApiKey", "domainMetricsApiKey", "serpApiFallbackKey",
  // Social - Meta
  "metaAppId", "metaAppSecret", "metaWebhookToken", "metaRedirectUri", "metaAdsToken",
  // X / Twitter
  "xApiKey", "xApiSecret", "xBearerToken",
  // LinkedIn
  "linkedinClientId", "linkedinClientSecret", "linkedinOauthToken", "linkedinRedirectUri",
  // Google
  "googleClientId", "googleClientSecret",
  "googleCustomSearchApiKey", "googleSearchEngineId", "googlePlacesApiKey",
  // YouTube
  "youtubeApiKey",
  // Reviews
  "trustpilotApiKey",
  // Flutterwave
  "flutterwavePublicKey", "flutterwaveSecretKey", "flutterwaveEncryptionKey",
  "flutterwaveWebhookSecret", "flutterwaveLiveMode",
  // AI
  "openaiApiKey",
  // FX
  "fxProviderApiKey", "fxRateNGN", "fxRateGHS", "fxRateKES",
  "fxRateZAR", "fxRateGBP", "fxRateEUR",
  // Platform toggles
  "maintenanceMode", "allowSignups", "emailVerificationRequired",
  "freeTrialEnabled", "referralProgramEnabled", "waitlistMode",
  // Security
  "force2FA", "sessionTimeout", "ipWhitelist", "recaptchaEnabled", "recaptchaSiteKey", "recaptchaSecretKey",
  // Currency
  "defaultCurrency",
  // Email (Resend)
  "resendApiKey", "resendFromEmail",
  // SMTP (legacy)
  "smtpHost", "smtpPort", "smtpUser", "smtpPass", "smtpFrom",
  // Analysis weights
  "weightWebsite", "weightSocial", "weightContent",
  "weightReviews", "weightCompetitor", "weightMessaging",
] as const;

type SettingKey = (typeof SETTINGS_KEYS)[number];

const SECRET_KEYS = new Set([
  "metaAppSecret", "metaAdsToken", "xApiKey", "xApiSecret", "xBearerToken",
  "serpApiKey", "keywordDataApiKey", "domainMetricsApiKey", "serpApiFallbackKey",
  "linkedinClientSecret", "linkedinOauthToken",
  "googleClientSecret", "googleCustomSearchApiKey", "googlePlacesApiKey",
  "youtubeApiKey", "trustpilotApiKey", "flutterwaveSecretKey", "flutterwaveEncryptionKey",
  "flutterwaveWebhookSecret", "openaiApiKey", "fxProviderApiKey",
  "smtpPass", "resendApiKey", "recaptchaSecretKey",
]);

async function getAllSettings(): Promise<Record<string, string | null>> {
  const rows = await db.select().from(platformSettingsTable);
  const map: Record<string, string | null> = {};
  for (const row of rows) {
    map[row.key] = row.value ?? null;
  }
  return map;
}

function mapSettingsToResponse(map: Record<string, string | null>) {
  const boolVal = (key: string, def: boolean) => map[key] !== undefined ? map[key] === "true" : def;
  const intVal = (key: string) => map[key] ? parseInt(map[key]!, 10) : null;

  return {
    siteName: map.siteName ?? "Skorvia",
    siteTagline: map.siteTagline ?? null,
    logoUrl: map.logoUrl ?? null,
    faviconUrl: map.faviconUrl ?? null,
    lightLogoUrl: map.lightLogoUrl ?? null,
    brandColor: map.brandColor ?? null,
    accentColor: map.accentColor ?? null,
    typography: map.typography ?? null,
    metaDescription: map.metaDescription ?? null,
    footerText: map.footerText ?? null,
    privacyUrl: map.privacyUrl ?? null,
    termsUrl: map.termsUrl ?? null,
    supportEmail: map.supportEmail ?? null,
    // SEO
    serpApiKey: map.serpApiKey ? "••••••••" : null,
    keywordDataApiKey: map.keywordDataApiKey ? "••••••••" : null,
    domainMetricsApiKey: map.domainMetricsApiKey ? "••••••••" : null,
    serpApiFallbackKey: map.serpApiFallbackKey ? "••••••••" : null,
    // Meta
    metaAppId: map.metaAppId ?? null,
    metaAppSecret: map.metaAppSecret ? "••••••••" : null,
    metaWebhookToken: map.metaWebhookToken ? "••••••••" : null,
    metaRedirectUri: map.metaRedirectUri ?? null,
    metaAdsToken: map.metaAdsToken ? "••••••••" : null,
    // X
    xApiKey: map.xApiKey ? "••••••••" : null,
    xApiSecret: map.xApiSecret ? "••••••••" : null,
    xBearerToken: map.xBearerToken ? "••••••••" : null,
    // LinkedIn
    linkedinClientId: map.linkedinClientId ?? null,
    linkedinClientSecret: map.linkedinClientSecret ? "••••••••" : null,
    linkedinOauthToken: map.linkedinOauthToken ? "••••••••" : null,
    linkedinRedirectUri: map.linkedinRedirectUri ?? null,
    // Google
    googleClientId: map.googleClientId ?? null,
    googleClientSecret: map.googleClientSecret ? "••••••••" : null,
    googleCustomSearchApiKey: map.googleCustomSearchApiKey ? "••••••••" : null,
    googleSearchEngineId: map.googleSearchEngineId ?? null,
    googlePlacesApiKey: map.googlePlacesApiKey ? "••••••••" : null,
    // YouTube
    youtubeApiKey: map.youtubeApiKey ? "••••••••" : null,
    // Reviews
    trustpilotApiKey: map.trustpilotApiKey ? "••••••••" : null,
    // Flutterwave
    flutterwavePublicKey: map.flutterwavePublicKey ?? null,
    flutterwaveSecretKey: map.flutterwaveSecretKey ? "••••••••" : null,
    flutterwaveEncryptionKey: map.flutterwaveEncryptionKey ? "••••••••" : null,
    flutterwaveWebhookSecret: map.flutterwaveWebhookSecret ? "••••••••" : null,
    flutterwaveLiveMode: map.flutterwaveLiveMode === "true" ? true : map.flutterwaveLiveMode === "false" ? false : null,
    // AI
    openaiApiKey: map.openaiApiKey ? "••••••••" : null,
    // FX
    fxProviderApiKey: map.fxProviderApiKey ? "••••••••" : null,
    fxRateNGN: map.fxRateNGN ?? null,
    fxRateGHS: map.fxRateGHS ?? null,
    fxRateKES: map.fxRateKES ?? null,
    fxRateZAR: map.fxRateZAR ?? null,
    fxRateGBP: map.fxRateGBP ?? null,
    fxRateEUR: map.fxRateEUR ?? null,
    // Platform toggles
    maintenanceMode: boolVal("maintenanceMode", false),
    allowSignups: boolVal("allowSignups", true),
    emailVerificationRequired: boolVal("emailVerificationRequired", true),
    freeTrialEnabled: boolVal("freeTrialEnabled", true),
    referralProgramEnabled: boolVal("referralProgramEnabled", true),
    waitlistMode: boolVal("waitlistMode", false),
    // Security
    force2FA: boolVal("force2FA", false),
    sessionTimeout: intVal("sessionTimeout"),
    ipWhitelist: map.ipWhitelist ?? null,
    recaptchaEnabled: boolVal("recaptchaEnabled", false),
    recaptchaSiteKey: map.recaptchaSiteKey ?? null,
    recaptchaSecretKey: map.recaptchaSecretKey ? "••••••••" : null,
    // Currency
    defaultCurrency: map.defaultCurrency ?? "USD",
    // Email (Resend)
    resendApiKey: map.resendApiKey ? "••••••••" : null,
    resendFromEmail: map.resendFromEmail ?? null,
    // SMTP (legacy)
    smtpHost: map.smtpHost ?? null,
    smtpPort: intVal("smtpPort"),
    smtpUser: map.smtpUser ?? null,
    smtpPass: map.smtpPass ? "••••••••" : null,
    smtpFrom: map.smtpFrom ?? null,
    // Weights
    weightWebsite: intVal("weightWebsite"),
    weightSocial: intVal("weightSocial"),
    weightContent: intVal("weightContent"),
    weightReviews: intVal("weightReviews"),
    weightCompetitor: intVal("weightCompetitor"),
    weightMessaging: intVal("weightMessaging"),
    updatedAt: new Date().toISOString(),
  };
}

router.get("/admin/settings", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const map = await getAllSettings();
  res.json(mapSettingsToResponse(map));
});

router.patch("/admin/settings", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const body = UpdateAdminSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const updates: Array<{ key: string; value: string | null }> = [];
  const data = body.data as Record<string, unknown>;

  for (const key of SETTINGS_KEYS) {
    if (key in data) {
      const val = data[key];
      if (val === null || val === undefined) {
        updates.push({ key, value: null });
      } else {
        updates.push({ key, value: String(val) });
      }
    }
  }

  for (const { key, value } of updates) {
    await db
      .insert(platformSettingsTable)
      .values({ key, value })
      .onConflictDoUpdate({
        target: platformSettingsTable.key,
        set: { value, updatedAt: new Date() },
      });
  }

  if (body.data.flutterwaveSecretKey && body.data.flutterwaveSecretKey !== "••••••••") {
    process.env.FLUTTERWAVE_SECRET_KEY = body.data.flutterwaveSecretKey;
    logger.info("Flutterwave secret key updated in environment");
  }

  const map = await getAllSettings();
  const changedKeys = updates.map(u => u.key).join(", ");
  await writeAuditLog({
    action: `Updated platform settings: ${changedKeys}`,
    targetType: "settings",
    targetId: "platform",
    ipAddress: req.ip ?? undefined,
  });
  res.json(mapSettingsToResponse(map));
});

router.post("/admin/platform-settings", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const { key, value } = req.body ?? {};
  if (!key || typeof key !== "string") {
    res.status(400).json({ error: "key is required" });
    return;
  }
  await db
    .insert(platformSettingsTable)
    .values({ key, value: value !== undefined ? String(value) : null })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value: value !== undefined ? String(value) : null, updatedAt: new Date() },
    });
  res.json({ success: true });
});

router.get("/admin/platform-settings", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const prefix = req.query.prefix as string | undefined;
  let all = await db.select().from(platformSettingsTable);
  if (prefix) all = all.filter(s => s.key.startsWith(prefix));
  res.json(all);
});

router.post("/admin/logo", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const body = UploadLogoBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const logoUrl = `data:${body.data.imageType};base64,${body.data.imageData}`;
  const logoType = (req.body as Record<string, unknown>)?.logoType as string | undefined;
  const dbKey = logoType === "light" ? "lightLogoUrl" : logoType === "favicon" ? "faviconUrl" : "logoUrl";

  await db
    .insert(platformSettingsTable)
    .values({ key: dbKey, value: logoUrl })
    .onConflictDoUpdate({
      target: platformSettingsTable.key,
      set: { value: logoUrl, updatedAt: new Date() },
    });

  await writeAuditLog({
    action: `Logo uploaded (${dbKey})`,
    targetType: "settings",
    targetId: dbKey,
    ipAddress: req.ip ?? undefined,
  });
  res.json({ logoUrl, message: "Logo uploaded successfully" });
});

router.get("/app/config", async (_req, res): Promise<void> => {
  try {
    const map = await getAllSettings();
    res.json({
      siteName: map.siteName ?? "Skorvia",
      siteTagline: map.siteTagline ?? null,
      logoUrl: map.logoUrl ?? null,
      lightLogoUrl: map.lightLogoUrl ?? null,
      faviconUrl: map.faviconUrl ?? null,
      brandColor: map.brandColor ?? null,
      accentColor: map.accentColor ?? null,
      typography: map.typography ?? null,
      metaDescription: map.metaDescription ?? null,
      footerText: map.footerText ?? null,
      privacyUrl: map.privacyUrl ?? null,
      termsUrl: map.termsUrl ?? null,
      maintenanceMode: map.maintenanceMode === "true",
      allowSignups: map.allowSignups !== "false",
      waitlistMode: map.waitlistMode === "true",
      recaptchaEnabled: map.recaptchaEnabled === "true",
      recaptchaSiteKey: map.recaptchaEnabled === "true" ? (map.recaptchaSiteKey ?? null) : null,
      sessionTimeout: map.sessionTimeout ? parseInt(map.sessionTimeout, 10) : null,
    });
  } catch {
    res.json({ siteName: "Skorvia", allowSignups: true, maintenanceMode: false, waitlistMode: false });
  }
});

router.get("/admin/stats", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const [totals] = await db
    .select({
      totalAnalyses: sql<number>`count(*)::int`,
      averageScore: sql<number | null>`avg(${analysesTable.overallScore})`,
    })
    .from(analysesTable);

  const [subTotals] = await db
    .select({
      totalSubscriptions: sql<number>`count(*)::int`,
      activeSubscriptions: sql<number>`count(*) filter (where ${subscriptionsTable.isActive} = true)::int`,
    })
    .from(subscriptionsTable);

  const [userCount] = await db
    .select({ totalUsers: sql<number>`count(*)::int` })
    .from(userProfilesTable);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [monthlyAnalyses] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analysesTable)
    .where(gte(analysesTable.createdAt, startOfMonth));

  const [monthlyUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userProfilesTable)
    .where(gte(userProfilesTable.createdAt, startOfMonth));

  const [scansToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(analysesTable)
    .where(gte(analysesTable.createdAt, startOfDay));

  const activeSubs = subTotals?.activeSubscriptions ?? 0;
  const mrr = activeSubs * 9900;

  res.json({
    totalUsers: userCount?.totalUsers ?? 0,
    totalAnalyses: totals?.totalAnalyses ?? 0,
    totalSubscriptions: subTotals?.totalSubscriptions ?? 0,
    activeSubscriptions: activeSubs,
    mrr,
    scansToday: scansToday?.count ?? 0,
    totalRevenue: 0,
    analysesThisMonth: monthlyAnalyses?.count ?? 0,
    newUsersThisMonth: monthlyUsers?.count ?? 0,
    averageScore: totals?.averageScore ? Math.round(totals.averageScore) : null,
  });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const users = await db
    .select({
      sessionId: userProfilesTable.sessionId,
      fullName: userProfilesTable.fullName,
      email: userProfilesTable.email,
      company: userProfilesTable.company,
      country: userProfilesTable.country,
      emailConfirmed: userProfilesTable.emailConfirmed,
      status: userProfilesTable.status,
      createdAt: userProfilesTable.createdAt,
    })
    .from(userProfilesTable)
    .orderBy(sql`${userProfilesTable.createdAt} desc`)
    .limit(200);

  const results = await Promise.all(
    users.map(async (u) => {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(analysesTable)
        .where(eq(analysesTable.sessionId, u.sessionId));

      const hasSub = u.email
        ? (
            await db
              .select()
              .from(subscriptionsTable)
              .where(
                and(
                  eq(subscriptionsTable.email, u.email),
                  eq(subscriptionsTable.isActive, true)
                )
              )
              .limit(1)
          ).length > 0
        : false;

      return {
        sessionId: u.sessionId,
        fullName: u.fullName ?? null,
        email: u.email ?? null,
        company: u.company ?? null,
        country: u.country ?? null,
        analysisCount: countRow?.count ?? 0,
        hasActiveSubscription: hasSub,
        emailConfirmed: u.emailConfirmed,
        status: (u.status ?? "active") as "active" | "disabled" | "banned",
        createdAt: u.createdAt.toISOString(),
      };
    })
  );

  res.json(results);
});

router.patch("/admin/users/:sessionId", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { sessionId } = req.params;
  const { status } = req.body as { status: string };

  if (!["active", "disabled", "banned"].includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be active, disabled, or banned." });
    return;
  }

  const [user] = await db
    .update(userProfilesTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(userProfilesTable.sessionId, sessionId))
    .returning({
      sessionId: userProfilesTable.sessionId,
      fullName: userProfilesTable.fullName,
      email: userProfilesTable.email,
      company: userProfilesTable.company,
      country: userProfilesTable.country,
      emailConfirmed: userProfilesTable.emailConfirmed,
      status: userProfilesTable.status,
      createdAt: userProfilesTable.createdAt,
    });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await writeAuditLog({
    action: `User ${status === "banned" ? "banned" : status === "disabled" ? "disabled" : "reactivated"}: ${user.email ?? sessionId}`,
    targetType: "user",
    targetId: sessionId,
    metadata: { status, email: user.email },
    ipAddress: req.ip ?? undefined,
  });

  res.json({
    sessionId: user.sessionId,
    fullName: user.fullName ?? null,
    email: user.email ?? null,
    company: user.company ?? null,
    country: user.country ?? null,
    analysisCount: 0,
    hasActiveSubscription: false,
    emailConfirmed: user.emailConfirmed,
    status: (user.status ?? "active") as "active" | "disabled" | "banned",
    createdAt: user.createdAt.toISOString(),
  });
});

router.delete("/admin/users/:sessionId", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { sessionId } = req.params;

  const deleted = await db
    .delete(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId))
    .returning({ sessionId: userProfilesTable.sessionId });

  if (deleted.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await writeAuditLog({
    action: `Deleted user account: ${sessionId}`,
    targetType: "user",
    targetId: sessionId,
    ipAddress: req.ip ?? undefined,
  });

  res.json({ success: true, message: "User account deleted successfully." });
});

router.post("/admin/notifications/broadcast", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { title, message, channel, target, userIds } = req.body as {
    title: string;
    message: string;
    channel: "in_app" | "email" | "both";
    target: "all" | "active" | "inactive" | "subscribed" | "unsubscribed" | "selected";
    userIds?: string[];
  };

  if (!title?.trim() || !message?.trim()) {
    res.status(400).json({ error: "Title and message are required" });
    return;
  }

  if (!["in_app", "email", "both"].includes(channel)) {
    res.status(400).json({ error: "Channel must be in_app, email, or both" });
    return;
  }

  if (!["all", "active", "inactive", "subscribed", "unsubscribed", "selected"].includes(target)) {
    res.status(400).json({ error: "Invalid target" });
    return;
  }

  if (target === "selected" && (!Array.isArray(userIds) || userIds.length === 0)) {
    res.status(400).json({ error: "userIds required for selected target" });
    return;
  }

  let users: Array<{ sessionId: string; email: string | null; status: string }> = [];

  if (target === "all") {
    users = await db.select({
      sessionId: userProfilesTable.sessionId,
      email: userProfilesTable.email,
      status: userProfilesTable.status,
    }).from(userProfilesTable);
  } else if (target === "active") {
    users = await db.select({
      sessionId: userProfilesTable.sessionId,
      email: userProfilesTable.email,
      status: userProfilesTable.status,
    }).from(userProfilesTable).where(eq(userProfilesTable.status, "active"));
  } else if (target === "inactive") {
    users = await db.select({
      sessionId: userProfilesTable.sessionId,
      email: userProfilesTable.email,
      status: userProfilesTable.status,
    }).from(userProfilesTable).where(
      or(
        eq(userProfilesTable.status, "disabled"),
        eq(userProfilesTable.status, "banned"),
      )
    );
  } else if (target === "subscribed") {
    const activeSubs = await db
      .select({ email: subscriptionsTable.email })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.isActive, true));
    const subEmails = activeSubs.map((s) => s.email).filter(Boolean) as string[];
    if (subEmails.length > 0) {
      users = await db.select({
        sessionId: userProfilesTable.sessionId,
        email: userProfilesTable.email,
        status: userProfilesTable.status,
      }).from(userProfilesTable).where(inArray(userProfilesTable.email, subEmails));
    }
  } else if (target === "unsubscribed") {
    const activeSubs = await db
      .select({ email: subscriptionsTable.email })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.isActive, true));
    const subEmails = new Set(activeSubs.map((s) => s.email).filter(Boolean));
    const allUsers = await db.select({
      sessionId: userProfilesTable.sessionId,
      email: userProfilesTable.email,
      status: userProfilesTable.status,
    }).from(userProfilesTable);
    users = allUsers.filter((u) => !u.email || !subEmails.has(u.email));
  } else if (target === "selected" && userIds) {
    users = await db.select({
      sessionId: userProfilesTable.sessionId,
      email: userProfilesTable.email,
      status: userProfilesTable.status,
    }).from(userProfilesTable).where(inArray(userProfilesTable.sessionId, userIds));
  }

  let inAppSent = 0;
  let emailSent = 0;
  let emailFailed = 0;

  if (channel === "in_app" || channel === "both") {
    if (users.length > 0) {
      await db.insert(notificationsTable).values(
        users.map((u) => ({
          sessionId: u.sessionId,
          type: "admin_message" as const,
          title: title.trim(),
          message: message.trim(),
        }))
      );
      inAppSent = users.length;
    }
  }

  if (channel === "email" || channel === "both") {
    const emailUsers = users.filter((u) => u.email);
    for (const user of emailUsers) {
      if (user.email) {
        const result = await sendBroadcastEmail({
          to: user.email,
          subject: title.trim(),
          title: title.trim(),
          message: message.trim(),
        });
        if (result.sent) emailSent++;
        else emailFailed++;
      }
    }
  }

  logger.info({ target, channel, inAppSent, emailSent, emailFailed }, "Admin broadcast sent");

  res.json({
    success: true,
    inAppSent,
    emailSent,
    emailFailed,
    totalTargeted: users.length,
  });
});

router.get("/admin/notifications/history", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const notifications = await db
    .select()
    .from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable);

  res.json({ notifications, total: countResult?.count ?? 0 });
});

const PLAN_NAMES: Record<string, string> = {
  "free": "Free",
  "starter-monthly": "Starter Monthly",
  "growth-monthly": "Growth Monthly",
  "growth-yearly": "Growth Annual",
};

const PLAN_DURATIONS_DAYS: Record<string, number> = {
  "starter-monthly": 30,
  "growth-monthly": 30,
  "growth-yearly": 365,
};

router.post("/admin/users/:sessionId/assign-plan", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const { sessionId } = req.params;
  const { planId, durationDays: rawDuration } = req.body ?? {};

  if (!planId || typeof planId !== "string") {
    res.status(400).json({ error: "planId is required" });
    return;
  }

  const [user] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId))
    .limit(1);

  if (!user || !user.email) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (planId === "free") {
    await db
      .update(subscriptionsTable)
      .set({ isActive: false, status: "cancelled", cancelledAt: new Date() })
      .where(and(eq(subscriptionsTable.email, user.email), eq(subscriptionsTable.isActive, true)));

    await db.insert(notificationsTable).values({
      sessionId: user.sessionId,
      type: "subscription_renewal",
      title: "Plan Updated",
      message: "Your account has been moved to the Free plan by our team.",
    });

    res.json({ success: true, planId: "free", message: "User downgraded to free plan" });
    return;
  }

  const durationDays = rawDuration ? parseInt(rawDuration) : (PLAN_DURATIONS_DAYS[planId] ?? 30);
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  const planName = PLAN_NAMES[planId] ?? planId;

  await db
    .update(subscriptionsTable)
    .set({ isActive: false, status: "cancelled", cancelledAt: new Date() })
    .where(and(eq(subscriptionsTable.email, user.email), eq(subscriptionsTable.isActive, true)));

  const txRef = `admin-assign-${Date.now()}-${user.email.split("@")[0]}`;
  await db.insert(subscriptionsTable).values({
    email: user.email,
    planId,
    currency: "NGN",
    txRef,
    transactionId: `admin-manual-${Date.now()}`,
    status: "active",
    isActive: true,
    expiresAt,
    autoRenew: false,
  });

  await db.insert(notificationsTable).values({
    sessionId: user.sessionId,
    type: "subscription_renewal",
    title: "Subscription Activated 🎉",
    message: `Your ${planName} subscription has been activated by our team. Enjoy full access until ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
  });

  const fullName = user.fullName ?? user.email.split("@")[0] ?? "there";
  sendPlanAssignedEmail({
    to: user.email,
    fullName,
    planName,
    expiresAt,
    assignedByAdmin: true,
  }).catch((err) => logger.error({ err }, "Failed to send plan assigned email"));

  logger.info({ sessionId, email: user.email, planId, expiresAt }, "Admin manually assigned plan");

  await writeAuditLog({
    action: `Assigned ${planName} plan to ${user.email} (${durationDays} days)`,
    targetType: "billing",
    targetId: sessionId,
    metadata: { planId, durationDays, expiresAt: expiresAt.toISOString() },
    ipAddress: req.ip ?? undefined,
  });

  res.json({
    success: true,
    planId,
    planName,
    expiresAt: expiresAt.toISOString(),
    message: `${planName} plan assigned to ${user.email} until ${expiresAt.toLocaleDateString()}`,
  });
});

const FEATURE_LIMIT_SETTING_KEYS: Record<string, string> = {
  "Brand analyses": "brandAnalysisLimit",
  "Competitor analysis": "competitorAnalysisLimit",
  "Competitor Ads Intelligence": "adsIntelligenceLimit",
  "Brand mention monitoring": "brandMentionLimit",
};

async function syncPlanLimitsToSettings(planId: string, features: Array<{ text: string; included: boolean; limit?: number | null }>) {
  for (const feature of features) {
    const settingPrefix = FEATURE_LIMIT_SETTING_KEYS[feature.text];
    if (!settingPrefix) continue;
    const settingKey = `${settingPrefix}_${planId}`;
    let value: string;
    if (!feature.included) {
      value = "0";
    } else if (feature.limit === null || feature.limit === undefined) {
      continue;
    } else {
      value = feature.limit === 0 ? "999" : String(feature.limit);
    }
    await db.insert(platformSettingsTable).values({ key: settingKey, value })
      .onConflictDoUpdate({ target: platformSettingsTable.key, set: { value, updatedAt: new Date() } });
  }
}

const DEFAULT_SEED_PLANS = [
  {
    planId: "free",
    name: "Free",
    price: 0,
    currency: "NGN",
    period: "monthly",
    badge: null,
    popular: false,
    active: true,
    description: "Get started with brand basics",
    isAgency: false,
    features: JSON.stringify([
      { text: "Brand analyses", included: true, limit: 1 },
      { text: "Ad Readiness Score breakdown", included: true },
      { text: "Action plan", included: false },
      { text: "Daily personalized tasks", included: false },
      { text: "Competitor analysis", included: false, limit: null },
      { text: "SEO & content recommendations", included: false },
      { text: "Google & Trustpilot review tracking", included: false },
      { text: "Competitor Ads Intelligence", included: false, limit: null },
      { text: "Brand mention monitoring", included: false, limit: null },
    ]),
  },
  {
    planId: "starter-monthly",
    name: "Starter",
    price: 14900,
    currency: "NGN",
    period: "monthly",
    badge: null,
    popular: false,
    active: true,
    description: "Perfect for solopreneurs validating their brand",
    isAgency: false,
    features: JSON.stringify([
      { text: "Brand analyses", included: true, limit: 3 },
      { text: "Ad Readiness Score breakdown", included: true },
      { text: "Action plan", included: true },
      { text: "Daily personalized tasks", included: true },
      { text: "Competitor analysis", included: true, limit: 2 },
      { text: "SEO & content recommendations", included: false },
      { text: "Google & Trustpilot review tracking", included: false },
      { text: "Competitor Ads Intelligence", included: true, limit: 3 },
      { text: "Brand mention monitoring", included: false, limit: null },
    ]),
  },
  {
    planId: "growth-monthly",
    name: "Growth",
    price: 29900,
    currency: "NGN",
    period: "monthly",
    badge: "Most Popular",
    popular: true,
    active: true,
    description: "For founders ready to scale their online presence",
    isAgency: false,
    features: JSON.stringify([
      { text: "Brand analyses", included: true, limit: 0 },
      { text: "Ad Readiness Score breakdown", included: true },
      { text: "Action plan", included: true },
      { text: "Daily personalized tasks", included: true },
      { text: "Competitor analysis", included: true, limit: 0 },
      { text: "SEO & content recommendations", included: true },
      { text: "Google & Trustpilot review tracking", included: true },
      { text: "Competitor Ads Intelligence", included: true, limit: 0 },
      { text: "Brand mention monitoring", included: true, limit: 0 },
    ]),
  },
  {
    planId: "growth-yearly",
    name: "Growth (Annual)",
    price: 322920,
    currency: "NGN",
    period: "yearly",
    badge: "Best Value",
    popular: false,
    active: true,
    description: "Save 10% with an annual subscription",
    isAgency: false,
    features: JSON.stringify([
      { text: "Brand analyses", included: true, limit: 0 },
      { text: "Ad Readiness Score breakdown", included: true },
      { text: "Action plan", included: true },
      { text: "Daily personalized tasks", included: true },
      { text: "Competitor analysis", included: true, limit: 0 },
      { text: "SEO & content recommendations", included: true },
      { text: "Google & Trustpilot review tracking", included: true },
      { text: "Competitor Ads Intelligence", included: true, limit: 0 },
      { text: "Brand mention monitoring", included: true, limit: 0 },
    ]),
  },
];

router.post("/admin/plans/seed", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const existing = await db.select({ planId: platformPlansTable.planId }).from(platformPlansTable);
  const existingIds = new Set(existing.map((p) => p.planId));
  const toInsert = DEFAULT_SEED_PLANS.filter((p) => !existingIds.has(p.planId));
  if (toInsert.length === 0) {
    res.json({ message: "All default plans already exist", inserted: 0 });
    return;
  }
  const inserted = await db.insert(platformPlansTable).values(toInsert).returning();
  for (const plan of toInsert) {
    try {
      const features = JSON.parse(plan.features);
      await syncPlanLimitsToSettings(plan.planId, features);
    } catch {}
  }
  res.json({ message: `Seeded ${inserted.length} default plan(s)`, inserted: inserted.length });
});

router.get("/admin/plans", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const plans = await db.select().from(platformPlansTable).orderBy(platformPlansTable.createdAt);
  res.json(plans);
});

router.post("/admin/plans", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const { planId, name, price, currency, period, badge, popular, active, description, features, isAgency } = req.body ?? {};
  if (!planId || !name) { res.status(400).json({ error: "planId and name are required" }); return; }

  const existing = await db.select().from(platformPlansTable).where(eq(platformPlansTable.planId, String(planId)));
  if (existing.length > 0) {
    const [updated] = await db.update(platformPlansTable).set({
      name: String(name), price: Number(price) || 0, currency: currency ?? "NGN",
      period: period ?? "monthly", badge: badge ?? null, popular: Boolean(popular),
      active: active !== false, description: description ?? null,
      features: features ? JSON.stringify(features) : null, isAgency: Boolean(isAgency),
    }).where(eq(platformPlansTable.planId, String(planId))).returning();
    if (features) await syncPlanLimitsToSettings(String(planId), features);
    res.json(updated);
    return;
  }

  const [created] = await db.insert(platformPlansTable).values({
    planId: String(planId), name: String(name), price: Number(price) || 0,
    currency: currency ?? "NGN", period: period ?? "monthly",
    badge: badge ?? null, popular: Boolean(popular), active: active !== false,
    description: description ?? null, features: features ? JSON.stringify(features) : null,
    isAgency: Boolean(isAgency),
  }).returning();
  if (features) await syncPlanLimitsToSettings(String(planId), features);
  res.status(201).json(created);
});

router.patch("/admin/plans/:planId", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const { planId } = req.params;
  const { name, price, currency, period, badge, popular, active, description, features, isAgency } = req.body ?? {};
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = String(name);
  if (price !== undefined) updates.price = Number(price);
  if (currency !== undefined) updates.currency = currency;
  if (period !== undefined) updates.period = period;
  if (badge !== undefined) updates.badge = badge || null;
  if (popular !== undefined) updates.popular = Boolean(popular);
  if (active !== undefined) updates.active = Boolean(active);
  if (description !== undefined) updates.description = description || null;
  if (features !== undefined) updates.features = JSON.stringify(features);
  if (isAgency !== undefined) updates.isAgency = Boolean(isAgency);
  if (!Object.keys(updates).length) { res.status(400).json({ error: "No fields to update" }); return; }
  const [updated] = await db.update(platformPlansTable).set(updates).where(eq(platformPlansTable.planId, planId)).returning();
  if (!updated) { res.status(404).json({ error: "Plan not found" }); return; }
  if (features) await syncPlanLimitsToSettings(planId, features);
  res.json(updated);
});

router.delete("/admin/plans/:planId", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const { planId } = req.params;
  const deleted = await db.delete(platformPlansTable).where(eq(platformPlansTable.planId, planId)).returning({ planId: platformPlansTable.planId });
  if (!deleted.length) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json({ success: true });
});

router.get("/admin/coupons", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const rows = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
  res.json(rows);
});

router.post("/admin/coupons", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const { code, description, discountType, discountValue, maxUses, expiresAt, active, minPlanId } = req.body ?? {};
  if (!code || !discountType || discountValue === undefined) {
    res.status(400).json({ error: "code, discountType, and discountValue are required" }); return;
  }
  const [row] = await db.insert(couponsTable).values({
    code: String(code).toUpperCase().trim(),
    description: description ?? null,
    discountType,
    discountValue: Number(discountValue),
    maxUses: maxUses ? Number(maxUses) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    active: active !== false,
    minPlanId: minPlanId ?? null,
  }).returning();
  res.status(201).json(row);
});

router.patch("/admin/coupons/:id", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid coupon id" }); return; }
  const { code, description, discountType, discountValue, maxUses, expiresAt, active, minPlanId } = req.body ?? {};
  const updates: Record<string, any> = {};
  if (code !== undefined) updates.code = String(code).toUpperCase().trim();
  if (description !== undefined) updates.description = description;
  if (discountType !== undefined) updates.discountType = discountType;
  if (discountValue !== undefined) updates.discountValue = Number(discountValue);
  if (maxUses !== undefined) updates.maxUses = maxUses ? Number(maxUses) : null;
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (active !== undefined) updates.active = active;
  if (minPlanId !== undefined) updates.minPlanId = minPlanId ?? null;
  if (!Object.keys(updates).length) { res.status(400).json({ error: "No fields to update" }); return; }
  const [row] = await db.update(couponsTable).set(updates).where(eq(couponsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Coupon not found" }); return; }
  res.json(row);
});

router.delete("/admin/coupons/:id", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid coupon id" }); return; }
  const deleted = await db.delete(couponsTable).where(eq(couponsTable.id, id)).returning({ id: couponsTable.id });
  if (!deleted.length) { res.status(404).json({ error: "Coupon not found" }); return; }
  res.json({ success: true });
});

router.get("/admin/audit-logs", async (req, res): Promise<void> => {
  if (!checkAdminAuth(req, res)) return;

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const actionFilter = req.query.action as string | undefined;

  let query = db
    .select()
    .from(auditLogsTable)
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limit)
    .offset(offset);

  if (actionFilter) {
    query = db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.action, actionFilter))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(limit)
      .offset(offset);
  }

  const logs = await query;
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogsTable)
    .where(actionFilter ? eq(auditLogsTable.action, actionFilter) : undefined);

  res.json({
    logs: logs.map((l) => ({
      id: l.id,
      actor: l.actorEmail ?? l.actorSessionId ?? "System",
      action: l.action,
      targetType: l.targetType ?? "",
      targetId: l.targetId ?? "",
      ipAddress: l.ipAddress ?? "",
      metadata: l.metadata ? JSON.parse(l.metadata) : null,
      createdAt: l.createdAt.toISOString(),
    })),
    total: countResult?.count ?? 0,
  });
});

export default router;
