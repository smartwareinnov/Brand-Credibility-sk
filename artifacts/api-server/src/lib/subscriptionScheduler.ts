import { and, eq, isNotNull, desc, not, or, lte } from "drizzle-orm";
import { db, subscriptionsTable, notificationsTable, userProfilesTable, brandProfilesTable, analysesTable, actionTasksTable } from "@workspace/db";
import {
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiredEmail,
  sendWeeklyDigestEmail,
} from "./email";
import { logger } from "./logger";

const PLAN_NAMES: Record<string, string> = {
  "starter-monthly": "Starter Monthly",
  "growth-monthly": "Growth Monthly",
  "growth-yearly": "Growth Annual",
};

function getAppBaseUrl(): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (domain) return `https://${domain}`;
  return "https://skorvia.io";
}

async function getUserFullName(email: string): Promise<string> {
  try {
    const [profile] = await db
      .select({ fullName: userProfilesTable.fullName })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.email, email));
    return profile?.fullName ?? email.split("@")[0] ?? "there";
  } catch {
    return "there";
  }
}

async function sendInAppNotification(opts: {
  email: string;
  type: string;
  title: string;
  message: string;
}): Promise<void> {
  try {
    const [profile] = await db
      .select({ sessionId: userProfilesTable.sessionId })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.email, opts.email));

    if (!profile?.sessionId) return;

    await db.insert(notificationsTable).values({
      sessionId: profile.sessionId,
      type: opts.type,
      title: opts.title,
      message: opts.message,
    });
  } catch (err) {
    logger.error({ err, email: opts.email }, "Failed to create in-app notification");
  }
}

export async function runSubscriptionScheduler(): Promise<void> {
  logger.info("Running subscription scheduler");
  const now = new Date();

  try {
    const activeSubscriptions = await db
      .select()
      .from(subscriptionsTable)
      .where(
        and(
          eq(subscriptionsTable.isActive, true),
          isNotNull(subscriptionsTable.expiresAt)
        )
      );

    for (const sub of activeSubscriptions) {
      if (!sub.expiresAt || !sub.email) continue;

      const msLeft = sub.expiresAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const planName = PLAN_NAMES[sub.planId] ?? sub.planId;
      const baseUrl = getAppBaseUrl();
      const renewUrl = `${baseUrl}/pricing`;

      const existingReminders: number[] = (() => {
        try {
          return JSON.parse(sub.remindersSent ?? "[]");
        } catch {
          return [];
        }
      })();

      const hoursOverdue = sub.expiresAt ? (now.getTime() - sub.expiresAt.getTime()) / (1000 * 60 * 60) : 0;

      if (daysLeft <= 0) {
        const gracePeriodHours = 24;

        if (hoursOverdue >= gracePeriodHours) {
          await db
            .update(subscriptionsTable)
            .set({ isActive: false, status: "expired" })
            .where(eq(subscriptionsTable.id, sub.id));

          const fullName = await getUserFullName(sub.email);
          await sendSubscriptionExpiredEmail({
            to: sub.email,
            fullName,
            planName,
            resubscribeUrl: renewUrl,
          });
          await sendInAppNotification({
            email: sub.email,
            type: "subscription_renewal",
            title: "Subscription Expired — Downgraded to Free",
            message: `Your ${planName} subscription has expired and your account has been downgraded to the Free plan. Resubscribe to restore full access.`,
          });
          logger.info({ email: sub.email, planId: sub.planId, hoursOverdue }, "Subscription expired and downgraded after 24h grace period");
        } else {
          const hoursLeft = gracePeriodHours - hoursOverdue;
          if (!existingReminders.includes(-1)) {
            await sendInAppNotification({
              email: sub.email,
              type: "subscription_expiring",
              title: "Subscription Expired — Grace Period",
              message: `Your ${planName} subscription has expired. You have a ${gracePeriodHours}-hour grace period (${Math.ceil(hoursLeft)} hours remaining) before your account is downgraded to Free. Renew now to keep full access.`,
            });
            const updatedReminders = [...existingReminders, -1];
            await db
              .update(subscriptionsTable)
              .set({ remindersSent: JSON.stringify(updatedReminders) })
              .where(eq(subscriptionsTable.id, sub.id));
            logger.info({ email: sub.email, planId: sub.planId, hoursLeft }, "Sent grace period notification");
          }
        }
        continue;
      }

      const reminderThresholds = [7, 3, 1];
      for (const threshold of reminderThresholds) {
        if (daysLeft <= threshold && !existingReminders.includes(threshold)) {
          const fullName = await getUserFullName(sub.email);

          await sendSubscriptionReminderEmail({
            to: sub.email,
            fullName,
            planName,
            expiresAt: sub.expiresAt,
            daysLeft,
            renewUrl,
          });

          await sendInAppNotification({
            email: sub.email,
            type: "subscription_expiring",
            title: `Subscription Expiring ${daysLeft <= 1 ? "Today" : `in ${daysLeft} Days`}`,
            message: `Your ${planName} subscription ${daysLeft <= 1 ? "expires today" : `expires in ${daysLeft} days`}. Renew now to keep your access.`,
          });

          const updatedReminders = [...existingReminders, threshold];
          await db
            .update(subscriptionsTable)
            .set({ remindersSent: JSON.stringify(updatedReminders) })
            .where(eq(subscriptionsTable.id, sub.id));

          logger.info({ email: sub.email, daysLeft, threshold }, "Subscription reminder sent");
          break;
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Subscription scheduler error");
  }
}

async function runWeeklyDigestScheduler(): Promise<void> {
  const now = new Date();
  if (now.getDay() !== 1) return;
  if (now.getHours() < 7 || now.getHours() > 9) return;

  logger.info("Running weekly digest scheduler");
  const appUrl = getAppBaseUrl();

  try {
    const profiles = await db.select().from(userProfilesTable)
      .where(and(eq(userProfilesTable.emailConfirmed, true)));

    for (const profile of profiles) {
      if (!profile.email) continue;
      try {
        const [brand] = await db.select().from(brandProfilesTable)
          .where(eq(brandProfilesTable.sessionId, profile.sessionId)).limit(1);
        if (!brand) continue;

        const [latestAnalysis] = await db.select().from(analysesTable)
          .where(and(eq(analysesTable.sessionId, profile.sessionId), eq(analysesTable.status, "completed")))
          .orderBy(desc(analysesTable.createdAt)).limit(1);
        if (!latestAnalysis?.overallScore) continue;

        const notifPrefs = (() => {
          try { return JSON.parse(profile.notificationPrefs ?? "{}"); } catch { return {}; }
        })();
        if (notifPrefs.weeklyDigest === false) continue;

        const currentScore = Math.round(latestAnalysis.overallScore);

        // Calculate real score delta vs previous analysis
        const [previousAnalysis] = await db.select().from(analysesTable)
          .where(and(eq(analysesTable.sessionId, profile.sessionId), eq(analysesTable.status, "completed")))
          .orderBy(desc(analysesTable.createdAt)).limit(1).offset(1);
        const scoreDelta = previousAnalysis?.overallScore
          ? Math.round(latestAnalysis.overallScore - previousAnalysis.overallScore)
          : 0;

        // Get top 3 pending tasks as weekly actions
        const pendingTasks = await db.select({ title: actionTasksTable.title })
          .from(actionTasksTable)
          .where(and(eq(actionTasksTable.analysisId, latestAnalysis.id), eq(actionTasksTable.isCompleted, false)))
          .orderBy(actionTasksTable.priority)
          .limit(3);
        const topActions = pendingTasks.length > 0
          ? pendingTasks.map(t => t.title)
          : ["Review your lowest-scoring brand area", "Collect 2 new customer reviews", "Post on your primary social platform"];

        await sendWeeklyDigestEmail({
          to: profile.email,
          fullName: profile.fullName ?? profile.email.split("@")[0],
          brandName: brand.brandName ?? "Your Brand",
          currentScore,
          scoreDelta,
          topActions,
          appUrl,
        });
        logger.info({ email: profile.email }, "Weekly digest sent");
      } catch (err) {
        logger.error({ err, email: profile.email }, "Failed to send weekly digest for user");
      }
    }
  } catch (err) {
    logger.error({ err }, "Weekly digest scheduler error");
  }
}

export function startSubscriptionScheduler(): void {
  const INTERVAL_MS = 60 * 60 * 1000;

  runSubscriptionScheduler().catch((err) => {
    logger.error({ err }, "Initial subscription scheduler run failed");
  });

  setInterval(() => {
    runSubscriptionScheduler().catch((err) => {
      logger.error({ err }, "Subscription scheduler interval run failed");
    });
    runWeeklyDigestScheduler().catch((err) => {
      logger.error({ err }, "Weekly digest scheduler interval run failed");
    });
  }, INTERVAL_MS);

  logger.info({ intervalHours: 1 }, "Subscription scheduler started");
}
