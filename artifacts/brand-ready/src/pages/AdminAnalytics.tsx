import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Globe, TrendingUp, Zap, Users, CreditCard, Clock } from "lucide-react";
import {
  useGetAdminStats, getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";

export default function AdminAnalytics() {
  const adminHeaders = getAdminHeaders();

  const { data: stats, isLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey(), retry: false },
    request: { headers: adminHeaders },
  });

  const avgScore = stats?.averageScore != null ? Math.round(stats.averageScore) : null;
  const adReadyPct = stats?.totalAnalyses && stats.totalAnalyses > 0
    ? Math.round(((stats as unknown as Record<string, number>).adReadyCount ?? 0) / stats.totalAnalyses * 100)
    : null;

  const scoreRanges = [
    { range: "81–100", label: "Ad Ready", color: "bg-green-500" },
    { range: "61–80", label: "Almost Ready", color: "bg-blue-500" },
    { range: "41–60", label: "Progressing", color: "bg-yellow-500" },
    { range: "21–40", label: "Getting There", color: "bg-orange-500" },
    { range: "0–20", label: "Not Ready", color: "bg-red-500" },
  ];

  return (
    <AdminAuthGate>
      <AdminLayout title="Analytics" subtitle="Platform performance and usage metrics">
        <div className="space-y-6">

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Scans", value: stats?.totalAnalyses, icon: Zap },
              { label: "This Month", value: stats?.analysesThisMonth, icon: BarChart3 },
              { label: "Scans Today", value: stats?.scansToday, icon: TrendingUp },
              { label: "Avg Score", value: avgScore != null ? `${avgScore}/100` : null, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-7 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{value ?? "—"}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scan activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Scan Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total Scans", value: stats?.totalAnalyses },
                  { label: "This Month", value: stats?.analysesThisMonth },
                  { label: "Today", value: stats?.scansToday },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      <span className="font-semibold tabular-nums">{value?.toLocaleString() ?? "—"}</span>
                    )}
                  </div>
                ))}
                <div className="mt-3 rounded-lg bg-muted/40 p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">Per-month breakdown chart available in a future update.</p>
                </div>
              </CardContent>
            </Card>

            {/* Score snapshot */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Score Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    {isLoading ? (
                      <Skeleton className="h-12 w-20" />
                    ) : (
                      <p className="text-4xl font-extrabold text-primary">{avgScore ?? "—"}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">Platform Avg Score</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {scoreRanges.map((r) => (
                      <div key={r.range} className="flex items-center gap-2 text-xs">
                        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${r.color}`} />
                        <span className="font-mono text-muted-foreground w-12">{r.range}</span>
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">Score distribution breakdown available in a future update.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Country — coming soon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Revenue by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground space-y-2">
                <Globe className="h-10 w-10 mx-auto opacity-20" />
                <p className="text-sm font-medium">Revenue geo-breakdown coming soon</p>
                <p className="text-xs">Country-level revenue tracking requires payment integration to be configured.</p>
              </div>
            </CardContent>
          </Card>

          {/* Analyses by Industry — coming soon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Analyses by Industry
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (stats?.totalAnalyses ?? 0) === 0 ? (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <BarChart3 className="h-10 w-10 mx-auto opacity-20" />
                  <p className="text-sm font-medium">No analyses yet</p>
                  <p className="text-xs">Industry breakdown will appear once users complete brand analyses.</p>
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground space-y-2">
                  <p className="text-sm font-medium">{stats!.totalAnalyses.toLocaleString()} total {stats!.totalAnalyses === 1 ? "analysis" : "analyses"} recorded</p>
                  <p className="text-xs">Per-industry breakdown available in a future update.</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    </AdminAuthGate>
  );
}
