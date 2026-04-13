import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/lib/useApi";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Trophy, Users, TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Benchmark {
  industry: string;
  brandCount: number;
  avgOverall: number | null;
  avgWebsite: number | null;
  avgSocial: number | null;
  avgContent: number | null;
  avgReviews: number | null;
  avgMessaging: number | null;
  adReadyPercent: number;
}

interface BenchmarkResponse {
  benchmarks: Benchmark[];
  userIndustry: string | null;
  userLatestScore: number | null;
  totalBrandsAnalyzed: number;
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number | null; max?: number }) {
  if (value == null) return null;
  const color = value >= 70 ? "bg-green-500" : value >= 50 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

function capitalizeWords(s: string) {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

export default function IndustryBenchmarks() {
  const { apiFetch } = useApi();

  const { data, isLoading } = useQuery<BenchmarkResponse>({
    queryKey: ["industry-benchmarks"],
    queryFn: () => apiFetch<BenchmarkResponse>("/benchmarks/industry"),
    staleTime: 5 * 60 * 1000,
  });

  const userIndustryBenchmark = data?.benchmarks.find(b => b.industry === data.userIndustry);
  const userScoreDelta = (data?.userLatestScore != null && userIndustryBenchmark?.avgOverall != null)
    ? Math.round(data.userLatestScore - userIndustryBenchmark.avgOverall)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Industry Benchmark Database
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregate anonymized data from all brands analyzed on Skorvia. See how your industry stacks up.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Brands Analyzed</p>
                      <p className="text-2xl font-bold">{data?.totalBrandsAnalyzed ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Industries Tracked</p>
                      <p className="text-2xl font-bold">{data?.benchmarks.length ?? 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {data?.userLatestScore != null && userIndustryBenchmark && (
                <Card className={cn("border", userScoreDelta != null && userScoreDelta > 0 ? "border-green-200 bg-green-50/50" : "border-orange-200 bg-orange-50/50")}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", userScoreDelta != null && userScoreDelta > 0 ? "bg-green-100" : "bg-orange-100")}>
                        <Target className={cn("h-5 w-5", userScoreDelta != null && userScoreDelta > 0 ? "text-green-600" : "text-orange-600")} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Your vs Industry Avg</p>
                        <p className="text-2xl font-bold">
                          {data.userLatestScore}
                          {userScoreDelta != null && (
                            <span className={cn("text-sm font-semibold ml-1", userScoreDelta > 0 ? "text-green-600" : "text-red-500")}>
                              ({userScoreDelta > 0 ? "+" : ""}{userScoreDelta})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">Industry avg: {userIndustryBenchmark.avgOverall}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {(data?.benchmarks.length ?? 0) === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Building the benchmark database</h3>
                  <p className="text-sm text-muted-foreground">Run your first brand analysis to be part of the anonymized benchmark data</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {data?.benchmarks.map((b, i) => (
                  <Card key={b.industry} className={cn(b.industry === data?.userIndustry && "ring-2 ring-primary ring-offset-1")}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                            i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                          )}>
                            {i + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm">{capitalizeWords(b.industry)}</h3>
                              {b.industry === data?.userIndustry && (
                                <Badge variant="secondary" className="text-xs">Your Industry</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{b.brandCount} brand{b.brandCount !== 1 ? "s" : ""} analyzed</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-2xl font-bold">{b.avgOverall ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">avg score</p>
                          <Badge
                            variant="outline"
                            className={cn("text-xs mt-1",
                              b.adReadyPercent >= 50 ? "border-green-200 text-green-700 bg-green-50" : "border-orange-200 text-orange-700 bg-orange-50"
                            )}
                          >
                            {b.adReadyPercent}% ad-ready
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                        <ScoreBar label="Website" value={b.avgWebsite} />
                        <ScoreBar label="Social" value={b.avgSocial} />
                        <ScoreBar label="Content" value={b.avgContent} />
                        <ScoreBar label="Reviews" value={b.avgReviews} />
                        <ScoreBar label="Messaging" value={b.avgMessaging} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
