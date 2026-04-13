import { Resend } from "resend";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const APP_NAME = "Skorvia";

async function getResendCredentials(): Promise<{ apiKey: string | null; from: string }> {
  try {
    const rows = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "resendApiKey"))
      .limit(1);

    const fromRows = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "resendFromEmail"))
      .limit(1);

    const apiKey = rows[0]?.value || process.env.RESEND_API_KEY || null;
    const from = fromRows[0]?.value || process.env.RESEND_FROM || `${APP_NAME} <onboarding@resend.dev>`;

    return { apiKey, from };
  } catch {
    return {
      apiKey: process.env.RESEND_API_KEY ?? null,
      from: process.env.RESEND_FROM ?? `${APP_NAME} <onboarding@resend.dev>`,
    };
  }
}

export async function sendConfirmationEmail(opts: {
  to: string;
  fullName: string;
  confirmationUrl: string;
}): Promise<{ sent: boolean; previewUrl?: string }> {
  const { to, fullName, confirmationUrl } = opts;
  const { apiKey, from } = await getResendCredentials();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px; letter-spacing: -0.5px;">${APP_NAME}</span>
        </div>
      </div>
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827;">Confirm your email address</h2>
      <p style="color: #6b7280; margin-bottom: 24px; font-size: 15px; line-height: 1.6;">Hi ${fullName}, click the button below to verify your email and activate your ${APP_NAME} account.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${confirmationUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">
          Confirm Email Address
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">This link expires in 24 hours. If you didn't sign up for ${APP_NAME}, you can safely ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  if (!apiKey) {
    logger.warn({ to, confirmationUrl }, "Resend API key not set — confirmation URL returned for dev mode");
    return { sent: false, previewUrl: confirmationUrl };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Confirm your ${APP_NAME} account`,
      html,
    });

    if (error) {
      logger.error({ error, to }, "Resend failed to send confirmation email");
      return { sent: false, previewUrl: confirmationUrl };
    }

    logger.info({ to }, "Confirmation email sent via Resend");
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, "Exception sending confirmation email via Resend");
    return { sent: false, previewUrl: confirmationUrl };
  }
}

export async function sendWelcomeEmail(opts: {
  to: string;
  fullName: string;
}): Promise<void> {
  const { to, fullName } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) return;

  const appUrl = process.env.APP_URL ?? "https://skorvia.io";

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
        </div>
      </div>
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827;">Welcome to ${APP_NAME}, ${fullName}!</h2>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">Your email is confirmed and your account is now active. Run your first brand analysis and find out if your brand is ready for paid ads.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${appUrl}/analyze" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">
          Run Your First Analysis
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `Welcome to ${APP_NAME} — you're all set!`,
      html,
    });
    logger.info({ to }, "Welcome email sent via Resend");
  } catch (err) {
    logger.error({ err, to }, "Failed to send welcome email via Resend");
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  fullName: string;
  resetUrl: string;
}): Promise<{ sent: boolean; previewUrl?: string }> {
  const { to, fullName, resetUrl } = opts;
  const { apiKey, from } = await getResendCredentials();

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px; letter-spacing: -0.5px;">${APP_NAME}</span>
        </div>
      </div>
      <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827;">Reset your password</h2>
      <p style="color: #6b7280; margin-bottom: 24px; font-size: 15px; line-height: 1.6;">Hi ${fullName}, we received a request to reset your ${APP_NAME} password. Click the button below to choose a new one.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">
          Reset Password
        </a>
      </div>
      <p style="color: #6b7280; font-size: 13px; text-align: center;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  if (!apiKey) {
    logger.warn({ to, resetUrl }, "Resend API key not set — reset URL returned for dev mode");
    return { sent: false, previewUrl: resetUrl };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html,
    });

    if (error) {
      logger.error({ error, to }, "Resend failed to send password reset email");
      return { sent: false, previewUrl: resetUrl };
    }

    logger.info({ to }, "Password reset email sent via Resend");
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, "Exception sending password reset email via Resend");
    return { sent: false, previewUrl: resetUrl };
  }
}

export async function sendSubscriptionReminderEmail(opts: {
  to: string;
  fullName: string;
  planName: string;
  expiresAt: Date;
  daysLeft: number;
  renewUrl: string;
}): Promise<{ sent: boolean }> {
  const { to, fullName, planName, expiresAt, daysLeft, renewUrl } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) return { sent: false };

  const urgency = daysLeft <= 1 ? "🚨 Last chance" : daysLeft <= 3 ? "⚠️ Expiring soon" : "📅 Renewal reminder";
  const expDateStr = expiresAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
        </div>
      </div>
      <div style="background: ${daysLeft <= 1 ? "#fef2f2" : daysLeft <= 3 ? "#fffbeb" : "#eff6ff"}; border: 1px solid ${daysLeft <= 1 ? "#fecaca" : daysLeft <= 3 ? "#fde68a" : "#bfdbfe"}; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 24px; margin: 0 0 8px;">${daysLeft <= 1 ? "🚨" : daysLeft <= 3 ? "⚠️" : "📅"}</p>
        <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 8px; color: #111827;">${urgency}: ${daysLeft <= 1 ? "Expires Today!" : `${daysLeft} Days Left`}</h2>
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Your <strong>${planName}</strong> subscription expires on ${expDateStr}</p>
      </div>
      <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hi ${fullName}, your ${APP_NAME} subscription is ${daysLeft <= 1 ? "expiring today" : `expiring in ${daysLeft} days`}. Renew now to keep access to all your brand analysis data, daily tasks, and features without interruption.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${renewUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">
          Renew My Subscription
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 13px; text-align: center;">If you have already renewed, please disregard this email. Questions? Contact our support team.</p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `${urgency}: Your ${APP_NAME} subscription ${daysLeft <= 1 ? "expires today" : `expires in ${daysLeft} days`}`,
      html,
    });
    if (error) {
      logger.error({ error, to }, "Failed to send subscription reminder email");
      return { sent: false };
    }
    logger.info({ to, daysLeft }, "Subscription reminder email sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, "Exception sending subscription reminder email");
    return { sent: false };
  }
}

export async function sendSubscriptionExpiredEmail(opts: {
  to: string;
  fullName: string;
  planName: string;
  resubscribeUrl: string;
}): Promise<{ sent: boolean }> {
  const { to, fullName, planName, resubscribeUrl } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) return { sent: false };

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
        </div>
      </div>
      <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #111827;">Your subscription has expired</h2>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hi ${fullName}, your <strong>${planName}</strong> subscription on ${APP_NAME} has expired. You've been moved to the free plan. Resubscribe to regain access to all your premium features.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resubscribeUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">
          Resubscribe Now
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject: `Your ${APP_NAME} subscription has expired`, html });
    if (error) return { sent: false };
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

export async function sendSubscriptionRenewedEmail(opts: {
  to: string;
  fullName: string;
  planName: string;
  newExpiresAt: Date;
}): Promise<{ sent: boolean }> {
  const { to, fullName, planName, newExpiresAt } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) return { sent: false };

  const expDateStr = newExpiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
        </div>
      </div>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
        <p style="font-size: 28px; margin: 0 0 8px;">✅</p>
        <h2 style="font-size: 20px; font-weight: 700; margin: 0; color: #14532d;">Subscription Renewed!</h2>
      </div>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hi ${fullName}, your <strong>${planName}</strong> subscription has been successfully renewed. Your new expiry date is <strong>${expDateStr}</strong>. Enjoy continued access to all ${APP_NAME} premium features.</p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject: `Your ${APP_NAME} subscription has been renewed`, html });
    if (error) return { sent: false };
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

export async function sendBroadcastEmail(opts: {
  to: string;
  subject: string;
  title: string;
  message: string;
}): Promise<{ sent: boolean }> {
  const { to, subject, title, message } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) {
    logger.warn({ to }, "Resend API key not set — skipping broadcast email");
    return { sent: false };
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
        </div>
      </div>
      <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #111827;">${title}</h2>
      <div style="color: #374151; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${message}</div>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      logger.error({ error, to }, "Resend failed to send broadcast email");
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, "Exception sending broadcast email");
    return { sent: false };
  }
}

export async function sendWeeklyDigestEmail(opts: {
  to: string;
  fullName: string;
  brandName: string;
  currentScore: number;
  scoreDelta: number;
  topActions: string[];
  appUrl: string;
}): Promise<{ sent: boolean }> {
  const { to, fullName, brandName, currentScore, scoreDelta, topActions, appUrl } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) return { sent: false };

  const deltaSign = scoreDelta > 0 ? "+" : "";
  const deltaColor = scoreDelta > 0 ? "#16a34a" : scoreDelta < 0 ? "#dc2626" : "#6b7280";
  const actionsHtml = topActions
    .map((a, i) => `<tr><td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; color: #374151; font-size: 14px;"><span style="background:#2563eb;color:white;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;margin-right:10px;">${i + 1}</span>${a}</td></tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
      <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
    </div>
  </div>
  <div style="background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
    <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">📊 Your Weekly Brand Report</p>
    <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #111827;">${brandName}</h2>
    <div style="display: inline-block; background: white; border-radius: 12px; padding: 16px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="font-size: 40px; font-weight: 800; color: #111827; margin: 0;">${currentScore}</p>
      <p style="font-size: 12px; color: #6b7280; margin: 0;">Brand Score</p>
      ${scoreDelta !== 0 ? `<p style="font-size: 14px; font-weight: 700; color: ${deltaColor}; margin: 4px 0 0;">${deltaSign}${scoreDelta} this week</p>` : ""}
    </div>
  </div>
  <h3 style="font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 12px;">🎯 Your Top 3 Actions This Week</h3>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    ${actionsHtml}
  </table>
  <div style="text-align: center; margin: 32px 0;">
    <a href="${appUrl}/dashboard" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">Go to Dashboard →</a>
  </div>
  <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
  <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. You're receiving this because you have a BrandReady account.</p>
</body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `📊 ${brandName} Weekly Report — Score: ${currentScore}${scoreDelta !== 0 ? ` (${deltaSign}${scoreDelta})` : ""}`,
      html,
    });
    if (error) {
      logger.error({ error, to }, "Failed to send weekly digest");
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, "Exception sending weekly digest");
    return { sent: false };
  }
}

export async function sendPlanAssignedEmail(opts: {
  to: string;
  fullName: string;
  planName: string;
  expiresAt: Date;
  assignedByAdmin?: boolean;
}): Promise<void> {
  const { to, fullName, planName, expiresAt, assignedByAdmin = true } = opts;
  const { apiKey, from } = await getResendCredentials();
  if (!apiKey) {
    logger.warn({ to, planName }, "Resend API key not set — skipping plan assigned email");
    return;
  }

  const appUrl = process.env.APP_URL ?? "https://skorvia.io";
  const formattedExpiry = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 16px; color: #1a1a1a; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #2563eb; padding: 10px 20px; border-radius: 10px;">
          <span style="color: white; font-weight: 700; font-size: 18px;">${APP_NAME}</span>
        </div>
      </div>
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
        <h2 style="font-size: 22px; font-weight: 700; margin: 0 0 8px; color: #111827;">Subscription Activated!</h2>
        <p style="color: #4b5563; margin: 0; font-size: 15px;">Your <strong>${planName}</strong> plan is now active</p>
      </div>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hi <strong>${fullName}</strong>,</p>
      <p style="color: #6b7280; font-size: 15px; line-height: 1.6;">
        ${assignedByAdmin
      ? `Great news! Your <strong>${planName}</strong> subscription has been activated by our team.`
      : `Your <strong>${planName}</strong> subscription is now active.`}
        You now have full access to all premium features on your plan.
      </p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Plan</td>
            <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${planName}</td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Status</td>
            <td style="text-align: right;"><span style="background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 99px;">Active</span></td>
          </tr>
          <tr>
            <td style="color: #6b7280; font-size: 14px; padding: 6px 0;">Expires</td>
            <td style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${formattedExpiry}</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${appUrl}/dashboard" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; font-weight: 600; padding: 14px 36px; border-radius: 8px; font-size: 15px;">
          Go to Dashboard
        </a>
      </div>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 32px 0;">
      <p style="color: #d1d5db; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </body>
    </html>
  `;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `🎉 Your ${planName} subscription is now active — ${APP_NAME}`,
      html,
    });
    logger.info({ to, planName }, "Plan assigned email sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send plan assigned email");
  }
}
