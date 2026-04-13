import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3, TrendingUp, TrendingDown, Minus, Zap, Trophy,
  ArrowRight, Download, ChevronDown, Globe, Users, FileText,
  Briefcase, RotateCcw, ShieldCheck, AlertTriangle, Bookmark,
  BookmarkCheck, FolderOpen,
} from "lucide-react";

type UserBrand = {
  id: number;
  brandName: string;
  websiteUrl: string | null;
  industry: string | null;
};

type Competitor = {
  id: number;
  name: string;
  website: string | null;
  estimatedScore: number | null;
};

type Dimension = {
  key: string;
  label: string;
  brandScore: number;
  competitorScore: number;
};

type ComparisonResult = {
  brand: { id: number; name: string; website: string | null; industry: string | null; scores: Record<string, number> };
  competitor: { id: number; name: string; website: string | null; scores: Record<string, number> };
  dimensions: Dimension[];
  overallWinner: "brand" | "competitor";
  scoreDiff: number;
  brandWins: number;
  competitorWins: number;
  recommendations: string[];
};

function AnimatedBar({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), delay + 100);
    return () => clearTimeout(t);
  }, [score, delay]);
  return (
    <div className="h-3 bg-muted rounded-full overflow-hidden flex-1">
      <div
        className={cn("h-full rounded-full transition-all duration-1000 ease-out", color)}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function ScoreGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const frac = Math.min(elapsed / 1200, 1);
      const eased = 1 - Math.pow(1 - frac, 3);
      setDisplayed(Math.round(eased * score));
      if (frac < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("w-20 h-20 rounded-full border-4 flex items-center justify-center font-extrabold text-2xl", color)}>
        {displayed}
      </div>
      <span className="text-xs font-medium text-center text-muted-foreground">{label}</span>
    </div>
  );
}

export default function CompetitorAnalysis() {
  const sessionId = useSession();
  const { toast } = useToast();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: (data: {
      brandId: number | null;
      competitorId: number | null;
      brandName: string;
      competitorName: string;
      result: ComparisonResult;
    }) =>
      apiFetch<{ id: number }>("/user/saved-analyses/competitor", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (saved) => {
      setSavedId(saved.id);
      queryClient.invalidateQueries({ queryKey: ["saved-competitor-analyses"] });
      toast({ title: "Result saved!", description: "View it anytime in My Analysis." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: brands = [] } = useQuery<UserBrand[]>({
    queryKey: ["user-brands", sessionId],
    queryFn: () => apiFetch<UserBrand[]>("/user/brands"),
    enabled: !!sessionId,
  });

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors", sessionId],
    queryFn: () => apiFetch<Competitor[]>("/user/competitors"),
    enabled: !!sessionId,
  });

  const handleRun = async () => {
    if (!selectedBrandId || !selectedCompetitorId) {
      toast({ title: "Select both a brand and a competitor", variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    setSavedId(null);
    try {
      const data = await apiFetch<ComparisonResult>("/user/competitor-analysis", {
        method: "POST",
        body: JSON.stringify({ brandId: selectedBrandId, competitorId: selectedCompetitorId }),
      });
      setResult(data);
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result || !selectedBrand || !selectedCompetitor) return;
    saveMutation.mutate({
      brandId: selectedBrandId,
      competitorId: selectedCompetitorId,
      brandName: selectedBrand.brandName,
      competitorName: selectedCompetitor.name,
      result,
    });
  };

  const handleExportPDF = () => {
    window.print();
  };

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const selectedCompetitor = competitors.find(c => c.id === selectedCompetitorId);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6 print:py-0 print:px-0 print:space-y-4" ref={printRef}>

        {/* Print header */}
        <div className="hidden print:block mb-4">
          <h1 className="text-2xl font-bold">Competitor Analysis Report</h1>
          <p className="text-sm text-gray-500">Generated by Skorvia</p>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" /> Competitor Analysis
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Compare your brand head-to-head against any competitor across 6 dimensions
            </p>
          </div>
          {result && (
            <Button variant="outline" className="gap-2 flex-shrink-0" onClick={handleExportPDF}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
          )}
        </div>

        {/* Selector card */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm print:hidden">
          <h2 className="font-semibold text-base mb-5 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Set Up Your Comparison
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Brand selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" /> Your Brand
              </label>
              {brands.length === 0 ? (
                <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground">
                  <p className="mb-2">No brands added yet.</p>
                  <Link href="/my-brands">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" /> Add a Brand
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  <select
                    className="w-full border rounded-xl px-4 py-3 bg-background text-sm appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={selectedBrandId ?? ""}
                    onChange={(e) => {
                      setSelectedBrandId(e.target.value ? parseInt(e.target.value) : null);
                      setSelectedCompetitorId(null);
                      setResult(null);
                    }}
                  >
                    <option value="">— Select your brand —</option>
                    {brands.map(b => (
                      <option key={b.id} value={b.id}>{b.brandName}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>

            {/* Competitor selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4 text-orange-500" /> Competitor
              </label>
              {competitors.length === 0 ? (
                <div className="border rounded-xl p-4 text-center text-sm text-muted-foreground">
                  <p className="mb-2">No competitors added yet.</p>
                  <Link href="/competitors">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" /> Add Competitors
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  <select
                    className="w-full border rounded-xl px-4 py-3 bg-background text-sm appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    value={selectedCompetitorId ?? ""}
                    onChange={(e) => {
                      setSelectedCompetitorId(e.target.value ? parseInt(e.target.value) : null);
                      setResult(null);
                    }}
                  >
                    <option value="">— Select a competitor —</option>
                    {competitors.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={!selectedBrandId || !selectedCompetitorId || loading}
            className="gap-2 w-full sm:w-auto"
            size="lg"
          >
            {loading ? (
              <><RotateCcw className="h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><BarChart3 className="h-4 w-4" /> Run Comparison Analysis</>
            )}
          </Button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bg-card border rounded-2xl p-10 shadow-sm flex flex-col items-center gap-4 text-center print:hidden">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-lg">Comparing brands...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzing {selectedBrand?.brandName} vs {selectedCompetitor?.name} across 6 dimensions
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* Overall winner banner */}
            <div className={cn(
              "rounded-2xl p-6 border flex flex-col sm:flex-row items-center gap-5 shadow-sm",
              result.overallWinner === "brand"
                ? "bg-green-50 border-green-200"
                : "bg-orange-50 border-orange-200"
            )}>
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0",
                result.overallWinner === "brand" ? "bg-green-100" : "bg-orange-100"
              )}>
                <Trophy className={cn("h-7 w-7", result.overallWinner === "brand" ? "text-green-600" : "text-orange-600")} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className={cn("font-bold text-xl", result.overallWinner === "brand" ? "text-green-800" : "text-orange-800")}>
                  {result.overallWinner === "brand" ? `${result.brand.name} is ahead!` : `${result.competitor.name} is currently winning`}
                </p>
                <p className={cn("text-sm mt-1", result.overallWinner === "brand" ? "text-green-700" : "text-orange-700")}>
                  {result.overallWinner === "brand"
                    ? `${result.brand.name} leads by ${result.scoreDiff} points overall and wins ${result.brandWins} of 6 dimensions`
                    : `${result.competitor.name} leads by ${result.scoreDiff} points — ${result.brand.name} wins ${result.brandWins} of 6 dimensions`}
                </p>
              </div>
              <div className="flex gap-4 flex-shrink-0">
                <ScoreGauge score={result.brand.scores.overall} label={result.brand.name} color={cn("border-primary text-primary")} />
                <div className="flex items-center self-center">
                  <span className="text-xs font-bold text-muted-foreground">VS</span>
                </div>
                <ScoreGauge score={result.competitor.scores.overall} label={result.competitor.name} color="border-orange-400 text-orange-500" />
              </div>
            </div>

            {/* Dimension breakdown */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> 6-Dimension Breakdown
              </h2>

              <div className="flex items-center gap-4 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="font-medium">{result.brand.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-orange-400" />
                  <span className="font-medium">{result.competitor.name}</span>
                </div>
              </div>

              <div className="space-y-5">
                {result.dimensions.map((dim, i) => {
                  const diff = dim.brandScore - dim.competitorScore;
                  const winner = diff > 0 ? "brand" : diff < 0 ? "competitor" : "tie";
                  return (
                    <div key={dim.key} className={cn(
                      "p-4 rounded-xl border",
                      winner === "brand" ? "border-green-200 bg-green-50/50" :
                      winner === "competitor" ? "border-orange-200 bg-orange-50/50" :
                      "border-border bg-muted/20"
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm">{dim.label}</span>
                        <div className="flex items-center gap-2">
                          {winner === "brand" ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                              <TrendingUp className="h-3 w-3" /> You lead by {Math.abs(diff)}
                            </Badge>
                          ) : winner === "competitor" ? (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs gap-1">
                              <TrendingDown className="h-3 w-3" /> Behind by {Math.abs(diff)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Minus className="h-3 w-3" /> Tied
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs w-28 font-medium truncate">{result.brand.name}</span>
                          <AnimatedBar score={dim.brandScore} color="bg-primary" delay={i * 100} />
                          <span className="text-xs font-bold tabular-nums w-8 text-right text-primary">{dim.brandScore}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs w-28 text-muted-foreground truncate">{result.competitor.name}</span>
                          <AnimatedBar score={dim.competitorScore} color="bg-orange-400" delay={i * 100 + 50} />
                          <span className="text-xs font-bold tabular-nums w-8 text-right text-orange-500">{dim.competitorScore}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Score summary table */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Score Summary
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-3 font-semibold text-muted-foreground">Dimension</th>
                      <th className="text-center pb-3 font-semibold text-primary">{result.brand.name}</th>
                      <th className="text-center pb-3 font-semibold text-orange-500">{result.competitor.name}</th>
                      <th className="text-center pb-3 font-semibold text-muted-foreground">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dimensions.map((dim) => {
                      const diff = dim.brandScore - dim.competitorScore;
                      const winner = diff > 0 ? result.brand.name : diff < 0 ? result.competitor.name : "Tied";
                      return (
                        <tr key={dim.key} className="border-b last:border-0">
                          <td className="py-3 font-medium">{dim.label}</td>
                          <td className={cn("py-3 text-center font-bold tabular-nums", diff >= 0 ? "text-primary" : "text-muted-foreground")}>
                            {dim.brandScore}
                          </td>
                          <td className={cn("py-3 text-center font-bold tabular-nums", diff <= 0 ? "text-orange-500" : "text-muted-foreground")}>
                            {dim.competitorScore}
                          </td>
                          <td className="py-3 text-center">
                            <Badge
                              variant="secondary"
                              className={cn("text-xs",
                                diff > 0 ? "bg-green-100 text-green-700" :
                                diff < 0 ? "bg-orange-100 text-orange-700" :
                                "bg-muted text-muted-foreground"
                              )}
                            >
                              {winner}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 bg-muted/20">
                      <td className="py-3 font-bold">Overall Score</td>
                      <td className={cn("py-3 text-center font-extrabold tabular-nums text-lg",
                        result.overallWinner === "brand" ? "text-primary" : "text-muted-foreground"
                      )}>
                        {result.brand.scores.overall}
                      </td>
                      <td className={cn("py-3 text-center font-extrabold tabular-nums text-lg",
                        result.overallWinner === "competitor" ? "text-orange-500" : "text-muted-foreground"
                      )}>
                        {result.competitor.scores.overall}
                      </td>
                      <td className="py-3 text-center">
                        <Badge className={cn("text-xs",
                          result.overallWinner === "brand"
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        )}>
                          {result.overallWinner === "brand" ? result.brand.name : result.competitor.name}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Strategic Recommendations
              </h2>
              <div className="space-y-3">
                {result.recommendations.map((rec, i) => {
                  const isWarning = rec.toLowerCase().includes("critical") || rec.toLowerCase().includes("vulnerability") || rec.toLowerCase().includes("ahead");
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3 p-4 rounded-xl border",
                        isWarning ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50/60"
                      )}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isWarning
                          ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                          : <TrendingUp className="h-4 w-4 text-green-600" />}
                      </div>
                      <p className={cn("text-sm leading-relaxed", isWarning ? "text-amber-800" : "text-green-800")}>{rec}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Brand info section for print */}
            <div className="hidden print:block border rounded-xl p-4 text-sm text-gray-600 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold mb-1">{result.brand.name}</p>
                  {result.brand.website && <p className="flex items-center gap-1"><Globe className="h-3 w-3" /> {result.brand.website}</p>}
                  {result.brand.industry && <p className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {result.brand.industry}</p>}
                </div>
                <div>
                  <p className="font-bold mb-1">{result.competitor.name}</p>
                  {result.competitor.website && <p className="flex items-center gap-1"><Globe className="h-3 w-3" /> {result.competitor.website}</p>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 print:hidden">
              {savedId ? (
                <Button variant="outline" className="gap-2 border-green-300 text-green-700 bg-green-50 hover:bg-green-100" disabled>
                  <BookmarkCheck className="h-4 w-4" /> Saved to My Analysis
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  <Bookmark className="h-4 w-4" />
                  {saveMutation.isPending ? "Saving..." : "Save Result"}
                </Button>
              )}
              <Button variant="outline" className="gap-2" onClick={handleExportPDF}>
                <Download className="h-4 w-4" /> Export to PDF
              </Button>
              <Button variant="ghost" className="gap-2" onClick={() => { setResult(null); setSelectedCompetitorId(null); setSavedId(null); }}>
                <RotateCcw className="h-4 w-4" /> Run New Comparison
              </Button>
              <Link href="/my-analysis">
                <Button variant="ghost" className="gap-2">
                  <FolderOpen className="h-4 w-4" /> My Analysis
                </Button>
              </Link>
              <Link href="/analyze">
                <Button className="gap-2">
                  <FileText className="h-4 w-4" /> Run Full Brand Analysis
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Empty state when no result yet */}
        {!result && !loading && (
          <div className="bg-card border rounded-2xl p-10 shadow-sm flex flex-col items-center gap-4 text-center print:hidden">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-primary/60" />
            </div>
            <div>
              <p className="font-semibold text-lg">Ready to compare</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Select your brand and a competitor above, then click "Run Comparison Analysis" to see a detailed side-by-side breakdown.
              </p>
            </div>
            {brands.length === 0 && (
              <Link href="/my-brands">
                <Button variant="outline" className="gap-2">
                  <ArrowRight className="h-4 w-4" /> Add Your First Brand
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          nav, aside, header, [data-sidebar], [class*="sidebar"] { display: none !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}
