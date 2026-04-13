import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, subscriptionsTable, userProfilesTable, notificationsTable, platformPlansTable, couponsTable, platformSettingsTable } from "@workspace/db";
import {
  InitiatePaymentBody,
  VerifyPaymentBody,
} from "@workspace/api-zod";
import {
  detectCurrencyFromIp,
  getPricingForCurrency,
} from "../lib/currency";

const FLUTTERWAVE_SUPPORTED = new Set([
  "NGN","USD","EUR","GBP","GHS","ZAR","KES","XOF","XAF","TZS","UGX","RWF","ZMW","MWK","ETB","EGP","SLL",
]);

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD:"$",EUR:"€",GBP:"£",NGN:"₦",GHS:"₵",ZAR:"R",KES:"KSh",TZS:"TSh",UGX:"USh",
  RWF:"Fr",XOF:"CFA",XAF:"FCFA",ZMW:"ZK",CAD:"CA$",AUD:"A$",INR:"₹",BRL:"R$",
  MXN:"MX$",CHF:"CHF",SEK:"kr",NOK:"kr",DKK:"kr",EGP:"E£",MWK:"MK",ETB:"Br",SLL:"Le",
};

// Hardcoded fallback rates (NGN → target currency)
const NGN_EXCHANGE_FALLBACK: Record<string, number> = {
  USD:0.00065,EUR:0.00060,GBP:0.00052,GHS:0.0086,ZAR:0.012,KES:0.085,TZS:1.67,
  UGX:2.4,RWF:0.87,XOF:0.39,XAF:0.39,ZMW:0.017,CAD:0.00089,AUD:0.0010,
  INR:0.054,BRL:0.0033,MXN:0.011,CHF:0.00059,SEK:0.0068,NOK:0.0069,DKK:0.0045,
  EGP:0.031,MWK:1.13,ETB:0.076,SLL:13.5,
};

// DB setting key → currency code mapping
const FX_SETTING_KEYS: Record<string, string> = {
  fxRateNGN: "NGN", fxRateGHS: "GHS", fxRateKES: "KES",
  fxRateZAR: "ZAR", fxRateGBP: "GBP", fxRateEUR: "EUR",
};

// Cache DB FX rates for 5 minutes to avoid per-request DB hits
let fxRateCache: { rates: Record<string, number>; fetchedAt: number } | null = null;

async function getDbFxRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (fxRateCache && now - fxRateCache.fetchedAt < 5 * 60 * 1000) {
    return fxRateCache.rates;
  }
  try {
    const rows = await db.select().from(platformSettingsTable);
    const rates: Record<string, number> = {};
    for (const row of rows) {
      const currency = FX_SETTING_KEYS[row.key];
      if (currency && row.value) {
        // DB stores rates as "units per 1 USD" (e.g. NGN=1580)
        // We need NGN→target, so rate = 1 / (NGN_per_USD / target_per_USD)
        // But the admin stores "target per 1 USD", so NGN→target = target_per_USD / NGN_per_USD
        // We'll store them as-is and compute in convertFromNGN
        const parsed = parseFloat(row.value);
        if (!isNaN(parsed) && parsed > 0) rates[currency] = parsed;
      }
    }
    fxRateCache = { rates, fetchedAt: now };
    return rates;
  } catch {
    return {};
  }
}

async function convertFromNGN(amountNGN: number, targetCurrency: string): Promise<number> {
  if (targetCurrency === "NGN") return amountNGN;

  const dbRates = await getDbFxRates();

  // DB rates are stored as "X units of currency per 1 USD"
  // To convert NGN → target: (amountNGN / NGN_per_USD) * target_per_USD
  const ngnPerUsd = dbRates["NGN"] ?? (1 / (NGN_EXCHANGE_FALLBACK["USD"] ?? 0.00065));
  const targetPerUsd = dbRates[targetCurrency];

  let rate: number;
  if (targetPerUsd && ngnPerUsd) {
    // Both rates available from DB
    rate = targetPerUsd / ngnPerUsd;
  } else {
    // Fall back to hardcoded NGN→target rates
    rate = NGN_EXCHANGE_FALLBACK[targetCurrency] ?? (NGN_EXCHANGE_FALLBACK["USD"] ?? 0.00065);
  }

  const converted = amountNGN * rate;
  return targetCurrency === "USD" || targetCurrency === "EUR" || targetCurrency === "GBP" || targetCurrency === "CHF"
    ? Math.round(converted * 100) / 100
    : Math.round(converted);
}

async function getFlutterwaveKey(): Promise<string | null> {
  // First check process.env (set at startup or by admin save)
  if (process.env.FLUTTERWAVE_SECRET_KEY) return process.env.FLUTTERWAVE_SECRET_KEY;
  // Fall back to DB (handles server restarts)
  try {
    const [row] = await db
      .select({ value: platformSettingsTable.value })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "flutterwaveSecretKey"))
      .limit(1);
    if (row?.value) {
      process.env.FLUTTERWAVE_SECRET_KEY = row.value; // cache in env for subsequent calls
      return row.value;
    }
  } catch {}
  return null;
}

function getEffectiveCurrency(requestedCurrency: string): string {
  const upper = requestedCurrency.toUpperCase();
  return FLUTTERWAVE_SUPPORTED.has(upper) ? upper : "USD";
}

const router: IRouter = Router();

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  currencySymbol: string;
  interval: string;
  features: string[];
  isPopular: boolean;
}

function buildPlans(currency: string, currencySymbol: string): SubscriptionPlan[] {
  const pricing = getPricingForCurrency(currency);
  return [
    {
      id: "starter-monthly",
      name: "Starter",
      description: "Perfect for solopreneurs validating their brand",
      price: Math.round(pricing.monthly * 0.5),
      currency,
      currencySymbol,
      interval: "monthly",
      features: [
        "1 brand analysis per month",
        "Ad readiness score",
        "Basic action plan (10 tasks)",
        "Competitor comparison (up to 2)",
        "Email support",
      ],
      isPopular: false,
    },
    {
      id: "growth-monthly",
      name: "Growth",
      description: "For founders ready to scale their online presence",
      price: pricing.monthly,
      currency,
      currencySymbol,
      interval: "monthly",
      features: [
        "5 brand analyses per month",
        "Full Ad Readiness Score breakdown",
        "Complete action plan (unlimited tasks)",
        "Daily personalized tasks",
        "Competitor analysis (up to 3)",
        "SEO & content recommendations",
        "Priority email support",
      ],
      isPopular: true,
    },
    {
      id: "growth-yearly",
      name: "Growth (Annual)",
      description: "Save 30% with an annual plan",
      price: pricing.yearly,
      currency,
      currencySymbol,
      interval: "yearly",
      features: [
        "Unlimited brand analyses",
        "Full Ad Readiness Score breakdown",
        "Complete action plan (unlimited tasks)",
        "Daily personalized tasks (365 days)",
        "Competitor analysis (unlimited)",
        "SEO & content recommendations",
        "Google & Trustpilot review tracking",
        "Brand mention monitoring",
        "Dedicated support",
      ],
      isPopular: false,
    },
  ];
}

router.get("/subscriptions/plans", async (req, res): Promise<void> => {
  const rawCurrency = (req.query.currency as string) || "NGN";
  const period = (req.query.period as string) || "monthly";
  const effectiveCurrency = getEffectiveCurrency(rawCurrency);
  const symbol = CURRENCY_SYMBOLS[effectiveCurrency] ?? "$";

  const dbPlans = await db.select().from(platformPlansTable)
    .where(eq(platformPlansTable.active, true))
    .orderBy(platformPlansTable.createdAt);

  if (dbPlans.length > 0) {
    const mapped = await Promise.all(dbPlans.map(async (p) => {
      let features: { text: string; included: boolean; limit?: number | null }[] = [];
      try { features = JSON.parse(p.features ?? "[]"); } catch {}
      const basePrice = await convertFromNGN(p.price, effectiveCurrency);
      const isYearlyPlan = p.period === "year" || p.period === "yearly";
      const displayPrice = (period === "yearly" && !isYearlyPlan)
        ? Math.round(basePrice * 12 * 0.9 * 100) / 100
        : basePrice;
      const QUANTIFIABLE = new Set(["Brand analyses", "Competitor analysis", "Competitor Ads Intelligence", "Brand mention monitoring"]);
      const featureLabels = features.filter((f) => f.included).map((f) => {
        if (QUANTIFIABLE.has(f.text) && f.limit !== null && f.limit !== undefined) {
          const limitLabel = f.limit === 0 ? "Unlimited" : `Up to ${f.limit}/month`;
          return `${f.text} (${limitLabel})`;
        }
        return f.text;
      });
      return {
        id: p.planId,
        name: p.name,
        description: p.description ?? "",
        price: displayPrice,
        currency: effectiveCurrency,
        currencySymbol: symbol,
        interval: (period === "yearly" && !isYearlyPlan) ? "yearly" : (isYearlyPlan ? "yearly" : "monthly"),
        features: featureLabels,
        allFeatures: features,
        isPopular: p.popular ?? false,
        badge: p.badge ?? null,
        isAgency: p.isAgency ?? false,
        priceNGN: p.price,
      };
    }));
    res.json(mapped);
    return;
  }

  const plans = buildPlans(effectiveCurrency, symbol);
  res.json(plans.filter((p) => period === "yearly" ? p.interval === "yearly" : p.interval === "monthly"));
});

router.post("/subscriptions/validate-coupon", async (req, res): Promise<void> => {
  const { code, planId } = req.body ?? {};
  if (!code) { res.status(400).json({ error: "Coupon code is required" }); return; }

  const [coupon] = await db.select().from(couponsTable)
    .where(eq(couponsTable.code, String(code).toUpperCase()));

  if (!coupon || !coupon.active) {
    res.status(404).json({ error: "Invalid or expired coupon code" });
    return;
  }
  if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
    res.status(400).json({ error: "This coupon has expired" });
    return;
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    res.status(400).json({ error: "This coupon has reached its usage limit" });
    return;
  }

  res.json({
    valid: true,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    description: coupon.description,
  });
});

router.get("/subscriptions/detect-currency", async (req, res): Promise<void> => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "127.0.0.1";
  const info = await detectCurrencyFromIp(ip);
  res.json(info);
});

router.post("/subscriptions/initiate-payment", async (req, res): Promise<void> => {
  const parsed = InitiatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const flutterwaveKey = await getFlutterwaveKey();
  const txRef = `skorvia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rawCurrency = parsed.data.currency;
  const effectiveCurrency = getEffectiveCurrency(rawCurrency);

  const planId = parsed.data.planId;
  const period = (req.body.period as string) || "monthly";
  const couponCode = (req.body.couponCode as string | undefined)?.trim().toUpperCase();

  const dbPlan = await db.select().from(platformPlansTable).where(eq(platformPlansTable.planId, planId)).then((r) => r[0]);

  let amount: number;
  if (dbPlan) {
    let baseNGN = dbPlan.price;
    if (period === "yearly") baseNGN = baseNGN * 12 * 0.9;
    amount = await convertFromNGN(baseNGN, effectiveCurrency);
  } else {
    const pricing = getPricingForCurrency(effectiveCurrency);
    const isYearly = planId.includes("yearly") || period === "yearly";
    amount = isYearly ? pricing.yearly : pricing.monthly;
  }

  let appliedCoupon: typeof couponsTable.$inferSelect | null = null;
  if (couponCode) {
    const [c] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode));
    if (c && c.active && (!c.expiresAt || new Date() < new Date(c.expiresAt)) && (!c.maxUses || c.usedCount < c.maxUses)) {
      appliedCoupon = c;
      if (c.discountType === "percentage") {
        amount = amount * (1 - c.discountValue / 100);
      } else {
        amount = Math.max(0, amount - await convertFromNGN(c.discountValue, effectiveCurrency));
      }
      amount = Math.round(amount * 100) / 100;
    }
  }

  if (!flutterwaveKey) {
    const mockPaymentLink = `${parsed.data.redirectUrl}?status=successful&tx_ref=${txRef}&transaction_id=mock_${Date.now()}`;
    const [subscription] = await db
      .insert(subscriptionsTable)
      .values({
        email: parsed.data.email,
        planId: parsed.data.planId,
        currency: effectiveCurrency,
        txRef,
        status: "pending",
        isActive: false,
      })
      .returning();
    if (appliedCoupon) {
      await db.update(couponsTable).set({ usedCount: appliedCoupon.usedCount + 1 }).where(eq(couponsTable.id, appliedCoupon.id));
    }
    req.log.warn({ subscriptionId: subscription.id }, "Flutterwave key not set — using mock payment");
    res.json({ paymentLink: mockPaymentLink, txRef, discountApplied: appliedCoupon ? { code: appliedCoupon.code, discountType: appliedCoupon.discountType, discountValue: appliedCoupon.discountValue } : null });
    return;
  }

  const payload = {
    tx_ref: txRef,
    amount,
    currency: effectiveCurrency,
    redirect_url: parsed.data.redirectUrl,
    customer: {
      email: parsed.data.email,
      name: parsed.data.name,
    },
    customizations: {
      title: "Skorvia Subscription",
      description: `Subscribe to Skorvia ${planId}`,
    },
  };

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${flutterwaveKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    req.log.error({ status: response.status }, "Flutterwave payment initiation failed");
    res.status(400).json({ error: "Payment initiation failed" });
    return;
  }

  const data = await response.json() as { data?: { link?: string } };
  const paymentLink = data.data?.link;

  if (!paymentLink) {
    res.status(400).json({ error: "No payment link returned" });
    return;
  }

  await db.insert(subscriptionsTable).values({
    email: parsed.data.email,
    planId: parsed.data.planId,
    currency: effectiveCurrency,
    txRef,
    status: "pending",
    isActive: false,
  });

  if (appliedCoupon) {
    await db.update(couponsTable).set({ usedCount: appliedCoupon.usedCount + 1 }).where(eq(couponsTable.id, appliedCoupon.id));
  }

  res.json({ paymentLink, txRef });
});

router.post("/subscriptions/verify-payment", async (req, res): Promise<void> => {
  const parsed = VerifyPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const flutterwaveKey = await getFlutterwaveKey();

  if (!flutterwaveKey) {
    const [pendingSubMock] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.txRef, parsed.data.txRef ?? ""))
      .limit(1);

    const isYearlyMock = pendingSubMock?.planId?.includes("yearly") ?? false;
    const expiryDaysMock = isYearlyMock ? 365 : 30;

    const [subscription] = await db
      .update(subscriptionsTable)
      .set({
        transactionId: parsed.data.transactionId,
        status: "successful",
        isActive: true,
        expiresAt: new Date(Date.now() + expiryDaysMock * 24 * 60 * 60 * 1000),
      })
      .where(eq(subscriptionsTable.txRef, parsed.data.txRef ?? ""))
      .returning();

    res.json({
      success: true,
      planId: subscription?.planId ?? "",
      subscriptionId: subscription?.id,
      message: "Subscription activated successfully",
    });
    return;
  }

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${parsed.data.transactionId}/verify`,
    {
      headers: { Authorization: `Bearer ${flutterwaveKey}` },
    }
  );

  if (!response.ok) {
    res.status(400).json({ error: "Payment verification failed" });
    return;
  }

  const data = await response.json() as {
    data?: { status?: string; tx_ref?: string };
  };

  if (data.data?.status !== "successful") {
    res.json({ success: false, message: "Payment was not successful" });
    return;
  }

  const [pendingSubReal] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.txRef, data.data.tx_ref ?? parsed.data.txRef ?? ""))
    .limit(1);

  const isYearlyPlan = pendingSubReal?.planId?.includes("yearly") ?? false;
  const expiryDaysReal = isYearlyPlan ? 365 : 30;

  const [subscription] = await db
    .update(subscriptionsTable)
    .set({
      transactionId: parsed.data.transactionId,
      status: "successful",
      isActive: true,
      expiresAt: new Date(Date.now() + expiryDaysReal * 24 * 60 * 60 * 1000),
    })
    .where(eq(subscriptionsTable.txRef, data.data.tx_ref ?? parsed.data.txRef ?? ""))
    .returning();

  res.json({
    success: true,
    planId: subscription?.planId ?? "",
    subscriptionId: subscription?.id,
    message: "Subscription activated successfully",
  });
});

router.get("/subscriptions/manage", async (req, res): Promise<void> => {
  const sessionId = (req.headers["x-session-id"] as string)?.trim();
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!profile?.email) {
    res.json({ hasActiveSubscription: false, subscription: null, paymentHistory: [] });
    return;
  }

  const history = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, profile.email), eq(subscriptionsTable.status, "successful")))
    .orderBy(desc(subscriptionsTable.createdAt));

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

router.post("/subscriptions/cancel", async (req, res): Promise<void> => {
  const sessionId = (req.headers["x-session-id"] as string)?.trim();
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!profile?.email) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [active] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, profile.email), eq(subscriptionsTable.isActive, true)));

  if (!active) {
    res.status(404).json({ error: "No active subscription found" });
    return;
  }

  await db
    .update(subscriptionsTable)
    .set({ autoRenew: false, cancelledAt: new Date() })
    .where(eq(subscriptionsTable.id, active.id));

  await db.insert(notificationsTable).values({
    sessionId,
    type: "subscription_renewal",
    title: "Subscription Cancellation Scheduled",
    message: `Your subscription has been set to cancel at the end of the billing period (${active.expiresAt ? new Date(active.expiresAt).toLocaleDateString() : "your renewal date"}). You'll keep access until then.`,
  });

  res.json({ success: true, message: "Subscription will not renew at period end" });
});

router.post("/subscriptions/reactivate", async (req, res): Promise<void> => {
  const sessionId = (req.headers["x-session-id"] as string)?.trim();
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!profile?.email) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [active] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, profile.email), eq(subscriptionsTable.isActive, true)));

  if (!active) {
    res.status(404).json({ error: "No active subscription found" });
    return;
  }

  await db
    .update(subscriptionsTable)
    .set({ autoRenew: true, cancelledAt: null })
    .where(eq(subscriptionsTable.id, active.id));

  await db.insert(notificationsTable).values({
    sessionId,
    type: "subscription_renewal",
    title: "Subscription Reactivated",
    message: "Your subscription cancellation has been reversed. Your subscription will renew automatically.",
  });

  res.json({ success: true, message: "Subscription reactivated successfully" });
});

router.patch("/subscriptions/auto-renew", async (req, res): Promise<void> => {
  const sessionId = (req.headers["x-session-id"] as string)?.trim();
  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { autoRenew } = req.body ?? {};
  if (typeof autoRenew !== "boolean") {
    res.status(400).json({ error: "autoRenew must be a boolean" });
    return;
  }

  const [profile] = await db
    .select()
    .from(userProfilesTable)
    .where(eq(userProfilesTable.sessionId, sessionId));

  if (!profile?.email) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [active] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.email, profile.email), eq(subscriptionsTable.isActive, true)));

  if (!active) {
    res.status(404).json({ error: "No active subscription found" });
    return;
  }

  await db
    .update(subscriptionsTable)
    .set({
      autoRenew,
      cancelledAt: autoRenew ? null : new Date(),
    })
    .where(eq(subscriptionsTable.id, active.id));

  res.json({ success: true, autoRenew });
});

export default router;
