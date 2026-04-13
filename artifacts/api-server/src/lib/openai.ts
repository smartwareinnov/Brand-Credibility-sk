import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";
import OpenAI from "openai";

async function getOpenAiKey(): Promise<string | null> {
  try {
    const [setting] = await db
      .select({ value: platformSettingsTable.value })
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.key, "openaiApiKey"))
      .limit(1);
    return setting?.value || null;
  } catch {
    return null;
  }
}

export async function getOpenAiClient(): Promise<OpenAI | null> {
  const apiKey = await getOpenAiKey();
  if (!apiKey) {
    logger.warn("OpenAI API key not configured in platform settings");
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function chatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<string | null> {
  const client = await getOpenAiClient();
  if (!client) return null;
  try {
    const res = await client.chat.completions.create({
      model: opts.model ?? "gpt-4o-mini",
      messages,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.7,
    });
    return res.choices[0]?.message?.content ?? null;
  } catch (err) {
    logger.error({ err }, "OpenAI chat completion failed");
    return null;
  }
}

export async function generateImage(prompt: string): Promise<string | null> {
  const client = await getOpenAiClient();
  if (!client) return null;
  try {
    const res = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
    });
    return (res.data[0] as { url?: string; b64_json?: string })?.url ?? (res.data[0] as { url?: string; b64_json?: string })?.b64_json ?? null;
  } catch (err) {
    logger.error({ err }, "OpenAI image generation failed");
    return null;
  }
}
