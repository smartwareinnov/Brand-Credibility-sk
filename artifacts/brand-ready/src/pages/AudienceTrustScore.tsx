import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Users, MessageCircle, Globe, Star,
  RefreshCw, AlertCircle, ChevronRight, Lightbulb, Info,
  Instagram, Linkedin, Facebook, Youtube, Twitter,
} from "lucide-react";

/* ── Platform definitions ─────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200",
    activeBg: "bg-pink-600",
    benchmarks: "Good engagement: 1–3% engagement rate. Saves > 5% of likes = strong trust signal.",
  },
  {
    id: "tiktok",
    label: "TikTok",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
    color: "text-slate-800",
    bg: "bg-slate-50 border-slate-200",
    activeBg: "bg-slate-800",
    benchmarks: "Good engagement: 3–9% engagement rate. Comments > 1% of views = strong community.",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    activeBg: "bg-blue-700",
    benchmarks: "Good engagement: 0.5–1% engagement rate. Response rate > 80% = strong trust.",
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: Twitter,
    color: "text-sky-500",
    bg: "bg-sky-50 border-sky-200",
    activeBg: "bg-sky-500",
    benchmarks: "Good engagement: 0.5–1% engagement rate. Replies > 10% of likes = active community.",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-100",
    activeBg: "bg-blue-600",
    benchmarks: "Good engagement: 2–5% engagement rate. Comments > 20% of likes = thought leadership.",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    activeBg: "bg-red-600",
    benchmarks: "Good engagement: 2–5% like rate. Comments > 0.5% of views = strong community.",
  },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

/* ── Types ────────────────────────────────────────────────────────────────── */
type Pillar = { score: number; label: string; insight: string };

type TrustScoreResult = {
  overallScore: number;
  grade: string;
  pillars: {
    reviewTrust: Pillar;
    communityEngagement: Pillar;
    contentCredibility: Pillar;
    audienceConversation: Pillar;
  };
  summary: string;
  recommendations: string[];
  brandName: string;
  dataAvailability: { hasAnalysis: boolean; hasSocialStats: boolean; hasMentions: boolean };
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-green-600 bg-green-50 border-green-200";
  if (grade.startsWith("B")) return "text-blue-600 bg-blue-50 border-blue-200";
  if (grade.startsWith("C")) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function scoreRingColor(score: number) {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#2563eb";
  if (score >= 30) return "#ca8a04";
  return "#dc2626";
}

function labelColor(label: string) {
  if (label === "Excellent") return "bg-green-100 text-green-700 border-green-200";
  if (label === "Good") return "bg-blue-100 text-blue-700 border-blue-200";
  if (label === "Fair") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

const PILLARS = [
  { key: "reviewTrust" as const, label: "Review Trust", icon: Star, description: "Based on your brand analysis score", color: "text-amber-600" },
  { key: "communityEngagement" as const, label: "Community Engagement", icon: Users, description: "Based on your social engagement stats", color: "text-blue-600" },
  { key: "contentCredibility" as const, label: "Content Credibility", icon: Globe, description: "Based on your website & content score", color: "text-purple-600" },
  { key: "audienceConversation" as const, label: "Audience Conversation", icon: MessageCircle, description: "Based on your brand mentions sentiment", color: "text-green-600" },
];

/* ── Main component ───────────────────────────────────────────────────────── */
export default function AudienceTrustScore() {
  const { apiFetch } = useApi();
  const { toast } = useToast();

  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId | null>(null);
  const [followerCount, setFollowerCount] = useState("");
  const [avgLikes, setAvgLikes] = useState("");
  const [avgComments, setAvgComments] = useState("");
  const [responseRate, setResponseRate] = useState("");

  const platform = PLATFORMS.find(p => p.id === selectedPlatform);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedPlatform) throw new Error("Please select a platform first");
      return apiFetch<TrustScoreResult>("/ai/trust-score", {
        method: "POST",
        body: JSON.stringify({
          platform: selectedPlatform,
          followerCount: followerCount ? parseInt(followerCount) : undefined,
          avgLikes: avgLikes ? parseInt(avgLikes) : undefined,
          avgComments: avgComments ? parseInt(avgComments) : undefined,
          responseRate: responseRate ? parseFloat(responseRate) : undefined,
        }),
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const result = mutation.data;
  const circumference = 2 * Math.PI * 54;
  const overallScore = result?.overallScore ?? 0;
  const dashOffset = circumference - (overallScore / 100) * circumference;

  const handlePlatformSelect = (id: PlatformId) => {
    setSelectedPlatform(id);
    // Reset stats when switching platform
    setFollowerCount("");
    setAvgLikes("");
    setAvgComments("");
    setResponseRate("");
    mutation.reset();
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Audience Trust Score
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Select a platform, enter your engagement stats, and get an AI-powered trust score based strictly on your real data
          </p>
        </div>

        {/* Step 1: Platform selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">1</span>
              Select Platform
            </CardTitle>
            <CardDescription>Choose the social media platform you want to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PLATFORMS.map(p => {
                const isSelected = selectedPlatform === p.id;
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePlatformSelect(p.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? `border-current ${p.bg} ${p.color}`
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      isSelected ? "bg-white shadow-sm" : "bg-muted"
                    )}>
                      <Icon className={cn("h-4 w-4", isSelected ? p.color : "text-muted-foreground")} />
                    </div>
                    <span className={cn("text-sm font-medium", isSelected ? p.color : "text-foreground")}>
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Stats input — only shown after platform selected */}
        {selectedPlatform && platform && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">2</span>
                Enter Your {platform.label} Stats
              </CardTitle>
              <CardDescription>
                Enter your real numbers — the AI will only use what you provide. No assumptions will be made.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Benchmark hint */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{platform.benchmarks}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="followers" className="text-xs font-medium">
                    Total Followers <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="followers"
                    type="number"
                    min="0"
                    placeholder="e.g. 12000"
                    value={followerCount}
                    onChange={(e) => setFollowerCount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="likes" className="text-xs font-medium">
                    Avg Likes / Post <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="likes"
                    type="number"
                    min="0"
                    placeholder="e.g. 320"
                    value={avgLikes}
                    onChange={(e) => setAvgLikes(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="comments" className="text-xs font-medium">
                    Avg Comments / Post
                  </Label>
                  <Input
                    id="comments"
                    type="number"
                    min="0"
                    placeholder="e.g. 45"
                    value={avgComments}
                    onChange={(e) => setAvgComments(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="response" className="text-xs font-medium">
                    Response Rate (%)
                  </Label>
                  <Input
                    id="response"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 80"
                    value={responseRate}
                    onChange={(e) => setResponseRate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending || !followerCount || !avgLikes}
                  className="gap-2"
                >
                  <RefreshCw className={cn("h-4 w-4", mutation.isPending && "animate-spin")} />
                  {mutation.isPending ? "Computing..." : result ? "Recompute Score" : "Compute Trust Score"}
                </Button>
                {(!followerCount || !avgLikes) && (
                  <p className="text-xs text-muted-foreground">Followers and Avg Likes are required</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {mutation.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          </div>
        )}

        {/* Results */}
        {result && !mutation.isPending && (
          <>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                      <circle
                        cx="64" cy="64" r="54" fill="none"
                        stroke={scoreRingColor(overallScore)}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{overallScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start mb-2 flex-wrap">
                      <h2 className="text-xl font-bold">{result.brandName} Trust Score</h2>
                      <Badge className={cn("text-sm font-bold border", gradeColor(result.grade))}>
                        Grade {result.grade}
                      </Badge>
                      {platform && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <platform.icon className={cn("h-3 w-3", platform.color)} />
                          {platform.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>
                    {!result.dataAvailability.hasAnalysis && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-3">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Run a brand analysis first for a more accurate score
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PILLARS.map(({ key, label, icon: Icon, description, color }) => {
                const pillar = result.pillars[key];
                return (
                  <Card key={key}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-xs border", labelColor(pillar.label))}>
                          {pillar.label}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Score</span>
                          <span className="font-semibold">{pillar.score}/100</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pillar.score}%`, backgroundColor: scoreRingColor(pillar.score) }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{pillar.insight}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" /> Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty state */}
        {!result && !mutation.isPending && (
          <Card>
            <CardContent className="py-14 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">
                {!selectedPlatform ? "Select a platform to get started" : "Enter your stats and compute your score"}
              </p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {!selectedPlatform
                  ? "Choose the social media platform you want to analyze, then enter your real engagement numbers."
                  : "Your Trust Score is calculated using only the data you provide — no assumptions, no hallucinations."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
