import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone, Search, Zap, RefreshCw, ExternalLink,
  TrendingUp, AlertCircle, CheckCircle2, Clock,
  Lightbulb, Target, BarChart2, ChevronDown, ChevronUp,
  Globe, Info, Crosshair, FileText, ShieldCheck, Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Competitor = {
  id: number;
  name: string;
  website?: string | null;
};

type MetaAd = {
  id: string;
  status?: string;
  adCreativeBodies?: string[];
  adCreativeLinkTitles?: string[];
  adDeliveryStartTime?: string;
  publisherPlatforms?: string[];
  adSnapshotUrl?: string;
  pageId?: string;
  pageName?: string;
};

type GoogleAd = {
  position?: number;
  block_position?: string;
  title: string;
  link?: string;
  displayed_link?: string;
  description?: string;
  tracking_link?: string;
};

type AdsScan = {
  id: number;
  competitorId: number;
  competitorName: string;
  metaAds: MetaAd[] | null;
  googleAds: GoogleAd[] | null;
  metaActivityScore: number | null;
  googleActivityScore: number | null;
  overallActivityScore: number | null;
  activityLabel: string | null;
  metaEnabled: string | null;
  googleEnabled: string | null;
  aiInsights: {
    summary: string;
    metaInsights: string[];
    googleInsights: string[];
    recommendations: string[];
    competitivePosition: string;
  } | null;
  cachedAt: string;
};

type AdsResponse = {
  scan: AdsScan | null;
  competitor: { id: number; name: string; website?: string | null };
  apiStatus: { meta: boolean; google: boolean };
};

type ScanResponse = {
  scan: AdsScan;
  cached: boolean;
};

function activityColor(label: string | null) {
  if (!label) return "bg-slate-100 text-slate-600";
  if (label === "Not Running Ads") return "bg-slate-100 text-slate-600";
  if (label === "Testing Ads") return "bg-yellow-100 text-yellow-700";
  if (label === "Actively Running Ads") return "bg-blue-100 text-blue-700";
  return "bg-red-100 text-red-700";
}

function activityIcon(label: string | null) {
  if (!label || label === "Not Running Ads") return <AlertCircle className="h-4 w-4" />;
  if (label === "Testing Ads") return <Clock className="h-4 w-4" />;
  if (label === "Actively Running Ads") return <TrendingUp className="h-4 w-4" />;
  return <Zap className="h-4 w-4" />;
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{score}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            score === 0 ? "bg-slate-300" :
            score < 40 ? "bg-yellow-400" :
            score < 70 ? "bg-blue-500" : "bg-red-500"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function MetaAdCard({ ad, index }: { ad: MetaAd; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const platforms = ad.publisherPlatforms ?? [];
  const body = ad.adCreativeBodies?.[0];
  const title = ad.adCreativeLinkTitles?.[0];

  return (
    <Card className="text-sm hover:shadow-sm transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {platforms.includes("facebook") && (
              <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">Facebook</Badge>
            )}
            {platforms.includes("instagram") && (
              <Badge className="text-xs bg-pink-100 text-pink-700 border-pink-200">Instagram</Badge>
            )}
            {platforms.length === 0 && (
              <Badge variant="secondary" className="text-xs">Meta</Badge>
            )}
            <span className="text-xs text-muted-foreground">Ad #{index + 1}</span>
          </div>
          {ad.adSnapshotUrl && (
            <a href={ad.adSnapshotUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0">
              <ExternalLink className="h-3 w-3" /> View
            </a>
          )}
        </div>

        {title && <p className="font-semibold leading-tight">{title}</p>}

        {body && (
          <p className="text-muted-foreground leading-relaxed">
            {expanded || body.length <= 160 ? body : `${body.slice(0, 160)}...`}
            {body.length > 160 && (
              <button onClick={() => setExpanded(!expanded)}
                className="ml-1 text-primary hover:underline text-xs">
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </p>
        )}

        {!body && !title && (
          <p className="text-muted-foreground italic">Ad creative details not available</p>
        )}

        {ad.adDeliveryStartTime && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t">
            <Clock className="h-3 w-3" />
            Running since {new Date(ad.adDeliveryStartTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoogleAdRow({ ad, index }: { ad: GoogleAd; index: number }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          ad.block_position === "top" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
        )}>
          {ad.block_position === "top" ? "Top" : "Bottom"} #{index + 1}
        </span>
      </td>
      <td className="py-3 px-4">
        <p className="font-medium text-sm leading-tight">{ad.title}</p>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px]">
        <p className="line-clamp-2">{ad.description ?? "—"}</p>
      </td>
      <td className="py-3 px-4">
        {ad.link ? (
          <a href={ad.link} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Globe className="h-3 w-3" />
            {ad.displayed_link ?? ad.link.replace(/^https?:\/\//, "").split("/")[0]}
          </a>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>
    </tr>
  );
}

export default function CompetitorAdsIntelligence() {
  const sessionId = useSession();
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string>("");
  const [showAllMeta, setShowAllMeta] = useState(false);
  const [showAllGoogle, setShowAllGoogle] = useState(false);

  const [adCopyText, setAdCopyText] = useState("");
  const [adCopyPlatform, setAdCopyPlatform] = useState("Meta");
  const [adCopyCompetitorName, setAdCopyCompetitorName] = useState("");

  const analyzeCopyMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        hook: string;
        angle: string;
        targetAudience: string;
        emotionalTriggers: string[];
        painPointsAddressed: string[];
        ctaStyle: string;
        valueProposition: string;
        weaknesses: string[];
        strengths: string[];
        overallRating: string;
        counterOpportunity: string;
      }>("/user/competitor-ads/analyze-copy", {
        method: "POST",
        body: JSON.stringify({
          adCopy: adCopyText,
          platform: adCopyPlatform,
          competitorName: adCopyCompetitorName || undefined,
        }),
      }),
    onError: (err: Error) => toast({ title: "Analysis failed", description: err.message, variant: "destructive" }),
  });

  const counterStrategyMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        competitorName: string;
        currentStrategy: string;
        messagingGaps: string[];
        counterAngles: string[];
        adConcepts: { platform: string; headline: string; body: string; cta: string }[];
        keywordOpportunities: string[];
        recommendations: string[];
        hasScanData: boolean;
      }>("/user/competitor-ads/counter-strategy", {
        method: "POST",
        body: JSON.stringify({ competitorId: parseInt(selectedCompetitorId) }),
      }),
    onError: (err: Error) => toast({ title: "Strategy failed", description: err.message, variant: "destructive" }),
  });

  const { data: competitors = [], isLoading: competitorsLoading } = useQuery<Competitor[]>({
    queryKey: ["competitors-for-ads", sessionId],
    queryFn: () => apiFetch<Competitor[]>("/user/competitors"),
    enabled: !!sessionId,
  });

  const { data: adsData, isLoading: adsLoading } = useQuery<AdsResponse>({
    queryKey: ["competitor-ads", selectedCompetitorId],
    queryFn: () => apiFetch<AdsResponse>(`/user/competitor-ads/${selectedCompetitorId}`),
    enabled: !!selectedCompetitorId,
  });

  const scanMutation = useMutation({
    mutationFn: (params: { competitorId: number; force?: boolean }) =>
      apiFetch<ScanResponse>("/user/competitor-ads/scan", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["competitor-ads", selectedCompetitorId] });
      if (data.cached) {
        toast({ title: "Loaded from cache", description: "Showing saved scan results (less than 24h old)." });
      } else {
        toast({ title: "Scan complete", description: "Ads intelligence data has been updated." });
      }
    },
    onError: (err: Error) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  const scan = adsData?.scan;
  const apiStatus = adsData?.apiStatus;
  const metaAds = scan?.metaAds ?? [];
  const googleAds = scan?.googleAds ?? [];
  const insights = scan?.aiInsights;

  const visibleMeta = showAllMeta ? metaAds : metaAds.slice(0, 6);
  const visibleGoogle = showAllGoogle ? googleAds : googleAds.slice(0, 5);

  const cacheAge = scan?.cachedAt
    ? Math.round((Date.now() - new Date(scan.cachedAt).getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" /> Competitor Ads Intelligence
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Detect whether competitors are running Meta and Google paid ads — and how aggressively
            </p>
          </div>
        </div>

        {/* Competitor Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-sm font-medium">Select Competitor</label>
                {competitorsLoading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a competitor to analyze..." />
                    </SelectTrigger>
                    <SelectContent>
                      {competitors.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          No competitors added yet
                        </div>
                      ) : competitors.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                          {c.website && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {c.website.replace(/^https?:\/\//, "")}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button
                className="gap-1.5 flex-shrink-0"
                disabled={!selectedCompetitorId || scanMutation.isPending}
                onClick={() => scanMutation.mutate({
                  competitorId: parseInt(selectedCompetitorId),
                  force: !!scan,
                })}
              >
                <RefreshCw className={cn("h-4 w-4", scanMutation.isPending && "animate-spin")} />
                {scanMutation.isPending ? "Scanning..." : scan ? "Re-scan" : "Scan Ads"}
              </Button>
            </div>

            {selectedCompetitorId && apiStatus && (
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  {apiStatus.meta ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={apiStatus.meta ? "text-green-700" : "text-muted-foreground"}>
                    Meta Ads {apiStatus.meta ? "connected" : "not configured"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {apiStatus.google ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={apiStatus.google ? "text-green-700" : "text-muted-foreground"}>
                    Google Ads {apiStatus.google ? "connected" : "not configured"}
                  </span>
                </div>
                {cacheAge !== null && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    Last scanned {cacheAge < 1 ? "less than 1 hour" : `${cacheAge}h`} ago
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paywall for free users */}
        {scanMutation.error && (scanMutation.error as Error).message?.includes("paid plan") && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-8 text-center">
              <Zap className="h-10 w-10 text-amber-500 mx-auto mb-3" />
              <p className="font-semibold text-amber-800 mb-1">Paid Plan Required</p>
              <p className="text-sm text-amber-700 mb-4">
                Competitor Ads Intelligence is available on Starter and Growth plans.
              </p>
              <Button size="sm" asChild>
                <a href="/pricing">View Plans</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {(adsLoading || scanMutation.isPending) && (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* No competitor selected */}
        {!selectedCompetitorId && !competitorsLoading && (
          <Card>
            <CardContent className="py-14 text-center">
              <BarChart2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">Select a competitor to get started</p>
              <p className="text-sm text-muted-foreground">
                Choose a competitor from the dropdown above, then click "Scan Ads" to detect their ad activity.
              </p>
            </CardContent>
          </Card>
        )}

        {/* No scan yet */}
        {selectedCompetitorId && adsData && !scan && !adsLoading && !scanMutation.isPending && (
          <Card>
            <CardContent className="py-14 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">No scan data yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Click "Scan Ads" to detect paid advertising activity for this competitor.
              </p>
              {(!apiStatus?.meta && !apiStatus?.google) && (
                <div className="flex items-center gap-2 justify-center text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 max-w-sm mx-auto">
                  <Info className="h-4 w-4 flex-shrink-0" />
                  Configure ad scanning integrations in Admin → API Integrations to enable live scanning.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {scan && !adsLoading && !scanMutation.isPending && (
          <>
            {/* Summary Panel */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" /> Activity Summary — {scan.competitorName}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={cn("gap-1.5 px-3 py-1 text-sm", activityColor(scan.activityLabel))}>
                    {activityIcon(scan.activityLabel)}
                    {scan.activityLabel ?? "Unknown"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Overall activity score: <strong>{scan.overallActivityScore ?? 0}/100</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ScoreBar score={scan.metaActivityScore ?? 0} label="Meta Ads Activity" />
                  <ScoreBar score={scan.googleActivityScore ?? 0} label="Google Ads Activity" />
                  <ScoreBar score={scan.overallActivityScore ?? 0} label="Overall Score" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    { label: "Meta Ads Found", value: metaAds.length, icon: <Megaphone className="h-4 w-4 text-blue-500" /> },
                    { label: "Google Ads Found", value: googleAds.length, icon: <Search className="h-4 w-4 text-green-600" /> },
                    {
                      label: "Platforms Active",
                      value: [metaAds.length > 0 && "Meta", googleAds.length > 0 && "Google"].filter(Boolean).join(" + ") || "None",
                      icon: <Globe className="h-4 w-4 text-purple-500" />,
                    },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                        {stat.icon}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="font-semibold">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            {insights && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" /> AI Intelligence Report
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-sm leading-relaxed text-foreground">{insights.summary}</p>

                  {insights.competitivePosition && (
                    <div className="bg-background border rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Your Competitive Position</p>
                      <p className="text-sm">{insights.competitivePosition}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {insights.metaInsights.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Megaphone className="h-3.5 w-3.5" /> Meta Insights
                        </p>
                        <ul className="space-y-1.5">
                          {insights.metaInsights.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights.googleInsights.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide flex items-center gap-1.5">
                          <Search className="h-3.5 w-3.5" /> Google Insights
                        </p>
                        <ul className="space-y-1.5">
                          {insights.googleInsights.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {insights.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" /> Recommendations for You
                      </p>
                      <ul className="space-y-2">
                        {insights.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold mt-0.5">
                              {i + 1}
                            </span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Meta Ads Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                  Meta Ads (Facebook & Instagram)
                  <Badge variant="secondary">{metaAds.length}</Badge>
                </h2>
                {scan.metaEnabled === "false" && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> API not configured
                  </span>
                )}
              </div>

              {metaAds.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    {scan.metaEnabled === "false"
                      ? "Ad scanning is not configured. Contact your administrator to enable live Meta ad detection."
                      : "No active Meta ads detected for this competitor."}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleMeta.map((ad, i) => <MetaAdCard key={ad.id} ad={ad} index={i} />)}
                  </div>
                  {metaAds.length > 6 && (
                    <Button variant="outline" size="sm" className="w-full gap-1.5"
                      onClick={() => setShowAllMeta(!showAllMeta)}>
                      {showAllMeta ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {metaAds.length} Meta ads</>}
                    </Button>
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* Google Ads Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-600" />
                  Google Search Ads
                  <Badge variant="secondary">{googleAds.length}</Badge>
                </h2>
                {scan.googleEnabled === "false" && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> API not configured
                  </span>
                )}
              </div>

              {googleAds.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    {scan.googleEnabled === "false"
                      ? "Google Ads scanning is not configured. Contact your administrator to enable live detection."
                      : "No Google Search Ads detected for this competitor."}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground w-24">Position</th>
                            <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground">Headline</th>
                            <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground w-48">Description</th>
                            <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground w-36">Landing Page</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleGoogle.map((ad, i) => <GoogleAdRow key={i} ad={ad} index={i} />)}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                  {googleAds.length > 5 && (
                    <Button variant="outline" size="sm" className="w-full gap-1.5"
                      onClick={() => setShowAllGoogle(!showAllGoogle)}>
                      {showAllGoogle ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {googleAds.length} Google ads</>}
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ─── Ad Copy Analyzer ─── */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Ad Copy Analyzer</h2>
          </div>
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Paste any competitor ad copy below — from Facebook, Google, Instagram, or any platform — and get an AI breakdown of their strategy.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Competitor Name (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={adCopyCompetitorName}
                    onChange={(e) => setAdCopyCompetitorName(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Platform</label>
                  <Select value={adCopyPlatform} onValueChange={setAdCopyPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Meta", "Google", "Instagram", "Twitter/X", "LinkedIn", "TikTok", "Other"].map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ad Copy</label>
                <Textarea
                  placeholder="Paste the full ad copy here — headline, body text, CTA, anything you can see..."
                  value={adCopyText}
                  onChange={(e) => setAdCopyText(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
              <button
                onClick={() => analyzeCopyMutation.mutate()}
                disabled={adCopyText.trim().length < 10 || analyzeCopyMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <RefreshCw className={cn("h-4 w-4", analyzeCopyMutation.isPending && "animate-spin")} />
                {analyzeCopyMutation.isPending ? "Analyzing..." : "Analyze Ad Copy"}
              </button>
            </CardContent>
          </Card>

          {analyzeCopyMutation.data && !analyzeCopyMutation.isPending && (() => {
            const r = analyzeCopyMutation.data;
            const ratingColor = r.overallRating === "Excellent" ? "text-green-700 bg-green-50 border-green-200"
              : r.overallRating === "Good" ? "text-blue-700 bg-blue-50 border-blue-200"
              : r.overallRating === "Average" ? "text-yellow-700 bg-yellow-50 border-yellow-200"
              : "text-red-700 bg-red-50 border-red-200";
            return (
              <Card className="mt-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" /> Ad Copy Breakdown
                    <span className={cn("text-xs font-semibold border px-2 py-0.5 rounded-full ml-auto", ratingColor)}>
                      {r.overallRating}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "Hook", value: r.hook, icon: <Zap className="h-3.5 w-3.5 text-yellow-500" /> },
                      { label: "Core Angle", value: r.angle, icon: <Target className="h-3.5 w-3.5 text-blue-500" /> },
                      { label: "Target Audience", value: r.targetAudience, icon: <Info className="h-3.5 w-3.5 text-purple-500" /> },
                      { label: "Value Proposition", value: r.valueProposition, icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> },
                      { label: "CTA Style", value: r.ctaStyle, icon: <Crosshair className="h-3.5 w-3.5 text-red-500" /> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-background border rounded-lg px-3 py-2.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">{icon} {label}</p>
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">Emotional Triggers</p>
                      <div className="flex flex-wrap gap-1">
                        {r.emotionalTriggers.map((t, i) => <span key={i} className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-full px-2 py-0.5">{t}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1.5">Strengths</p>
                      <ul className="space-y-1">
                        {r.strengths.map((s, i) => <li key={i} className="text-xs flex gap-1.5"><span className="text-green-500">✓</span>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Weaknesses</p>
                      <ul className="space-y-1">
                        {r.weaknesses.map((w, i) => <li key={i} className="text-xs flex gap-1.5"><span className="text-amber-500">⚠</span>{w}</li>)}
                      </ul>
                    </div>
                  </div>

                  {r.counterOpportunity && (
                    <div className="flex items-start gap-2.5 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                      <ShieldCheck className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Your Counter Opportunity</p>
                        <p className="text-sm">{r.counterOpportunity}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* ─── Counter Strategy ─── */}
        {competitors.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <Swords className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Counter Ad Strategy</h2>
            </div>
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a competitor and let AI generate a complete counter-advertising strategy — including ready-to-use ad concepts that position you to win.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-sm font-medium">Select Competitor</label>
                    <Select value={selectedCompetitorId} onValueChange={setSelectedCompetitorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a competitor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {competitors.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={() => counterStrategyMutation.mutate()}
                    disabled={!selectedCompetitorId || counterStrategyMutation.isPending}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors flex-shrink-0",
                      "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <RefreshCw className={cn("h-4 w-4", counterStrategyMutation.isPending && "animate-spin")} />
                    {counterStrategyMutation.isPending ? "Generating..." : "Generate Strategy"}
                  </button>
                </div>
                {counterStrategyMutation.data && !counterStrategyMutation.data.hasScanData && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    No scan data found for this competitor — strategy is based on their name/website only. Run a scan first for richer results.
                  </p>
                )}
              </CardContent>
            </Card>

            {counterStrategyMutation.data && !counterStrategyMutation.isPending && (() => {
              const s = counterStrategyMutation.data;
              return (
                <Card className="mt-4 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Swords className="h-4 w-4 text-primary" /> Counter Strategy — {s.competitorName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="bg-background border rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Their Current Strategy</p>
                      <p className="text-sm">{s.currentStrategy}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" /> Messaging Gaps to Exploit
                        </p>
                        <ul className="space-y-1.5">
                          {s.messagingGaps.map((g, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>{g}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5" /> Your Counter Angles
                        </p>
                        <ul className="space-y-1.5">
                          {s.counterAngles.map((a, i) => (
                            <li key={i} className="text-sm flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>{a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready-to-Use Ad Concepts
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {s.adConcepts.map((concept, i) => (
                          <div key={i} className="border rounded-xl p-4 bg-background space-y-2">
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              {concept.platform}
                            </span>
                            <p className="font-semibold text-sm leading-snug">{concept.headline}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{concept.body}</p>
                            <p className="text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-md px-2 py-1 inline-block">
                              CTA: {concept.cta}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {s.keywordOpportunities.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Keyword Opportunities</p>
                        <div className="flex flex-wrap gap-1.5">
                          {s.keywordOpportunities.map((kw, i) => (
                            <span key={i} className="text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded-full px-2.5 py-0.5">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" /> Next Steps
                      </p>
                      <ul className="space-y-1.5">
                        {s.recommendations.map((r, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
