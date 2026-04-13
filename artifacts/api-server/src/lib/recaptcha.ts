import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function isRecaptchaEnabled(): Promise<boolean> {
  const enabled = await getSetting("recaptchaEnabled");
  return enabled === "true";
}

export async function verifyRecaptcha(token: string | undefined): Promise<{ ok: boolean; error?: string }> {
  const enabled = await isRecaptchaEnabled();
  if (!enabled) return { ok: true };

  if (!token) {
    return { ok: false, error: "reCAPTCHA verification required" };
  }

  const secretKey = await getSetting("recaptchaSecretKey");
  if (!secretKey) {
    logger.error("reCAPTCHA is enabled but no secret key is configured — blocking request");
    return { ok: false, error: "Security verification is misconfigured. Please contact support." };
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
    });

    const data = await response.json() as { success: boolean; score?: number; "error-codes"?: string[] };

    if (!data.success) {
      logger.warn({ errors: data["error-codes"] }, "reCAPTCHA verification failed");
      return { ok: false, error: "reCAPTCHA verification failed. Please try again." };
    }

    if (data.score !== undefined && data.score < 0.3) {
      logger.warn({ score: data.score }, "reCAPTCHA score too low");
      return { ok: false, error: "Suspicious activity detected. Please try again." };
    }

    return { ok: true };
  } catch (err) {
    logger.error({ err }, "reCAPTCHA verification request failed");
    return { ok: false, error: "Security verification failed. Please try again." };
  }
}
