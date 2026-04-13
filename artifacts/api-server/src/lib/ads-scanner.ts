import { db, platformSettingsTable, competitorAdsScansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { MetaAd, GoogleAd } from "@workspace/db";
import { chatCompletion } from "./openai";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: platformSettingsTable.value })
    .from(platformSettingsTable)
    .where(eq(platformSettingsTable.key, key))
    .limit(1);
  return row?.value ?? null;
}

function computeActivityScore(adsCount: number): { score: number; label: string } {
  if (adsCount === 0) return { score: 0, label: "Not Running Ads" };
  if (adsCount <= 3) return { score: Math.round(25 + adsCount * 5), label: "Testing Ads" };
  if (adsCount <= 10) return { score: Math.round(50 + (adsCount - 3) * 4), label: "Actively Running Ads" };
  return { score: Math.min(95, Math.round(78 + (adsCount - 10) * 1.5)), label: "Aggressively Running Ads" };
}

export async function scanMetaAds(competitorName: string): Promise<{
  ads: MetaAd[];
  activityScore: number;
  activityLabel: string;
  enabled: boolean;
}> {
  const token = await getSetting("metaAdsToken");
  if (!token) {
    return { ads: [], activityScore: 0, activityLabel: "Not Running Ads", enabled: false };
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
      search_terms: competitorName,
      ad_reached_countries: '["US"]',
      fields: "id,status,ad_creative_bodies,ad_creative_link_titles,ad_delivery_start_time,publisher_platforms,ad_snapshot_url,page_id,page_name",
      limit: "25",
    });

    const url = `https://graph.facebook.com/v20.0/ads_archive?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const json = await res.json() as {
      data?: Array<{
        id: string;
        status?: string;
        ad_creative_bodies?: string[];
        ad_creative_link_titles?: string[];
        ad_delivery_start_time?: string;
        publisher_platforms?: string[];
        ad_snapshot_url?: string;
        page_id?: string;
        page_name?: string;
      }>;
      error?: { message: string };
    };

    if (json.error) {
      console.error("[AdsScanner] Meta API error:", json.error.message);
      return { ads: [], activityScore: 0, activityLabel: "Not Running Ads", enabled: true };
    }

    const ads: MetaAd[] = (json.data ?? []).map((item) => ({
      id: item.id,
      status: item.status,
      adCreativeBodies: item.ad_creative_bodies,
      adCreativeLinkTitles: item.ad_creative_link_titles,
      adDeliveryStartTime: item.ad_delivery_start_time,
      publisherPlatforms: item.publisher_platforms,
      adSnapshotUrl: item.ad_snapshot_url,
      pageId: item.page_id,
      pageName: item.page_name,
    }));

    const { score, label } = computeActivityScore(ads.length);
    return { ads, activityScore: score, activityLabel: label, enabled: true };
  } catch (err) {
    console.error("[AdsScanner] Meta scan failed:", err);
    return { ads: [], activityScore: 0, activityLabel: "Not Running Ads", enabled: true };
  }
}

export async function scanGoogleAds(competitorName: string, website?: string | null): Promise<{
  ads: GoogleAd[];
  activityScore: number;
  activityLabel: string;
  enabled: boolean;
}> {
  const apiKey = await getSetting("serpApiKey");
  if (!apiKey) {
    return { ads: [], activityScore: 0, activityLabel: "Not Running Ads", enabled: false };
  }

  try {
    const queries = [competitorName];
    if (website) {
      const domain = website.replace(/^https?:\/\//, "").split("/")[0];
      if (domain) queries.push(`site:${domain}`);
    }

    const allAds: GoogleAd[] = [];
    const seenTitles = new Set<string>();

    for (const q of queries) {
      const params = new URLSearchParams({
        api_key: apiKey,
        engine: "google",
        q,
        num: "10",
        gl: "us",
      });

      const res = await fetch(`https://serpapi.com/search.json?${params.toString()}`, {
        signal: AbortSignal.timeout(15000),
      });
      const json = await res.json() as {
        ads_results?: Array<{
          position?: number;
          block_position?: string;
          title: string;
          link?: string;
          displayed_link?: string;
          description?: string;
          tracking_link?: string;
        }>;
        error?: string;
      };

      if (json.error) {
        console.error("[AdsScanner] SerpApi error:", json.error);
        continue;
      }

      for (const ad of json.ads_results ?? []) {
        if (!seenTitles.has(ad.title)) {
          seenTitles.add(ad.title);
          allAds.push({
            position: ad.position,
            block_position: ad.block_position,
            title: ad.title,
            link: ad.link,
            displayed_link: ad.displayed_link,
            description: ad.description,
            tracking_link: ad.tracking_link,
          });
        }
      }
    }

    const { score, label } = computeActivityScore(allAds.length);
    return { ads: allAds, activityScore: score, activityLabel: label, enabled: true };
  } catch (err) {
    console.error("[AdsScanner] Google scan failed:", err);
    return { ads: [], activityScore: 0, activityLabel: "Not Running Ads", enabled: true };
  }
}

export async function generateAdsInsights(params: {
  competitorName: string;
  metaAds: MetaAd[];
  googleAds: GoogleAd[];
  overallScore: number;
  activityLabel: string;
}): Promise<{
  summary: string;
  metaInsights: string[];
  googleInsights: string[];
  recommendations: string[];
  competitivePosition: string;
}> {
  const { competitorName, metaAds, googleAds, overallScore, activityLabel } = params;

  try {
      const metaSummary = metaAds.length > 0
        ? `Running ${metaAds.length} active Meta ads. Platforms: ${[...new Set(metaAds.flatMap(a => a.publisherPlatforms ?? []))].join(", ") || "unknown"}. Sample copy: "${metaAds[0]?.adCreativeBodies?.[0]?.slice(0, 120) ?? "N/A"}"`
        : "No Meta ads detected.";

      const googleSummary = googleAds.length > 0
        ? `Running ${googleAds.length} Google ads. Sample headline: "${googleAds[0]?.title?.slice(0, 100) ?? "N/A"}". Description: "${googleAds[0]?.description?.slice(0, 120) ?? "N/A"}"`
        : "No Google ads detected.";

      const prompt = `You are a competitive advertising intelligence expert. Analyze the following ad data for competitor "${competitorName}" and generate actionable insights.

Competitor Meta Ads Summary: ${metaSummary}
Competitor Google Ads Summary: ${googleSummary}
Overall Ads Activity Score: ${overallScore}/100 (${activityLabel})

Generate a JSON response with exactly this structure:
{
  "summary": "2-3 sentence overview of their advertising strategy and intensity",
  "metaInsights": ["insight 1", "insight 2", "insight 3"],
  "googleInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"],
  "competitivePosition": "1 sentence describing how the user should position relative to this competitor's ad spend"
}

Keep insights specific, data-driven, and actionable. Recommendations should tell the user what to do NOW.`;

      const content = await chatCompletion(
        [{ role: "user", content: prompt }],
        { maxTokens: 700, temperature: 0.4 }
      );

      if (content) {
        const parsed = JSON.parse(content.replace(/```json|```/g, "").trim()) as {
          summary?: string;
          metaInsights?: string[];
          googleInsights?: string[];
          recommendations?: string[];
          competitivePosition?: string;
        };
        return {
          summary: parsed.summary ?? "",
          metaInsights: parsed.metaInsights ?? [],
          googleInsights: parsed.googleInsights ?? [],
          recommendations: parsed.recommendations ?? [],
          competitivePosition: parsed.competitivePosition ?? "",
        };
      }
    } catch (err) {
      console.error("[AdsScanner] OpenAI insights failed:", err);
    }

  return generateFallbackInsights({ competitorName, metaAds, googleAds, overallScore, activityLabel });
}

function generateFallbackInsights(params: {
  competitorName: string;
  metaAds: MetaAd[];
  googleAds: GoogleAd[];
  overallScore: number;
  activityLabel: string;
}): {
  summary: string;
  metaInsights: string[];
  googleInsights: string[];
  recommendations: string[];
  competitivePosition: string;
} {
  const { competitorName, metaAds, googleAds, overallScore, activityLabel } = params;
  const isActive = overallScore > 40;
  const metaPlatforms = [...new Set(metaAds.flatMap(a => a.publisherPlatforms ?? []))];

  const summary = metaAds.length === 0 && googleAds.length === 0
    ? `${competitorName} does not appear to be running active paid ads at this time. This could be an opportunity to gain visibility in paid channels.`
    : `${competitorName} is ${activityLabel.toLowerCase()} with ${metaAds.length} Meta ad${metaAds.length !== 1 ? "s" : ""} and ${googleAds.length} Google ad${googleAds.length !== 1 ? "s" : ""} detected. Activity score: ${overallScore}/100.`;

  const metaInsights = metaAds.length > 0
    ? [
        `${competitorName} is running ${metaAds.length} active ads across ${metaPlatforms.join(" and ") || "Meta platforms"}`,
        metaAds[0]?.adDeliveryStartTime
          ? `Their oldest detected ad started running on ${new Date(metaAds[0].adDeliveryStartTime).toLocaleDateString()}`
          : "Ad start dates suggest ongoing investment in Meta advertising",
        "They are investing in paid social, indicating confidence in their audience targeting",
      ]
    : [
        `No active Meta ads detected for ${competitorName}`,
        "This may indicate they rely on organic social reach",
        "An opportunity exists to establish paid presence before they do",
      ];

  const googleInsights = googleAds.length > 0
    ? [
        `${competitorName} is bidding on ${googleAds.length} search keyword position${googleAds.length !== 1 ? "s" : ""}`,
        googleAds[0]?.description ? `Their ad messaging: "${googleAds[0].description.slice(0, 100)}"` : "They are targeting commercial intent keywords",
        "Appearing in Google Search Ads suggests they are actively pursuing high-intent customers",
      ]
    : [
        `No Google Search Ads detected for ${competitorName}`,
        "They may not be targeting search intent traffic with paid ads",
        "There may be an opportunity to capture their potential search audience",
      ];

  const recommendations = isActive
    ? [
        "Build your brand authority score to at least 60 before launching competing ads",
        "Study their ad creative angles and identify gaps in messaging to differentiate",
        "Start with a smaller budget test on the channels they are NOT using",
        "Focus on organic content strategy first to reduce your cost-per-acquisition",
      ]
    : [
        "This competitor is not running ads — an opportunity to capture their audience",
        "Consider launching a small test campaign targeting their brand keywords",
        "Build your content library now to support future paid campaigns",
        "Monitor their ad activity monthly — they may increase spend soon",
      ];

  const competitivePosition = isActive
    ? `${competitorName} has an active paid media presence; strengthen your brand authority before competing directly in paid channels.`
    : `${competitorName} is not aggressively advertising; now is a good time to test paid campaigns in this space.`;

  return { summary, metaInsights, googleInsights, recommendations, competitivePosition };
}

export async function runFullAdsScan(params: {
  sessionId: string;
  competitorId: number;
  competitorName: string;
  competitorWebsite?: string | null;
}): Promise<CompetitorAdsScan> {
  const { sessionId, competitorId, competitorName, competitorWebsite } = params;

  const [metaResult, googleResult] = await Promise.all([
    scanMetaAds(competitorName),
    scanGoogleAds(competitorName, competitorWebsite),
  ]);

  const overallScore = Math.round(
    (metaResult.activityScore + googleResult.activityScore) / 2
  );

  const { score: _s, label: overallLabel } = (() => {
    const total = metaResult.ads.length + googleResult.ads.length;
    return computeActivityScore(total);
  })();

  const aiInsights = await generateAdsInsights({
    competitorName,
    metaAds: metaResult.ads,
    googleAds: googleResult.ads,
    overallScore,
    activityLabel: overallLabel,
  });

  const now = new Date();

  await db
    .delete(competitorAdsScansTable)
    .where(eq(competitorAdsScansTable.competitorId, competitorId));

  const [inserted] = await db
    .insert(competitorAdsScansTable)
    .values({
      sessionId,
      competitorId,
      competitorName,
      metaAds: metaResult.ads,
      googleAds: googleResult.ads,
      metaActivityScore: metaResult.activityScore,
      googleActivityScore: googleResult.activityScore,
      overallActivityScore: overallScore,
      activityLabel: overallLabel,
      metaEnabled: String(metaResult.enabled),
      googleEnabled: String(googleResult.enabled),
      aiInsights,
      cachedAt: now,
    })
    .returning();

  return inserted;
}

export type { CompetitorAdsScan } from "@workspace/db";
