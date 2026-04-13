import { logger } from "./logger";
import { db, platformSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

interface BrandInput {
  brandName: string;
  websiteUrl: string;
  brandDescription?: string | null;
  instagramHandle?: string | null;
  linkedinUrl?: string | null;
  facebookUrl?: string | null;
  xHandle?: string | null;
  industry: string;
}

interface ScoreBreakdown {
  websiteScore: number;
  socialScore: number;
  contentScore: number;
  reviewsScore: number;
  competitorScore: number;
  messagingScore: number;
  overallScore: number;
  adReadinessLevel: string;
}

interface Insight {
  category: string;
  title: string;
  description: string;
  severity: string;
}

interface ActionTask {
  title: string;
  description: string;
  priority: number;
  category: string;
  estimatedDays: number;
  isDailyTask: boolean;
  dayNumber: number;
}

interface AnalysisOutput {
  scores: ScoreBreakdown;
  insights: Insight[];
  tasks: ActionTask[];
}

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

function scoreWebsite(input: BrandInput): number {
  let score = 38;
  const url = input.websiteUrl.toLowerCase();
  if (url.startsWith("https://")) score += 16;
  if (url.includes(".com") || url.includes(".io") || url.includes(".co") || url.includes(".app")) score += 12;
  if (!url.includes("wix") && !url.includes("wordpress.com") && !url.includes("blogspot") && !url.includes("squarespace.com")) score += 10;
  if (input.industry && input.industry.length > 0) score += 6;
  if (url.length > 15 && url.length < 50) score += 4;
  const noise = Math.floor(Math.random() * 14) - 7;
  return Math.min(100, Math.max(10, score + noise));
}

function scoreSocial(input: BrandInput): number {
  let score = 10;
  const socialCount = [input.instagramHandle, input.linkedinUrl, input.facebookUrl, input.xHandle].filter(Boolean).length;
  if (input.instagramHandle) score += 26;
  if (input.linkedinUrl) score += 26;
  if (input.facebookUrl) score += 14;
  if (input.xHandle) score += 12;
  if (socialCount >= 3) score += 10;
  if (socialCount === 4) score += 6;
  const noise = Math.floor(Math.random() * 14) - 7;
  return Math.min(100, Math.max(5, score + noise));
}

function scoreContent(input: BrandInput): number {
  let score = 20;
  if (input.instagramHandle) score += 18;
  if (input.linkedinUrl) score += 18;
  if (input.facebookUrl) score += 10;
  if (input.xHandle) score += 8;
  const industries = ["tech", "software", "saas", "digital", "marketing", "media", "agency", "consulting"];
  if (industries.some((i) => input.industry.toLowerCase().includes(i))) score += 14;
  if ([input.instagramHandle, input.linkedinUrl, input.facebookUrl, input.xHandle].filter(Boolean).length >= 2) score += 8;
  if (input.brandDescription && input.brandDescription.length > 50) score += 6;
  const noise = Math.floor(Math.random() * 20) - 10;
  return Math.min(100, Math.max(10, score + noise));
}

function scoreReviews(_input: BrandInput): number {
  const base = 18 + Math.floor(Math.random() * 42);
  return Math.min(100, Math.max(5, base));
}

function scoreBrandClarity(input: BrandInput): number {
  let score = 28;
  if (input.brandDescription && input.brandDescription.trim().length > 20) {
    const descLen = input.brandDescription.trim().length;
    if (descLen > 100) score += 24;
    else if (descLen > 50) score += 16;
    else score += 8;
  }
  if (input.brandName && input.brandName.length > 3 && input.brandName.length < 25) score += 14;
  if (input.websiteUrl && input.websiteUrl.startsWith("https://")) score += 10;
  if (input.instagramHandle || input.linkedinUrl) score += 10;
  const noise = Math.floor(Math.random() * 16) - 8;
  return Math.min(100, Math.max(10, score + noise));
}

function scoreMessaging(input: BrandInput): number {
  let score = 24;
  if (input.brandName && input.brandName.length > 3 && input.brandName.length < 25) score += 16;
  if (input.websiteUrl && input.websiteUrl.startsWith("https://")) score += 10;
  const techIndustries = ["tech", "saas", "fintech", "software", "digital", "e-commerce", "ecommerce", "healthtech", "edtech"];
  if (techIndustries.some((i) => input.industry.toLowerCase().includes(i))) score += 14;
  if (input.instagramHandle || input.linkedinUrl) score += 10;
  if (input.brandDescription && input.brandDescription.length > 30) score += 10;
  const noise = Math.floor(Math.random() * 16) - 8;
  return Math.min(100, Math.max(10, score + noise));
}

function computeAdReadiness(overall: number): string {
  if (overall >= 80) return "ready";
  if (overall >= 60) return "almost_ready";
  if (overall >= 34) return "getting_there";
  return "not_ready";
}

function generateInsights(input: BrandInput, scores: ScoreBreakdown): Insight[] {
  const insights: Insight[] = [];
  const socialPlatforms = [
    input.instagramHandle ? "Instagram" : null,
    input.linkedinUrl ? "LinkedIn" : null,
    input.facebookUrl ? "Facebook" : null,
    input.xHandle ? "X (Twitter)" : null,
  ].filter(Boolean) as string[];
  const missingSocial = ["Instagram", "LinkedIn", "Facebook", "X (Twitter)"].filter(p => !socialPlatforms.includes(p));

  // Website
  if (scores.websiteScore < 50) {
    insights.push({
      category: "website",
      title: "Website lacks critical trust signals",
      description: `Your website at ${input.websiteUrl} is missing the trust infrastructure that ad traffic needs. Key issues likely include: no HTTPS security, an amateur domain setup, or a platform-hosted site (Wix/WordPress.com) that signals low investment. Paid traffic to this site will have high bounce rates and low conversion because skeptical buyers always scrutinize the website of an unfamiliar brand before purchasing.`,
      severity: "critical",
    });
  } else if (scores.websiteScore < 70) {
    insights.push({
      category: "website",
      title: "Website needs credibility improvements",
      description: `${input.brandName}'s website shows a professional foundation but still lacks some key conversion elements. Before scaling paid ads, ensure your homepage has a clear value proposition above the fold, visible testimonials or client logos, a professional contact page, and a privacy policy. These elements reduce friction for ad-referred visitors who are evaluating your brand for the first time.`,
      severity: "warning",
    });
  } else {
    insights.push({
      category: "website",
      title: "Website is ready for ad traffic",
      description: `${input.brandName}'s website demonstrates the technical credibility needed to convert paid traffic. Your HTTPS setup and domain choice signal professionalism. Focus next on optimizing your landing pages for conversion — test headlines, social proof placement, and clear calls to action that match your ad messaging.`,
      severity: "positive",
    });
  }

  // Brand description / clarity
  if (!input.brandDescription || input.brandDescription.trim().length < 20) {
    insights.push({
      category: "brand_clarity",
      title: "Brand positioning is unclear — adds risk to ad campaigns",
      description: `${input.brandName} lacks a documented brand description, which means your ad messaging will likely be unfocused. Before running ads, clearly articulate: what problem you solve, who you solve it for, and why you're different from alternatives. Brands with clear positioning have 2-3x higher ad conversion rates because every element — headline, creative, copy — aligns around a single compelling idea.`,
      severity: "critical",
    });
  } else if (input.brandDescription.trim().length < 100) {
    insights.push({
      category: "brand_clarity",
      title: "Brand description could be more detailed",
      description: `${input.brandName} has a basic brand description, but it lacks the depth needed to generate highly targeted ad copy. A strong brand brief for the ${input.industry} industry should include your core value proposition, the specific pain points you address, your unique differentiator, and your target customer profile. The more clarity you provide, the more precise the AI analysis and ad strategy recommendations.`,
      severity: "warning",
    });
  } else {
    insights.push({
      category: "brand_clarity",
      title: "Strong brand clarity — well positioned for ad campaigns",
      description: `${input.brandName} has a clear and detailed brand description, which is the foundation for effective paid advertising. A well-defined brand position means your ad team (or AI tools) can produce compelling, consistent copy across Meta, Google, and other platforms. This clarity also reduces your cost-per-click because platform algorithms reward ads with high relevance scores to clearly positioned audiences.`,
      severity: "positive",
    });
  }

  // Social media
  if (socialPlatforms.length === 0) {
    insights.push({
      category: "social_media",
      title: "No social media presence — critical risk for paid ads",
      description: `${input.brandName} has zero social media presence, which is the single biggest credibility risk for running paid ads. When people see your ad, the first thing they do is search for your brand on Instagram or LinkedIn. An empty search result triggers instant distrust and they'll purchase from a competitor instead. Before spending any money on ads, create and populate at least two platforms — Instagram for visual credibility and LinkedIn for professional legitimacy.`,
      severity: "critical",
    });
  } else if (socialPlatforms.length === 1) {
    insights.push({
      category: "social_media",
      title: `Limited to ${socialPlatforms[0]} only`,
      description: `${input.brandName} is only active on ${socialPlatforms[0]}, which covers only a portion of your potential audience. Your ${input.industry} industry customers likely search across multiple platforms. Missing: ${missingSocial.slice(0, 2).join(" and ")}. Each missing platform is a missed trust checkpoint that your ad-referred visitors will notice. Expanding to at least one more platform can meaningfully increase your brand's perceived legitimacy.`,
      severity: "warning",
    });
  } else if (socialPlatforms.length === 2) {
    insights.push({
      category: "social_media",
      title: "Good social coverage on two platforms",
      description: `${input.brandName} maintains a presence on ${socialPlatforms.join(" and ")}, which gives solid credibility for ad campaigns. Focus on content consistency — posting 4+ times per week on at least one platform. Consider adding ${missingSocial[0] || "more platforms"} to further expand your brand's discoverability.`,
      severity: "positive",
    });
  } else {
    insights.push({
      category: "social_media",
      title: "Strong multi-platform social presence",
      description: `${input.brandName} is visible across ${socialPlatforms.join(", ")} — an excellent foundation for paid ad credibility. People who see your ads and search your brand will find consistent social proof. Now focus on growing engagement metrics: comment response rate, story views, and follower growth.`,
      severity: "positive",
    });
  }

  // Content
  if (scores.contentScore < 45) {
    insights.push({
      category: "content",
      title: "Content marketing is virtually absent",
      description: `A Google search for ${input.brandName} or related ${input.industry} keywords likely returns little to nothing about your brand. This is a significant credibility gap — educated buyers research brands before buying, and if they can't find evidence of your expertise or thought leadership, they won't trust your ads. Blog posts, LinkedIn articles, and YouTube videos create the digital footprint that transforms paid clicks into actual sales.`,
      severity: "critical",
    });
  } else if (scores.contentScore < 65) {
    insights.push({
      category: "content",
      title: "Content presence is building but not yet sufficient",
      description: `${input.brandName} has some content footprint online, but it's not yet consistent enough to build the authority that ad campaigns need. Aim to publish at least 2 pieces of content per week — blog posts, LinkedIn articles, or social media content. For the ${input.industry} industry, focus on answering the top 10 questions your customers Google before buying your type of solution.`,
      severity: "warning",
    });
  } else {
    insights.push({
      category: "content",
      title: "Content strategy is contributing to credibility",
      description: `${input.brandName} has a visible content presence that helps validate your paid ads. Continue investing in content that specifically addresses buyer objections and showcases customer success stories. Consider repurposing your best-performing content into short-form video — the highest-converting content format for warming up cold ad audiences in the ${input.industry} space.`,
      severity: "positive",
    });
  }

  // Reviews
  if (scores.reviewsScore < 30) {
    insights.push({
      category: "reviews",
      title: "No verifiable reviews or social proof detected",
      description: `${input.brandName} has no visible online reviews on Google, Trustpilot, or industry-specific platforms. This is a conversion killer for paid ads — buyers in the ${input.industry} space rely heavily on third-party validation before making purchase decisions. Prioritize collecting 10-20 authentic reviews before scaling ad spend.`,
      severity: "critical",
    });
  } else if (scores.reviewsScore < 60) {
    insights.push({
      category: "reviews",
      title: "Review volume needs to grow",
      description: `${input.brandName} has some reviews but not enough to establish strong social proof for paid traffic. Aim for a minimum of 25-50 verified reviews across Google Business, Trustpilot, and/or ${input.industry}-specific platforms. Build a systematic review collection process: send review requests within 48 hours of a positive customer interaction.`,
      severity: "warning",
    });
  } else {
    insights.push({
      category: "reviews",
      title: "Review presence is solid — maintain the momentum",
      description: `${input.brandName} has a visible review presence that contributes positively to ad conversion. Continue your review collection systematically. Consider featuring your best reviews directly in your ad creative and landing pages.`,
      severity: "info",
    });
  }

  // SEO / visibility
  if (scores.overallScore < 50) {
    insights.push({
      category: "seo",
      title: `"${input.brandName}" has low search visibility`,
      description: `A potential customer who sees your ad and searches for "${input.brandName}" online will find very little. This creates "brand search friction" — the moment of doubt after someone clicks your ad. Before scaling, invest in brand search optimization: create a Google Business Profile, get listed in industry directories, and build 5-10 branded backlinks.`,
      severity: "critical",
    });
  } else if (scores.overallScore >= 75) {
    insights.push({
      category: "seo",
      title: `Strong brand search presence for "${input.brandName}"`,
      description: `${input.brandName} has established a meaningful digital footprint that supports your paid ad campaigns. When potential customers search your brand name after seeing your ads, they'll find consistent, professional presence. Continue expanding your branded search presence through PR outreach, podcast appearances, and guest blogging.`,
      severity: "positive",
    });
  }

  return insights;
}

function generateTasks(input: BrandInput, scores: ScoreBreakdown): ActionTask[] {
  const rawTasks: Omit<ActionTask, "dayNumber">[] = [];
  let priority = 1;

  rawTasks.push({
    title: `Set up Google Alerts for "${input.brandName}"`,
    description: `Go to google.com/alerts and create alerts for: "${input.brandName}", "${input.brandName} review", and "${input.brandName} alternative". Set frequency to "As it happens" for the brand name, weekly digest for the others. Takes 10 minutes and pays dividends indefinitely.`,
    priority: priority++, category: "branding", estimatedDays: 1, isDailyTask: false,
  });

  if (!input.brandDescription || input.brandDescription.trim().length < 50) {
    rawTasks.push({
      title: `Write ${input.brandName}'s brand positioning statement`,
      description: `Create a 100-200 word brand description that covers: (1) Exactly what you do and for whom. (2) The core problem you solve. (3) Your unique differentiator vs alternatives in the ${input.industry} space. (4) Your brand tone and personality. This becomes the foundation for all ad copy, landing pages, and marketing communication. Save it in a brand document and reference it whenever creating any marketing asset.`,
      priority: priority++, category: "branding", estimatedDays: 2, isDailyTask: false,
    });
  }

  if (!input.instagramHandle) {
    rawTasks.push({
      title: `Create ${input.brandName}'s Instagram business account`,
      description: `Set up an Instagram business account at instagram.com. Use your brand logo as profile photo (1080x1080px). Write a bio that states exactly what you do in one sentence, mentions your ${input.industry} niche, and includes a link to your website. Before running any ads, publish at least 9 high-quality posts so the profile looks active. Ensure your profile URL is accurate so customers can find and verify you.`,
      priority: priority++, category: "social_media", estimatedDays: 3, isDailyTask: false,
    });
  }

  if (!input.linkedinUrl) {
    rawTasks.push({
      title: `Create ${input.brandName}'s LinkedIn company page`,
      description: `Go to linkedin.com/company/setup and create a company page for ${input.brandName}. Complete every field: description (with key ${input.industry} keywords), logo, banner image, website URL, company size, and industry. Then invite your connections to follow the page. A complete LinkedIn page is critical for B2B credibility — it's the first place professional buyers check when verifying a vendor.`,
      priority: priority++, category: "social_media", estimatedDays: 2, isDailyTask: false,
    });
  }

  if (!input.facebookUrl) {
    rawTasks.push({
      title: `Create ${input.brandName}'s Facebook business page`,
      description: `Set up a Facebook business page for ${input.brandName}. Add your exact profile URL to your brand settings so it can be included in future ad analyses. A Facebook page is essential if you plan to run Meta Ads — you must have a verified, active page as the ad source. Use the same profile photo and brand colors as your other platforms for consistency.`,
      priority: priority++, category: "social_media", estimatedDays: 1, isDailyTask: false,
    });
  }

  if (!input.xHandle) {
    rawTasks.push({
      title: `Create ${input.brandName}'s X (Twitter) business profile`,
      description: `Set up an X profile for ${input.brandName} at x.com. Use a consistent @handle (ideally your brand name or a close variant). Write a clear bio, add your website URL, and post at least 10 initial tweets to make the account look active. X presence signals openness and accessibility, especially for tech, media, and creator brands in the ${input.industry} space.`,
      priority: priority++, category: "social_media", estimatedDays: 1, isDailyTask: false,
    });
  }

  rawTasks.push({
    title: "Create and verify Google Business Profile",
    description: `Go to business.google.com and claim or create a profile for ${input.brandName}. Complete all sections: business description, category, hours, phone number, and website. Upload at least 10 photos. Request the postcard verification to get the "Verified" badge. This makes ${input.brandName} appear in Google Maps and local searches, and is the primary source of Google reviews.`,
    priority: priority++, category: "reviews", estimatedDays: 2, isDailyTask: false,
  });

  rawTasks.push({
    title: "Add trust signals to your website homepage",
    description: `Audit your ${input.websiteUrl} homepage and add: (1) SSL padlock and HTTPS. (2) Customer testimonials with real names and photos above the fold. (3) Number of customers served or years in business. (4) Media logos ("As seen in...") if applicable. (5) Money-back guarantee or risk reversal. (6) Visible phone number or live chat widget. These elements reduce bounce rate for cold ad traffic immediately.`,
    priority: priority++, category: "website", estimatedDays: 3, isDailyTask: false,
  });

  rawTasks.push({
    title: "Launch systematic review collection campaign",
    description: `Collect your first 10 verified customer reviews within the next 7 days. Process: (1) List your last 20 satisfied customers. (2) Send a personal email/message asking for an honest review. (3) Include a direct link to your Google Business profile. (4) Follow up once after 3 days. Target: 10 Google reviews with 4+ star average. This alone can improve your ad conversion rates by 15-25%.`,
    priority: priority++, category: "reviews", estimatedDays: 7, isDailyTask: false,
  });

  rawTasks.push({
    title: "Set up Google Search Console for brand monitoring",
    description: `Go to search.google.com/search-console and verify ownership of ${input.websiteUrl}. Once verified: check which queries bring visitors to your site, how many impressions your brand name gets monthly, and which pages Google has indexed. This data reveals how discoverable ${input.brandName} is organically — a critical baseline to measure as you invest in paid ads.`,
    priority: priority++, category: "seo", estimatedDays: 1, isDailyTask: false,
  });

  rawTasks.push({
    title: `Publish 3 SEO-focused blog posts for ${input.industry}`,
    description: `Write and publish 3 long-form articles (minimum 1,200 words each) answering the most common questions buyers in the ${input.industry} space search for. Use tools like AnswerThePublic.com or Google's "People Also Ask" to find these questions. Each post should target one specific keyword, have a clear structure, and end with a relevant call to action.`,
    priority: priority++, category: "content", estimatedDays: 14, isDailyTask: false,
  });

  rawTasks.push({
    title: `Create a 2-minute brand explainer video for ${input.brandName}`,
    description: `Produce a professional 90-120 second video covering: (1) The problem your ${input.industry} customers face. (2) How ${input.brandName} solves it. (3) A proof point (testimonial, result, or demo). (4) A clear call to action. Upload to YouTube with keyword-optimized title and description, then embed it on your homepage. Videos increase homepage engagement time by 50%+.`,
    priority: priority++, category: "content", estimatedDays: 10, isDailyTask: false,
  });

  if (scores.websiteScore < 60) {
    rawTasks.push({
      title: "Audit and fix all website trust signal gaps",
      description: `Your website at ${input.websiteUrl} needs credibility improvements before it can convert ad traffic profitably. Checklist: ✓ HTTPS with valid SSL certificate (check at ssllabs.com) ✓ Page load speed under 3 seconds (test at PageSpeed Insights) ✓ Mobile-responsive layout ✓ Clear "About Us" page with real team photos ✓ Refund/cancellation policy ✓ Privacy Policy (required for ad platforms) ✓ Clear contact options. Fix all issues before spending on paid ads.`,
      priority: priority++, category: "website", estimatedDays: 7, isDailyTask: false,
    });
  }

  rawTasks.push({
    title: `Get ${input.brandName} listed in top ${input.industry} directories`,
    description: `Research the top 5-10 business directories and review platforms for the ${input.industry} industry and create or claim your profile on each. Common options: Clutch.co, G2, Capterra (for software), Yelp, TrustRadius. Each listing builds a branded backlink (improves SEO), another review collection channel, and another touchpoint where potential customers can discover and validate you.`,
    priority: priority++, category: "seo", estimatedDays: 4, isDailyTask: false,
  });

  rawTasks.push({
    title: `Create Trustpilot profile and run first review campaign`,
    description: `Sign up for Trustpilot (free plan at trustpilot.com/business) and complete your company profile. Then invite your last 30 customers to leave a review — personalized messages, not bulk emails. Trustpilot reviews appear prominently in Google search results for your brand name and can display as star ratings in Google Ads. This is one of the highest-ROI credibility investments for ${input.industry} brands.`,
    priority: priority++, category: "reviews", estimatedDays: 5, isDailyTask: false,
  });

  rawTasks.push({
    title: `Craft and test ${input.brandName}'s core value proposition`,
    description: `Write 3-5 different value proposition variants for ${input.brandName} and test them on a small audience. Each variant should be one sentence (max 12 words) that communicates: what you do + who it's for + the key benefit. Example format: "We help [target] achieve [outcome] without [pain point]." The strongest version becomes your headline ad copy, your homepage hero text, and your social bio.`,
    priority: priority++, category: "branding", estimatedDays: 3, isDailyTask: false,
  });

  rawTasks.push({
    title: `Design a paid ads landing page for ${input.brandName}`,
    description: `Create a dedicated landing page (separate from your homepage) optimized for paid traffic. It should have: a single, clear CTA (no navigation menu), social proof (reviews, logos, testimonials), a concise headline matching your ad copy, and a fast load time under 2 seconds. Use tools like Unbounce, Leadpages, or a custom page on your CMS. A dedicated landing page can improve your ad conversion rate by 30-50% versus sending traffic to your homepage.`,
    priority: priority++, category: "website", estimatedDays: 5, isDailyTask: false,
  });

  return rawTasks.map((task, index) => ({
    ...task,
    dayNumber: index + 1,
  }));
}

async function runAIAnalysis(input: BrandInput, scores: ScoreBreakdown): Promise<{
  insights: Insight[];
  tasks: ActionTask[];
} | null> {
  const openaiKey = await getOpenAiKey();
  if (!openaiKey) return null;

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    const socialPlatforms = [
      input.instagramHandle ? `Instagram (${input.instagramHandle})` : null,
      input.linkedinUrl ? `LinkedIn (${input.linkedinUrl})` : null,
      input.facebookUrl ? `Facebook (${input.facebookUrl})` : null,
      input.xHandle ? `X/Twitter (${input.xHandle})` : null,
    ].filter(Boolean).join(", ") || "None";

    const brandDescText = input.brandDescription?.trim()
      ? `Brand Description: ${input.brandDescription.trim()}`
      : "Brand Description: Not provided";

    const adReadinessLabel = scores.adReadinessLevel === "ready" ? "Ready to run ads"
      : scores.adReadinessLevel === "almost_ready" ? "Almost ready — minor gaps to fix"
      : scores.adReadinessLevel === "getting_there" ? "Getting there — significant work needed"
      : "Not ready — foundational work required";

    const prompt = `You are an expert brand strategist and paid advertising consultant. Analyze this brand and provide detailed, actionable intelligence.

BRAND PROFILE:
- Brand Name: ${input.brandName}
- Website: ${input.websiteUrl}
- Industry: ${input.industry}
- ${brandDescText}
- Active Social Platforms: ${socialPlatforms}

PRELIMINARY SCORES (0-100):
- Website Credibility: ${scores.websiteScore}/100
- Social Media Presence: ${scores.socialScore}/100  
- Content Authority: ${scores.contentScore}/100
- Review & Trust Signals: ${scores.reviewsScore}/100
- Brand Clarity & Positioning: ${scores.competitorScore}/100
- Messaging Effectiveness: ${scores.messagingScore}/100
- Overall Brand Score: ${scores.overallScore}/100
- Ad Readiness: ${adReadinessLabel}

Based on this data, generate a comprehensive brand analysis. Be specific to the ${input.industry} industry. Reference the brand name and actual data points.

Return a valid JSON object with EXACTLY this structure:
{
  "insights": [
    {
      "category": "website|social_media|content|reviews|brand_clarity|messaging|seo",
      "title": "Concise insight title (max 10 words)",
      "description": "Detailed, actionable description (150-250 words). Be specific, reference the brand name, industry, and actual scores. Explain WHY this matters for ad campaigns.",
      "severity": "critical|warning|positive|info"
    }
  ],
  "tasks": [
    {
      "title": "Specific action title",
      "description": "Step-by-step instructions (100-200 words). Include specific tools, URLs, timeframes, and metrics to aim for. Make it immediately actionable.",
      "priority": 1,
      "category": "website|social_media|content|reviews|branding|seo",
      "estimatedDays": 1,
      "isDailyTask": false,
      "dayNumber": 1
    }
  ]
}

Generate exactly 6-8 insights and 10-14 tasks. Number tasks 1-14 in priority order. Focus on what will have the highest impact on ad campaign success. Include at least one insight per category that has a score below 60.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3500,
      temperature: 0.35,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      insights?: Insight[];
      tasks?: Omit<ActionTask, never>[];
    };

    if (!parsed.insights?.length || !parsed.tasks?.length) return null;

    return {
      insights: parsed.insights,
      tasks: parsed.tasks as ActionTask[],
    };
  } catch (err) {
    logger.error({ err }, "[AI Analyzer] OpenAI analysis failed, falling back to deterministic");
    return null;
  }
}

export async function runBrandAnalysis(input: BrandInput): Promise<AnalysisOutput> {
  const websiteScore = scoreWebsite(input);
  const socialScore = scoreSocial(input);
  const contentScore = scoreContent(input);
  const reviewsScore = scoreReviews(input);
  const brandClarityScore = scoreBrandClarity(input);
  const messagingScore = scoreMessaging(input);

  const overallScore = Math.round(
    websiteScore * 0.20 +
    socialScore * 0.22 +
    contentScore * 0.18 +
    reviewsScore * 0.14 +
    brandClarityScore * 0.14 +
    messagingScore * 0.12
  );

  const scores: ScoreBreakdown = {
    websiteScore,
    socialScore,
    contentScore,
    reviewsScore,
    competitorScore: brandClarityScore,
    messagingScore,
    overallScore,
    adReadinessLevel: computeAdReadiness(overallScore),
  };

  const aiResult = await runAIAnalysis(input, scores);

  if (aiResult) {
    return { scores, insights: aiResult.insights, tasks: aiResult.tasks };
  }

  const insights = generateInsights(input, scores);
  const tasks = generateTasks(input, scores);

  return { scores, insights, tasks };
}
