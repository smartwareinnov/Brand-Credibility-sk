import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";
import {
  FolderOpen, BarChart3, TrendingUp, Trash2, Download,
  Zap, ExternalLink, Globe, Trophy, ShieldCheck, Megaphone,
  FileText, AlertTriangle, CheckCircle2,
} from "lucide-react";

type Tab = "brand" | "competitor" | "ads";

type BrandAnalysis = {
  id: number;
  brandName: string;
  websiteUrl: string;
  industry: string;
  overallScore: number | null;
  adReadinessLevel: string | null;
  websiteScore: number | null;
  socialScore: number | null;
  contentScore: number | null;
  reviewsScore: number | null;
  messagingScore: number | null;
  createdAt: string;
  status: string;
};

type SavedCompetitorAnalysis = {
  id: number;
  brandName: string;
  competitorName: string;
  result: {
    brand: { id: number; name: string; website: string | null; industry: string | null; scores: Record<string, number> };
    competitor: { id: number; name: string; website: string | null; scores: Record<string, number> };
    dimensions: Array<{ key: string; label: string; brandScore: number; competitorScore: number }>;
    overallWinner: "brand" | "competitor";
    scoreDiff: number;
    brandWins: number;
    competitorWins: number;
    recommendations: string[];
  };
  createdAt: string;
};

type AdsScan = {
  id: number;
  competitorName: string;
  overallActivityScore: number | null;
  activityLabel: string | null;
  metaEnabled: string | null;
  googleEnabled: string | null;
  metaAds: Array<{ id: string; adCreativeBodies?: string[]; adCreativeLinkTitles?: string[]; pageName?: string }> | null;
  googleAds: Array<{ title: string; description?: string; displayed_link?: string }> | null;
  aiInsights: {
    summary: string;
    metaInsights: string[];
    googleInsights: string[];
    recommendations: string[];
    competitivePosition: string;
  } | null;
  cachedAt: string;
  createdAt: string;
};

const READINESS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ready: { label: "Ad-Ready", color: "text-green-700", bg: "bg-green-100" },
  almost_ready: { label: "Almost Ready", color: "text-blue-700", bg: "bg-blue-100" },
  getting_there: { label: "Getting There", color: "text-amber-700", bg: "bg-amber-100" },
  not_ready: { label: "Not Ready", color: "text-red-700", bg: "bg-red-100" },
};

function scoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-green-600";
  if (score >= 55) return "text-amber-600";
  if (score >= 35) return "text-orange-600";
  return "text-red-600";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="font-semibold text-lg">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export default function MyAnalysis() {
  const sessionId = useSession();
  const { toast } = useToast();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("brand");
  const [expandedCompetitor, setExpandedCompetitor] = useState<number | null>(null);
  const [expandedAds, setExpandedAds] = useState<number | null>(null);

  const { data: brandAnalyses = [], isLoading: brandLoading } = useQuery<BrandAnalysis[]>({
    queryKey: ["saved-brand-analyses", sessionId],
    queryFn: () => apiFetch<BrandAnalysis[]>("/user/saved-analyses/brand"),
    enabled: !!sessionId,
  });

  const { data: competitorAnalyses = [], isLoading: competitorLoading } = useQuery<SavedCompetitorAnalysis[]>({
    queryKey: ["saved-competitor-analyses", sessionId],
    queryFn: () => apiFetch<SavedCompetitorAnalysis[]>("/user/saved-analyses/competitor"),
    enabled: !!sessionId,
  });

  const { data: adScans = [], isLoading: adsLoading } = useQuery<AdsScan[]>({
    queryKey: ["saved-ads-analyses", sessionId],
    queryFn: () => apiFetch<AdsScan[]>("/user/saved-analyses/ads"),
    enabled: !!sessionId,
  });

  const deleteBrandMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/user/saved-analyses/brand/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-brand-analyses"] });
      toast({ title: "Analysis deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteCompetitorMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/user/saved-analyses/competitor/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-competitor-analyses"] });
      toast({ title: "Comparison deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteAdsMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/user/saved-analyses/ads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-ads-analyses"] });
      toast({ title: "Ads scan deleted" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handlePrintBrand = (analysis: BrandAnalysis) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const readiness = READINESS_CONFIG[analysis.adReadinessLevel ?? ""] ?? { label: "Unknown", color: "", bg: "" };
    win.document.write(`
      <html><head><title>${analysis.brandName} — Brand Analysis</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #111; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: #f0f0f0; }
        .score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
        .score-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
        .score-num { font-size: 32px; font-weight: 900; }
        .score-label { font-size: 12px; color: #888; margin-top: 4px; }
        .overall { grid-column: span 3; background: #f8faff; border-color: #c7d2fe; }
        .overall .score-num { font-size: 48px; color: #4f46e5; }
        footer { margin-top: 48px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
      </style></head><body>
      <h1>${analysis.brandName}</h1>
      <p class="subtitle">Brand Analysis Report · ${formatDate(analysis.createdAt)} · ${analysis.websiteUrl}</p>
      <span class="badge">${readiness.label}</span>
      <div class="score-grid">
        <div class="score-card overall">
          <div class="score-num">${analysis.overallScore ?? "—"}</div>
          <div class="score-label">Overall Brand Score</div>
        </div>
        <div class="score-card"><div class="score-num">${analysis.websiteScore ?? "—"}</div><div class="score-label">Website</div></div>
        <div class="score-card"><div class="score-num">${analysis.socialScore ?? "—"}</div><div class="score-label">Social Media</div></div>
        <div class="score-card"><div class="score-num">${analysis.contentScore ?? "—"}</div><div class="score-label">Content</div></div>
        <div class="score-card"><div class="score-num">${analysis.reviewsScore ?? "—"}</div><div class="score-label">Reviews</div></div>
        <div class="score-card"><div class="score-num">${analysis.messagingScore ?? "—"}</div><div class="score-label">Messaging</div></div>
      </div>
      <footer>Generated by Skorvia · skorvia.io</footer>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const handlePrintCompetitor = (saved: SavedCompetitorAnalysis) => {
    const win = window.open("", "_blank");
    if (!win) return;
    const r = saved.result;
    win.document.write(`
      <html><head><title>${saved.brandName} vs ${saved.competitorName}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #111; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
        table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; }
        th { background: #f9fafb; font-size: 13px; color: #555; }
        .win-brand { color: #4f46e5; font-weight: 700; }
        .win-comp { color: #f97316; font-weight: 700; }
        .winner-banner { padding: 16px 20px; border-radius: 12px; margin-bottom: 24px; background: ${r.overallWinner === "brand" ? "#f0fdf4" : "#fff7ed"}; border: 1px solid ${r.overallWinner === "brand" ? "#bbf7d0" : "#fed7aa"}; }
        footer { margin-top: 48px; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; }
        .rec-list { margin-top: 24px; }
        .rec-item { padding: 10px 14px; margin-bottom: 8px; border-radius: 8px; background: #fafafa; border: 1px solid #e5e7eb; font-size: 14px; }
      </style></head><body>
      <h1>${saved.brandName} vs ${saved.competitorName}</h1>
      <p class="subtitle">Competitor Analysis Report · ${formatDate(saved.createdAt)}</p>
      <div class="winner-banner">
        <strong>${r.overallWinner === "brand" ? `${r.brand.name} leads` : `${r.competitor.name} leads`}</strong> by ${r.scoreDiff} points overall.
        ${r.brand.name} wins ${r.brandWins} of ${r.dimensions.length} dimensions.
      </div>
      <table>
        <thead><tr><th>Dimension</th><th>${r.brand.name}</th><th>${r.competitor.name}</th><th>Winner</th></tr></thead>
        <tbody>
          ${r.dimensions.map(d => {
            const diff = d.brandScore - d.competitorScore;
            return `<tr>
              <td>${d.label}</td>
              <td class="${diff >= 0 ? "win-brand" : ""}">${d.brandScore}</td>
              <td class="${diff <= 0 ? "win-comp" : ""}">${d.competitorScore}</td>
              <td>${diff > 0 ? r.brand.name : diff < 0 ? r.competitor.name : "Tied"}</td>
            </tr>`;
          }).join("")}
          <tr style="font-weight:bold; background:#f9fafb;">
            <td>Overall Score</td>
            <td class="${r.overallWinner === "brand" ? "win-brand" : ""}">${r.brand.scores.overall}</td>
            <td class="${r.overallWinner === "competitor" ? "win-comp" : ""}">${r.competitor.scores.overall}</td>
            <td>${r.overallWinner === "brand" ? r.brand.name : r.competitor.name}</td>
          </tr>
        </tbody>
      </table>
      ${r.recommendations.length > 0 ? `
        <div class="rec-list">
          <h3 style="margin-bottom:12px;">Strategic Recommendations</h3>
          ${r.recommendations.map(rec => `<div class="rec-item">${rec}</div>`).join("")}
        </div>
      ` : ""}
      <footer>Generated by Skorvia · skorvia.io</footer>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "brand", label: "Brand Analysis", icon: FileText, count: brandAnalyses.length },
    { id: "competitor", label: "Competitor Analysis", icon: BarChart3, count: competitorAnalyses.length },
    { id: "ads", label: "Competitor Ads", icon: Megaphone, count: adScans.length },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary" /> My Analysis
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            All your saved brand analyses, competitor comparisons, and ads intelligence in one place
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl w-full sm:w-auto sm:inline-flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 sm:flex-none justify-center",
                activeTab === tab.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4 flex-shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
                  activeTab === tab.id ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Brand Analysis Tab ── */}
        {activeTab === "brand" && (
          <div className="space-y-3">
            {brandLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : brandAnalyses.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No brand analyses yet"
                description="Run your first brand analysis to see your Ad Readiness Score and personalized action plan."
                action={
                  <Link href="/analyze">
                    <Button className="gap-2"><Zap className="h-4 w-4" /> Run Brand Analysis</Button>
                  </Link>
                }
              />
            ) : (
              brandAnalyses.map(analysis => {
                const readiness = READINESS_CONFIG[analysis.adReadinessLevel ?? ""] ?? { label: "—", color: "text-muted-foreground", bg: "bg-muted" };
                return (
                  <div key={analysis.id} className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-xl text-primary">
                        {analysis.brandName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-base">{analysis.brandName}</p>
                          <Badge className={cn("text-xs", readiness.bg, readiness.color, "border-0")}>
                            {readiness.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <Globe className="h-3 w-3 flex-shrink-0" /> {analysis.websiteUrl}
                        </p>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          {analysis.overallScore !== null && (
                            <span className={cn("text-2xl font-extrabold tabular-nums", scoreColor(analysis.overallScore))}>
                              {analysis.overallScore}
                            </span>
                          )}
                          {[
                            { label: "Web", score: analysis.websiteScore },
                            { label: "Social", score: analysis.socialScore },
                            { label: "Content", score: analysis.contentScore },
                            { label: "Reviews", score: analysis.reviewsScore },
                          ].map(({ label, score }) => (
                            <div key={label} className="text-center">
                              <p className={cn("text-sm font-bold tabular-nums", scoreColor(score))}>{score ?? "—"}</p>
                              <p className="text-[10px] text-muted-foreground">{label}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{formatDate(analysis.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() => handlePrintBrand(analysis)}
                        >
                          <Download className="h-3.5 w-3.5" /> PDF
                        </Button>
                        <Link href={`/results/${analysis.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-500"
                          onClick={() => deleteBrandMutation.mutate(analysis.id)}
                          disabled={deleteBrandMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {brandAnalyses.length > 0 && (
              <div className="flex justify-end pt-1">
                <Link href="/analyze">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Run New Analysis
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Competitor Analysis Tab ── */}
        {activeTab === "competitor" && (
          <div className="space-y-3">
            {competitorLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : competitorAnalyses.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No saved comparisons yet"
                description="Run a competitor analysis and click 'Save Result' to keep it here for reference."
                action={
                  <Link href="/competitor-analysis">
                    <Button className="gap-2"><BarChart3 className="h-4 w-4" /> Run Competitor Analysis</Button>
                  </Link>
                }
              />
            ) : (
              competitorAnalyses.map(saved => {
                const r = saved.result;
                const isExpanded = expandedCompetitor === saved.id;
                return (
                  <div key={saved.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                          r.overallWinner === "brand" ? "bg-green-100" : "bg-orange-100"
                        )}>
                          <Trophy className={cn("h-6 w-6", r.overallWinner === "brand" ? "text-green-600" : "text-orange-600")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-base">
                              <span className="text-primary">{saved.brandName}</span>
                              <span className="text-muted-foreground mx-2 font-normal">vs</span>
                              <span className="text-orange-500">{saved.competitorName}</span>
                            </p>
                            <Badge className={cn(
                              "text-xs border-0",
                              r.overallWinner === "brand" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                            )}>
                              {r.overallWinner === "brand" ? `${saved.brandName} wins` : `${saved.competitorName} wins`}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-5 mt-2">
                            <div className="text-center">
                              <p className="text-xl font-extrabold text-primary tabular-nums">{r.brand.scores.overall}</p>
                              <p className="text-[10px] text-muted-foreground">{saved.brandName}</p>
                            </div>
                            <span className="text-xs font-bold text-muted-foreground">VS</span>
                            <div className="text-center">
                              <p className="text-xl font-extrabold text-orange-500 tabular-nums">{r.competitor.scores.overall}</p>
                              <p className="text-[10px] text-muted-foreground">{saved.competitorName}</p>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">{r.brandWins}</span> of {r.dimensions.length} dimensions won
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{formatDate(saved.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 h-8 text-xs"
                            onClick={() => handlePrintCompetitor(saved)}
                          >
                            <Download className="h-3.5 w-3.5" /> PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => setExpandedCompetitor(isExpanded ? null : saved.id)}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteCompetitorMutation.mutate(saved.id)}
                            disabled={deleteCompetitorMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t px-5 py-4 bg-muted/20 space-y-4">
                        <h3 className="text-sm font-semibold">6-Dimension Breakdown</h3>
                        <div className="space-y-3">
                          {r.dimensions.map(dim => {
                            const diff = dim.brandScore - dim.competitorScore;
                            const winner = diff > 0 ? "brand" : diff < 0 ? "competitor" : "tie";
                            return (
                              <div key={dim.key} className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium">{dim.label}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary tabular-nums">{dim.brandScore}</span>
                                    <span className="text-muted-foreground">vs</span>
                                    <span className="font-bold text-orange-500 tabular-nums">{dim.competitorScore}</span>
                                    {winner === "brand" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                    {winner === "competitor" && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                                  </div>
                                </div>
                                <div className="flex gap-1 h-2">
                                  <div className="flex-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${dim.brandScore}%` }} />
                                  </div>
                                  <div className="flex-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-orange-400 rounded-full" style={{ width: `${dim.competitorScore}%` }} />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {r.recommendations.length > 0 && (
                          <div className="space-y-2 pt-2 border-t">
                            <h3 className="text-sm font-semibold flex items-center gap-1.5">
                              <ShieldCheck className="h-4 w-4 text-primary" /> Recommendations
                            </h3>
                            {r.recommendations.slice(0, 3).map((rec, i) => (
                              <div key={i} className="flex gap-2 p-3 rounded-lg bg-background border text-xs text-muted-foreground leading-relaxed">
                                <TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                                {rec}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {competitorAnalyses.length > 0 && (
              <div className="flex justify-end pt-1">
                <Link href="/competitor-analysis">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" /> New Comparison
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Competitor Ads Intelligence Tab ── */}
        {activeTab === "ads" && (
          <div className="space-y-3">
            {adsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : adScans.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No ads scans yet"
                description="Scan a competitor's ads to see their Meta and Google ad activity, then view your results here."
                action={
                  <Link href="/competitor-ads">
                    <Button className="gap-2"><Megaphone className="h-4 w-4" /> Go to Ads Intelligence</Button>
                  </Link>
                }
              />
            ) : (
              adScans.map(scan => {
                const isExpanded = expandedAds === scan.id;
                const activityScore = scan.overallActivityScore ?? 0;
                const activityColor = activityScore >= 70 ? "text-red-600 bg-red-50 border-red-200"
                  : activityScore >= 40 ? "text-amber-700 bg-amber-50 border-amber-200"
                  : "text-green-700 bg-green-50 border-green-200";

                return (
                  <div key={scan.id} className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 font-bold text-xl text-violet-700">
                          {scan.competitorName[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-base">{scan.competitorName}</p>
                            {scan.activityLabel && (
                              <Badge className={cn("text-xs border", activityColor)}>
                                {scan.activityLabel}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            {scan.overallActivityScore !== null && (
                              <div className="text-center">
                                <p className={cn("text-2xl font-extrabold tabular-nums",
                                  activityScore >= 70 ? "text-red-600" : activityScore >= 40 ? "text-amber-600" : "text-green-600"
                                )}>
                                  {Math.round(scan.overallActivityScore)}
                                </p>
                                <p className="text-[10px] text-muted-foreground">Activity Score</p>
                              </div>
                            )}
                            {scan.metaEnabled === "true" && (
                              <Badge variant="outline" className="text-xs gap-1">
                                Meta: {scan.metaAds?.length ?? 0} ads
                              </Badge>
                            )}
                            {scan.googleEnabled === "true" && (
                              <Badge variant="outline" className="text-xs gap-1">
                                Google: {scan.googleAds?.length ?? 0} ads
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{formatDate(scan.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs gap-1"
                            onClick={() => setExpandedAds(isExpanded ? null : scan.id)}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteAdsMutation.mutate(scan.id)}
                            disabled={deleteAdsMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && scan.aiInsights && (
                      <div className="border-t px-5 py-4 bg-muted/20 space-y-4">
                        <p className="text-sm leading-relaxed text-muted-foreground">{scan.aiInsights.summary}</p>

                        {scan.aiInsights.metaInsights.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meta Insights</h3>
                            {scan.aiInsights.metaInsights.map((insight, i) => (
                              <div key={i} className="flex gap-2 p-3 rounded-lg bg-background border text-xs text-muted-foreground leading-relaxed">
                                <TrendingUp className="h-3.5 w-3.5 text-blue-500 flex-shrink-0 mt-0.5" /> {insight}
                              </div>
                            ))}
                          </div>
                        )}

                        {scan.aiInsights.recommendations.length > 0 && (
                          <div className="space-y-2 pt-2 border-t">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommendations</h3>
                            {scan.aiInsights.recommendations.map((rec, i) => (
                              <div key={i} className="flex gap-2 p-3 rounded-lg bg-background border text-xs text-muted-foreground leading-relaxed">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" /> {rec}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {adScans.length > 0 && (
              <div className="flex justify-end pt-1">
                <Link href="/competitor-ads">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" /> New Ads Scan
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
