import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  userProfilesTable,
  brandProfilesTable,
  subscriptionsTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getSessionId } from "../middlewares/auth";
import {
  GetUserProfileQueryParams,
  UpdateUserProfileQueryParams,
  UpdateUserProfileBody,
  GetUserBrandProfileQueryParams,
  UpdateUserBrandProfileQueryParams,
  UpdateUserBrandProfileBody,
  GetUserSubscriptionQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/user/profile", async (req, res): Promise<void> => {
  const params = GetUserProfileQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { sessionId } = params.data;

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (existing) {
    res.json(existing);
    return;
  }

  const [created] = await db
    .insert(userProfilesTable)
    .values({ sessionId })
    .returning();

  res.json(created);
});

router.patch("/user/profile", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req) ?? (req.query.sessionId as string | undefined);
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { fullName, email, company, phone, country, timezone, bio } = req.body ?? {};

  const computedInitials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : undefined;

  const updateData: Record<string, any> = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (email !== undefined) updateData.email = email;
  if (company !== undefined) updateData.company = company;
  if (phone !== undefined) updateData.phone = phone;
  if (country !== undefined) updateData.country = country;
  if (timezone !== undefined) updateData.timezone = timezone;
  if (bio !== undefined) updateData.bio = bio;
  if (computedInitials !== undefined) updateData.avatarInitials = computedInitials;

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!existing) {
    const [created] = await db
      .insert(userProfilesTable)
      .values({ sessionId, ...updateData })
      .returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set(updateData)
    .where(eq(userProfilesTable.sessionId, sessionId))
    .returning();

  res.json(updated);
});

router.get("/user/brand-profile", async (req, res): Promise<void> => {
  const params = GetUserBrandProfileQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [profile] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.sessionId, params.data.sessionId));

  if (!profile) {
    res.status(404).json({ error: "No brand profile found" });
    return;
  }

  res.json(profile);
});

router.put("/user/brand-profile", async (req, res): Promise<void> => {
  const params = UpdateUserBrandProfileQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateUserBrandProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { sessionId } = params.data;

  const [existing] = await db
    .select()
    .from(brandProfilesTable)
    .where(eq(brandProfilesTable.sessionId, sessionId));

  const updateData = {
    brandName: body.data.brandName ?? null,
    websiteUrl: body.data.websiteUrl ?? null,
    industry: body.data.industry ?? null,
    instagramHandle: body.data.instagramHandle ?? null,
    linkedinUrl: body.data.linkedinUrl ?? null,
    twitterHandle: body.data.twitterHandle ?? null,
    facebookUrl: body.data.facebookUrl ?? null,
    youtubeUrl: body.data.youtubeUrl ?? null,
    targetAudience: body.data.targetAudience ?? null,
    brandDescription: body.data.brandDescription ?? null,
    competitor1: body.data.competitor1 ?? null,
    competitor2: body.data.competitor2 ?? null,
    competitor3: body.data.competitor3 ?? null,
  };

  if (!existing) {
    const [created] = await db
      .insert(brandProfilesTable)
      .values({ sessionId, ...updateData })
      .returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(brandProfilesTable)
    .set(updateData)
    .where(eq(brandProfilesTable.sessionId, sessionId))
    .returning();

  res.json(updated);
});

router.get("/user/subscription", async (req, res): Promise<void> => {
  const params = GetUserSubscriptionQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const email = params.data.email;

  if (!email) {
    res.json({ hasActiveSubscription: false, subscription: null, paymentHistory: [] });
    return;
  }

  const history = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.email, email))
    .orderBy(subscriptionsTable.createdAt);

  const active = history.find((s) => s.isActive);

  const now = new Date();
  const daysUntilExpiry = active?.expiresAt
    ? Math.ceil((active.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  res.json({
    hasActiveSubscription: !!active,
    subscription: active
      ? {
          id: active.id,
          planId: active.planId,
          currency: active.currency,
          status: active.status,
          isActive: active.isActive,
          autoRenew: active.autoRenew,
          expiresAt: active.expiresAt?.toISOString() ?? null,
          cancelledAt: active.cancelledAt?.toISOString() ?? null,
          createdAt: active.createdAt.toISOString(),
          daysUntilExpiry,
        }
      : null,
    paymentHistory: history.map((s) => ({
      id: s.id,
      planId: s.planId,
      currency: s.currency,
      status: s.status,
      isActive: s.isActive,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

router.patch("/user/profile/notifications", async (req, res): Promise<void> => {
  const sessionId =
    (req.headers["x-session-id"] as string)?.trim() ||
    (req.query.sessionId as string)?.trim();

  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { notificationPrefs } = req.body ?? {};

  if (notificationPrefs === undefined || notificationPrefs === null) {
    res.status(400).json({ error: "notificationPrefs is required" });
    return;
  }

  const prefsJson = typeof notificationPrefs === "string"
    ? notificationPrefs
    : JSON.stringify(notificationPrefs);

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!existing) {
    const [created] = await db
      .insert(userProfilesTable)
      .values({ sessionId, notificationPrefs: prefsJson })
      .returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set({ notificationPrefs: prefsJson })
    .where(eq(userProfilesTable.sessionId, sessionId))
    .returning();

  res.json(updated);
});

router.patch("/user/profile/bio", async (req, res): Promise<void> => {
  const sessionId =
    (req.headers["x-session-id"] as string)?.trim() ||
    (req.query.sessionId as string)?.trim();

  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { bio } = req.body ?? {};

  const [existing] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!existing) {
    const [created] = await db
      .insert(userProfilesTable)
      .values({ sessionId, bio: bio ?? null })
      .returning();
    res.json(created);
    return;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set({ bio: bio ?? null })
    .where(eq(userProfilesTable.sessionId, sessionId))
    .returning();

  res.json(updated);
});

router.post("/user/onboarding", async (req, res): Promise<void> => {
  const sessionId = req.headers["x-session-id"] as string | undefined;
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const { fullName, role, hasRunAds, companySize, yearlyRevenue, industry } = req.body ?? {};

  if (!role || !hasRunAds || !companySize || !yearlyRevenue || !industry) {
    res.status(400).json({ error: "All onboarding fields are required" });
    return;
  }

  const [updated] = await db
    .update(userProfilesTable)
    .set({
      fullName: fullName ?? undefined,
      role,
      hasRunAds,
      companySize,
      yearlyRevenue,
      industry,
      onboardingCompleted: true,
    })
    .where(eq(userProfilesTable.sessionId, sessionId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ success: true });
});

router.post("/user/profile/avatar", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { avatarUrl } = req.body ?? {};
  if (!avatarUrl || typeof avatarUrl !== "string") {
    res.status(400).json({ error: "avatarUrl is required" });
    return;
  }

  if (avatarUrl.length > 2 * 1024 * 1024) {
    res.status(413).json({ error: "Image too large. Please use an image under 1.5MB." });
    return;
  }

  const [existing] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.sessionId, sessionId));
  if (!existing) {
    const [created] = await db.insert(userProfilesTable).values({ sessionId, avatarUrl }).returning();
    res.json(created);
    return;
  }

  const [updated] = await db.update(userProfilesTable).set({ avatarUrl })
    .where(eq(userProfilesTable.sessionId, sessionId)).returning();
  res.json(updated);
});

router.post("/user/profile/change-password", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const [user] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.sessionId, sessionId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (!user.passwordHash) {
    res.status(400).json({ error: "No password set on this account. Please use the reset password flow." });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.update(userProfilesTable).set({ passwordHash: newHash }).where(eq(userProfilesTable.sessionId, sessionId));

  res.json({ success: true, message: "Password changed successfully" });
});

router.post("/user/profile/2fa/setup", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const [user] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.sessionId, sessionId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const secretObj = speakeasy.generateSecret({ name: `Skorvia:${user.email ?? user.fullName ?? "User"}`, issuer: "Skorvia", length: 20 });
  const secret = secretObj.base32;
  const otpauth = secretObj.otpauth_url ?? `otpauth://totp/Skorvia:${encodeURIComponent(user.email ?? "user")}?secret=${secret}&issuer=Skorvia`;
  const qrCode = await QRCode.toDataURL(otpauth);

  await db.update(userProfilesTable).set({ twoFactorSecret: secret, twoFactorEnabled: false })
    .where(eq(userProfilesTable.sessionId, sessionId));

  res.json({ secret, qrCode, otpauth });
});

router.post("/user/profile/2fa/enable", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  const { code } = req.body ?? {};
  if (!code) { res.status(400).json({ error: "TOTP code is required" }); return; }

  const [user] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.sessionId, sessionId));
  if (!user || !user.twoFactorSecret) {
    res.status(400).json({ error: "No 2FA setup in progress. Call /setup first." });
    return;
  }

  const isValid = speakeasy.totp.verify({ token: String(code), secret: user.twoFactorSecret, encoding: "base32", window: 1 });
  if (!isValid) { res.status(400).json({ error: "Invalid code. Please try again." }); return; }

  await db.update(userProfilesTable).set({ twoFactorEnabled: true }).where(eq(userProfilesTable.sessionId, sessionId));
  res.json({ success: true, message: "Two-factor authentication enabled" });
});

router.delete("/user/profile/2fa", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  if (!sessionId) { res.status(401).json({ error: "Authentication required" }); return; }

  await db.update(userProfilesTable)
    .set({ twoFactorEnabled: false, twoFactorSecret: null })
    .where(eq(userProfilesTable.sessionId, sessionId));

  res.json({ success: true, message: "Two-factor authentication disabled" });
});

export default router;
