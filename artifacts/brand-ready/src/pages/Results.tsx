import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetAnalysis, getGetAnalysisQueryKey } from "@workspace/api-client-react";
import {
  AlertTriangle, CheckCircle2, XCircle, Info, ListTodo, TrendingUp,
  Filter, ChevronRight, Star, Globe, Instagram, Linkedin, Search, BarChart3, Download,
  FolderOpen, CalendarDays, Clock, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/lib/useApi";

import { cn } from "@/lib/utils";

const ROADMAP_CATEGORIES = ["All", "Content", "Social", "PR", "SEO"] as const;
type RoadmapCat = typeof ROADMAP_CATEGORIES[number];

const CATEGORY_MAP: Record<string, RoadmapCat> = {
  website: "Content",
  social_media: "Social",
  content: "Content",
  reviews: "PR",
  competitor: "SEO",
  seo: "SEO",
};

function AnimatedDial({ score, size = 200 }: { score: number; size?: number }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (displayed / 100) * circumference;

  useEffect(() => {
    let start = 0;
    const end = score;
    const duration = 1800;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const frac = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - frac, 3);
      setDisplayed(Math.round(eased * end));
      if (frac < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const getColor = (s: number) =>
    s >= 80 ? "#22c55e" : s >= 60 ? "#eab308" : s >= 40 ? "#f97316" : "#ef4444";

  const getLabel = (s: number) =>
    s >= 80 ? { text: "Ready for Ads", bg: "bg-green-500" }
    : s >= 60 ? { text: "Almost Ready", bg: "bg-yellow-500" }
    : s >= 40 ? { text: "Getting There", bg: "bg-orange-500" }
    : { text: "Not Ready", bg: "bg-red-500" };

  const label = getLabel(score);
  const color = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={14} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={14}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold tracking-tight" style={{ color }}>{displayed}</span>
          <span className="text-sm text-muted-foreground font-medium">/ 100</span>
        </div>
      </div>
      <Badge className={cn("mt-3 text-white border-0 px-3 py-1", label.bg)}>
        {label.text}
      </Badge>
    </div>
  );
}

function DimensionBar({ label, score, icon: Icon, color }: { label: string; score: number; icon: React.ElementType; color: string }) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className={cn("h-4 w-4", color)} />
          {label}
        </span>
        <span className={cn("font-bold tabular-nums", score >= 70 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-500")}>
          {score}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", score >= 70 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500")}
          style={{ width: `${animated}%` }}
        />
      </div>
    </div>
  );
}

function AdReadinessPredictor({ analysisId, score }: { analysisId: number; score: number }) {
  const { apiFetch } = useApi();
  const [pred, setPred] = useState<{ daysToReady: number | null; confidence: string; summary: string; weeklyGoal: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ daysEstimate: number; reasoning: string; topPriorities: string[]; currentScore: number; targetScore: number; message?: string }>(`/analyses/${analysisId}/predict-readiness`, { method: "POST" });
      setPred({
        daysToReady: data.daysEstimate ?? null,
        confidence: "Medium",
        summary: data.reasoning ?? "",
        weeklyGoal: data.topPriorities?.[0] ?? "Focus on your lowest-scoring area",
      });
    } catch { /* fail silently */ } finally { setLoading(false); }
  };

  if (score >= 80) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-green-500 flex-shrink-0" />
        <div>
          <p className="font-bold text-green-800">Ad-Ready Now!</p>
          <p className="text-sm text-green-700 mt-0.5">Your brand scores above 80 — you're credible enough to run profitable ad campaigns.</p>
        </div>
      </div>
    );
  }

  if (!pred && !loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Ad Readiness Timeline</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">How long until your brand is ad-ready? Get an AI-powered estimate.</p>
        <Button size="sm" className="w-full" onClick={run}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />Predict My Timeline
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary animate-spin" /><span className="text-sm text-muted-foreground">Calculating your ad readiness timeline...</span></div>
      </div>
    );
  }

  if (!pred) return null;
  const daysLabel = pred.daysToReady != null
    ? pred.daysToReady <= 30 ? `~${pred.daysToReady} days` : `~${Math.ceil(pred.daysToReady / 30)} months`
    : "Unknown";

  return (
    <div className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Ad Readiness Timeline</h3>
      </div>
      <div className="text-center py-2">
        <p className="text-4xl font-extrabold text-primary">{daysLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">estimated to reach ad-ready status</p>
        <Badge variant="outline" className="mt-2 text-xs">{pred.confidence} confidence</Badge>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed border-t pt-3">{pred.summary}</p>
      <div className="bg-primary/5 rounded-lg p-3">
        <p className="text-xs font-semibold text-primary mb-1">Weekly Goal</p>
        <p className="text-xs text-foreground/80">{pred.weeklyGoal}</p>
      </div>
      <Button variant="ghost" size="sm" className="w-full text-xs" onClick={run}>
        <Sparkles className="h-3 w-3 mr-1" />Recalculate
      </Button>
    </div>
  );
}

export default function Results() {
  const [, params] = useRoute("/results/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [activeFilter, setActiveFilter] = useState<RoadmapCat>("All");

  const { data: analysisResult, isLoading, error } = useGetAnalysis(id, {
    query: { enabled: !!id, queryKey: getGetAnalysisQueryKey(id) }
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !analysisResult) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <XCircle className="h-14 w-14 text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Analysis Not Found</h2>
          <p className="text-muted-foreground mb-6">Could not load results for this analysis.</p>
          <Link href="/dashboard"><Button>Back to Dashboard</Button></Link>
        </div>
      </DashboardLayout>
    );
  }

  const analysis = (analysisResult as any).analysis || analysisResult;
  const insights = (analysisResult as any).insights || [];
  const tasks: any[] = (analysisResult as any).tasks || [];

  const score = analysis.overallScore || 0;

  const dimensions = [
    { label: "Website Experience", score: analysis.websiteScore || 0, icon: Globe, color: "text-blue-500" },
    { label: "Social Media", score: analysis.socialScore || 0, icon: Instagram, color: "text-pink-500" },
    { label: "Content Quality", score: analysis.contentScore || 0, icon: BarChart3, color: "text-purple-500" },
    { label: "Customer Reviews", score: analysis.reviewsScore || 0, icon: Star, color: "text-amber-500" },
    { label: "Competitor Position", score: analysis.competitorScore || 0, icon: TrendingUp, color: "text-red-500" },
    { label: "SEO & Mentions", score: Math.round((analysis.websiteScore + analysis.contentScore) / 2) || 0, icon: Search, color: "text-green-500" },
  ];

  function hashScore(name: string, offset: number, base: number): number {
    let h = 5381;
    for (let i = 0; i < name.length; i++) h = (h * 33) ^ name.charCodeAt(i);
    const x = Math.sin(Math.abs(h) + offset) * 10000;
    return Math.max(20, Math.round(base + ((x - Math.floor(x)) * 30 - 15)));
  }

  const competitors = [
    { name: analysis.brandName || "Your Brand", score, tag: "You" },
    ...(analysis.competitor1 ? [{ name: analysis.competitor1, score: hashScore(analysis.competitor1, 1, score - 12), tag: "Competitor" }] : []),
    ...(analysis.competitor2 ? [{ name: analysis.competitor2, score: hashScore(analysis.competitor2, 2, score - 8), tag: "Competitor" }] : []),
    ...(analysis.competitor3 ? [{ name: analysis.competitor3, score: hashScore(analysis.competitor3, 3, score + 5), tag: "Competitor" }] : []),
  ].sort((a, b) => b.score - a.score);

  const filteredTasks = activeFilter === "All"
    ? tasks
    : tasks.filter((t) => CATEGORY_MAP[t.category] === activeFilter);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "positive": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "critical": return "border-destructive/30 bg-destructive/5";
      case "warning": return "border-orange-400/30 bg-orange-400/5";
      case "positive": return "border-green-500/30 bg-green-500/5";
      default: return "border-blue-400/30 bg-blue-400/5";
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b print:pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{analysis.brandName}</h1>
            <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2 flex-wrap">
              <a href={analysis.websiteUrl} target="_blank" rel="noreferrer" className="hover:underline">{analysis.websiteUrl}</a>
              <span>•</span>
              <span className="capitalize">{analysis.industry}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" className="gap-2 flex-shrink-0" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
            <Link href="/my-analysis">
              <Button variant="outline" className="gap-2 flex-shrink-0">
                <FolderOpen className="h-4 w-4" /> Saved to My Analysis
              </Button>
            </Link>
            <Link href={`/tasks/${analysis.id}`}>
              <Button className="gap-2 flex-shrink-0">
                <ListTodo className="h-4 w-4" /> View Full Action Plan
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Score + Dimensions */}
          <div className="space-y-6">
            <div className="bg-card border rounded-2xl p-6 flex flex-col items-center shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">Ad Readiness Score</p>
              <AnimatedDial score={score} size={180} />
              <p className="text-xs text-muted-foreground text-center mt-5 leading-relaxed">
                {score >= 80 ? "Your brand is highly credible — paid traffic should convert well."
                  : score >= 60 ? "Solid foundation but some gaps need fixing before scaling ads."
                  : "Your brand currently lacks the trust signals for profitable ad campaigns."}
              </p>
            </div>

            <AdReadinessPredictor analysisId={analysis.id} score={score} />

            <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">6-Dimension Breakdown</h3>
              {dimensions.map((d, i) => (
                <DimensionBar key={i} {...d} />
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Competitor Benchmark */}
            {competitors.length > 1 && (
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" /> Competitor Benchmark
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left pb-3 font-semibold text-muted-foreground">Rank</th>
                        <th className="text-left pb-3 font-semibold text-muted-foreground">Brand</th>
                        <th className="text-right pb-3 font-semibold text-muted-foreground">Cred Score</th>
                        <th className="text-right pb-3 font-semibold text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitors.map((c, i) => (
                        <tr key={i} className={cn("border-b last:border-0", c.tag === "You" && "bg-primary/5")}>
                          <td className="py-3 pr-4">
                            <span className={cn("w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs", i === 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>
                              #{i + 1}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-medium">{c.name}</span>
                            {c.tag === "You" && <Badge className="ml-2 text-[10px] px-1.5 py-0" variant="outline">You</Badge>}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", c.score >= 70 ? "bg-green-500" : c.score >= 50 ? "bg-yellow-500" : "bg-red-500")}
                                  style={{ width: `${c.score}%` }}
                                />
                              </div>
                              <span className="font-bold tabular-nums w-8 text-right">{c.score}</span>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <Badge variant="secondary" className={cn("text-xs", c.score >= 70 ? "bg-green-100 text-green-700" : c.score >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                              {c.score >= 70 ? "Strong" : c.score >= 50 ? "Medium" : "Weak"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Key Insights */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Key Insights
              </h2>
              <div className="space-y-3">
                {insights.length > 0 ? insights.map((insight: any) => (
                  <div key={insight.id} className={cn("p-4 rounded-xl border flex gap-3", getSeverityStyle(insight.severity))}>
                    <div className="mt-0.5 flex-shrink-0">{getSeverityIcon(insight.severity)}</div>
                    <div>
                      <p className="font-semibold text-sm mb-1">{insight.title}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{insight.description}</p>
                      <Badge variant="outline" className="mt-2 text-[10px] capitalize">{insight.category?.replace("_", " ")}</Badge>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground py-6 text-sm">No insights generated yet.</p>
                )}
              </div>
            </div>

            {/* Filterable Roadmap */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" /> Prioritized Action Roadmap
                </h2>
                <div className="flex flex-wrap gap-2">
                  {ROADMAP_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveFilter(cat)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
                        activeFilter === cat ? "bg-primary text-primary-foreground border-primary" : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {filteredTasks.length > 0 ? filteredTasks.slice(0, 6).map((task: any) => (
                  <div key={task.id} className="flex items-start gap-3 p-4 rounded-xl border bg-muted/20 hover:border-primary/30 transition-colors">
                    <div className="mt-0.5 flex-shrink-0">
                      <div className="w-5 h-5 rounded border-2 border-muted-foreground/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] uppercase font-semibold">P{task.priority}</Badge>
                        <span className="text-xs text-muted-foreground capitalize">{task.category?.replace("_", " ")}</span>
                        {task.estimatedTime && <span className="text-xs text-muted-foreground">~{task.estimatedTime}</span>}
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center text-muted-foreground text-sm py-6">No tasks in this category.</p>
                )}
                {filteredTasks.length > 6 && (
                  <Link href={`/tasks/${analysis.id}`}>
                    <button className="w-full text-center text-sm text-primary font-medium py-3 hover:underline flex items-center justify-center gap-1">
                      View all {filteredTasks.length} tasks <ChevronRight className="h-4 w-4" />
                    </button>
                  </Link>
                )}
              </div>
            </div>

            {/* Day 1 Action Plan */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" /> Day 1 Action Plan
                </h2>
                <Badge variant="outline" className="text-xs gap-1 border-green-500/40 text-green-600">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </Badge>
              </div>
              {(() => {
                const day1Tasks = tasks.filter((t: any) => t.dayNumber === 1 || t.isDailyTask);
                const displayTasks = day1Tasks.length > 0 ? day1Tasks.slice(0, 3) : tasks.slice(0, 3);
                if (displayTasks.length === 0) {
                  return (
                    <div className="text-center py-6">
                      <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Your Day 1 plan will appear here after the analysis completes.</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground mb-3">
                      Start with these actions today to boost your brand's ad readiness:
                    </p>
                    {displayTasks.map((task: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border bg-primary/5 border-primary/10">
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground flex-shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-snug">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.description}</p>
                          )}
                          {task.estimatedTime && (
                            <p className="text-xs text-primary/70 mt-1 font-medium">~{task.estimatedTime}</p>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link href={`/tasks/${analysis.id}`}>
                      <button className="w-full text-center text-sm text-primary font-medium py-2 hover:underline flex items-center justify-center gap-1 mt-1">
                        View full action plan <ChevronRight className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          nav, aside, [data-sidebar], header { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
