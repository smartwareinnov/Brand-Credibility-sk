import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";
import {
  Flame, RefreshCw, Youtube, ExternalLink, AlertCircle,
  Zap, Lightbulb, Clock, TrendingUp, CheckCircle2, Info,
  Instagram, Linkedin, Facebook, Twitter,
} from "lucide-react";

/* ── Platform definitions ─────────────────────────────────────────────────── */
const PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bg: "bg-pink-50 border-pink-200",
    badge: "bg-pink-100 text-pink-700 border-pink-200",
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
    badge: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    id: "youtube",
    label: "YouTube",
    icon: Youtube,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icon: Twitter,
    color: "text-sky-500",
    bg: "bg-sky-50 border-sky-200",
    badge: "bg-sky-100 text-sky-700 border-sky-200",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-100",
    badge: "bg-blue-100 text-blue-700 border-blue-100",
  },
] as const;

type PlatformId = typeof PLATFORMS[number]["id"];

/* ── Types ────────────────────────────────────────────────────────────────── */
type Video = {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
  likeCount: string;
  commentCount: string;
};

type AiAnalysis = {
  patterns: string[];
  hooks: string[];
  contentFormats: string[];
  emotionalTriggers: string[];
  actionableTips: string[];
  bestPostingTimes: string;
  summary: string;
};

type ViralResult = {
  niche: string;
  platform: string;
  youtubeConfigured: boolean;
  videos: Video[];
  aiAnalysis: AiAnalysis;
};

function formatCount(n: string | number) {
  const num = typeof n === "string" ? parseInt(n, 10) : n;
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function VideoCard({ video }: { video: Video }) {
  const ytUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  return (
    <a href={ytUrl} target="_blank" rel="noreferrer"
      className="block border rounded-xl p-3 hover:bg-muted/40 transition-colors group"
    >
      <div className="flex items-start gap-3">
        <div className="w-20 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0 relative">
          <img
            src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
            alt={video.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <Youtube className="h-5 w-5 text-red-500 absolute inset-0 m-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors leading-snug">
            {video.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{video.channelTitle}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> {formatCount(video.viewCount)} views
            </span>
            <span>{formatCount(video.likeCount)} likes</span>
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </a>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function ViralContentDetector() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [niche, setNiche] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>("instagram");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<ViralResult>("/ai/viral-content", {
        method: "POST",
        body: JSON.stringify({ niche: niche.trim(), platform: selectedPlatform }),
      }),
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const result = mutation.data;
  const activePlatform = PLATFORMS.find(p => p.id === selectedPlatform)!;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" /> Viral Content Detector
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Select a platform, enter your niche, and get AI-powered insights on what's going viral right now
          </p>
        </div>

        <Card>
          <CardContent className="p-5 space-y-4">
            {/* Platform selector */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Select Platform</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PLATFORMS.map(p => {
                  const isSelected = selectedPlatform === p.id;
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlatform(p.id);
                        mutation.reset();
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                        isSelected
                          ? `border-current ${p.bg} ${p.color}`
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isSelected ? p.color : "text-muted-foreground")} />
                      <span className={cn("text-[11px] font-medium leading-tight text-center", isSelected ? p.color : "text-muted-foreground")}>
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Niche input */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="niche">Your Niche or Topic</Label>
                <Input
                  id="niche"
                  placeholder={`e.g. skincare brand marketing, SaaS onboarding, fitness coaching...`}
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && niche.trim()) mutation.mutate(); }}
                />
              </div>
              <div className="flex items-center gap-2 pb-0.5">
                <Badge className={cn("gap-1.5 border", activePlatform.badge)}>
                  <activePlatform.icon className={cn("h-3.5 w-3.5", activePlatform.color)} />
                  {activePlatform.label}
                </Badge>
              </div>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!niche.trim() || mutation.isPending}
                className="gap-2 flex-shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4", mutation.isPending && "animate-spin")} />
                {mutation.isPending ? "Detecting..." : "Detect Viral Content"}
              </Button>
            </div>

            {result && !mutation.isPending && selectedPlatform === "youtube" && (
              <div className="flex items-center gap-2 text-xs">
                {result.youtubeConfigured ? (
                  <span className="flex items-center gap-1 text-green-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> YouTube API connected — showing live data
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5" /> Live video data not available — AI analysis based on platform knowledge
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {mutation.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          </div>
        )}

        {!result && !mutation.isPending && (
          <Card>
            <CardContent className="py-14 text-center">
              <Flame className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">Enter your niche to get started</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                We'll analyze what's going viral in your niche on {activePlatform.label} and give you an AI breakdown of what's making it work.
              </p>
            </CardContent>
          </Card>
        )}

        {result && !mutation.isPending && (
          <>
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50/60 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-orange-500" />
                  Viral Intelligence — "{result.niche}" on {activePlatform.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm leading-relaxed">{result.aiAnalysis.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Viral Patterns
                    </p>
                    <ul className="space-y-1.5">
                      {result.aiAnalysis.patterns.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-orange-500 mt-0.5 flex-shrink-0 font-bold text-xs">{i + 1}</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> Proven Hook Formats
                    </p>
                    <ul className="space-y-1.5">
                      {result.aiAnalysis.hooks.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5" /> Content Formats That Win
                    </p>
                    <ul className="space-y-1.5">
                      {result.aiAnalysis.contentFormats.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-purple-500 mt-0.5 flex-shrink-0">•</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5" /> Emotional Triggers Used
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.aiAnalysis.emotionalTriggers.map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {result.aiAnalysis.bestPostingTimes && (
                  <div className="flex items-start gap-2 bg-background border rounded-lg px-4 py-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">
                        Best Posting Time on {activePlatform.label}
                      </p>
                      <p className="text-sm">{result.aiAnalysis.bestPostingTimes}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Actionable Tips for Your Brand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.aiAnalysis.actionableTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-muted/30 rounded-lg p-3">
                      <span className="text-primary font-bold text-sm flex-shrink-0">{i + 1}</span>
                      <p className="text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {result.videos.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" /> Top Trending Videos — "{result.niche}"
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.videos.map((video) => (
                      <VideoCard key={video.videoId} video={video} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
