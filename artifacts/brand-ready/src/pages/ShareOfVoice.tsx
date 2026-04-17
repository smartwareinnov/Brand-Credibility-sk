import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, RefreshCw, Info, Megaphone, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type SovData = {
  brandName: string;
  brandMentions: number;
  brandSharePercent: number;
  competitors: { name: string; mentions: number; sharePercent: number }[];
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
  totalMentions: number;
};

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

function SentimentBar({ positive, neutral, negative, total }: { positive: number; neutral: number; negative: number; total: number }) {
  if (total === 0) return <p className="text-xs text-muted-foreground">No mentions yet</p>;
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {positive > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(positive / total) * 100}%` }} />}
        {neutral > 0 && <div className="bg-slate-300 transition-all" style={{ width: `${(neutral / total) * 100}%` }} />}
        {negative > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(negative / total) * 100}%` }} />}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1" />{positive} positive</span>
        <span><span className="inline-block w-2 h-2 bg-slate-300 rounded-full mr-1" />{neutral} neutral</span>
        <span><span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-1" />{negative} negative</span>
      </div>
    </div>
  );
}

export default function ShareOfVoice() {
  const { apiFetch } = useApi();

  const { data, isLoading, refetch, isFetching } = useQuery<SovData>({
    queryKey: ["share-of-voice-page"],
    queryFn: () => apiFetch<SovData>("/user/competitors/share-of-voice"),
    staleTime: 5 * 60 * 1000,
  });

  const allBrands = data
    ? [
        { name: data.brandName, sharePercent: data.brandSharePercent, mentions: data.brandMentions, isUser: true },
        ...(data.competitors ?? []).map((c) => ({ ...c, isUser: false })),
      ]
    : [];

  const pieData = allBrands.map((b, i) => ({
    name: b.name,
    value: b.sharePercent,
    color: COLORS[i % COLORS.length],
  }));

  const hasData = (data?.totalMentions ?? 0) > 0;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" /> Share of Voice
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              How often your brand is mentioned vs. competitors in online conversations
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-blue-50/50 border-blue-100">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Share of Voice</strong> measures how much of the online conversation in your niche belongs to your brand vs. competitors. A higher share means more visibility, more trust signals, and better ad performance. Enterprise PR tools charge thousands for this — it's built right into Skorvia.
          </p>
        </div>

        {/* Main SOV card */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pie chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Conversation Share</CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : hasData
                  ? `Based on ${data!.totalMentions} total brand mentions tracked`
                  : "Add brand mentions to see your share of voice"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-52 w-full rounded-xl" />
              ) : !hasData ? (
                <div className="h-52 flex flex-col items-center justify-center text-center gap-3">
                  <Megaphone className="h-10 w-10 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium">No mention data yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Go to Brand Mentions and scan for mentions to populate this chart.
                    </p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value}%`, "Share"]} />
                    <Legend
                      formatter={(value) => <span className="text-xs">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Brand breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Brand Breakdown</CardTitle>
              <CardDescription>Mention share per brand</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)
              ) : allBrands.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data available yet.</p>
              ) : (
                allBrands.map((brand, i) => (
                  <div key={brand.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium truncate max-w-[160px]">{brand.name}</span>
                        {brand.isUser && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{brand.mentions} mentions</span>
                        <span className="text-sm font-bold tabular-nums">{brand.sharePercent}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${brand.sharePercent}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sentiment breakdown */}
        {!isLoading && hasData && data && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Your Brand Mention Sentiment
              </CardTitle>
              <CardDescription>
                Sentiment breakdown of your brand's {data.brandMentions} tracked mentions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SentimentBar
                positive={data.sentimentBreakdown.positive}
                neutral={data.sentimentBreakdown.neutral}
                negative={data.sentimentBreakdown.negative}
                total={data.brandMentions}
              />
            </CardContent>
          </Card>
        )}

        {/* How to improve */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How to Increase Your Share of Voice</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                { tip: "Publish consistent content on LinkedIn and X/Twitter — each post is a potential mention.", icon: "📝" },
                { tip: "Get featured in industry newsletters and blogs. One press mention can equal 50+ organic mentions.", icon: "📰" },
                { tip: "Respond to every comment and review — engagement signals boost algorithmic visibility.", icon: "💬" },
                { tip: "Run a PR campaign targeting journalists in your niche. Use the Press Release Builder to get started.", icon: "🎯" },
                { tip: "Partner with micro-influencers in your industry for authentic brand mentions.", icon: "🤝" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="text-base flex-shrink-0">{item.icon}</span>
                  <span className="text-muted-foreground leading-relaxed">{item.tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
