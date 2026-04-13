import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/lib/useApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Camera, RefreshCw, Info } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Competitor {
  id: number;
  name: string;
  estimatedScore: number | null;
  websiteScore: number | null;
  socialScore: number | null;
  contentScore: number | null;
  reviewsScore: number | null;
  messagingScore: number | null;
}

interface Snapshot {
  id: number;
  competitorId: number;
  competitorName: string;
  overallScore: number | null;
  websiteScore: number | null;
  socialScore: number | null;
  contentScore: number | null;
  reviewsScore: number | null;
  messagingScore: number | null;
  recordedAt: string;
}

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

export default function CompetitorScoreTracker() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [metric, setMetric] = useState<string>("overallScore");

  const { data: competitors = [], isLoading: loadingCompetitors } = useQuery<Competitor[]>({
    queryKey: ["competitors-list"],
    queryFn: () => apiFetch<Competitor[]>("/user/competitors"),
  });

  useEffect(() => {
    if (competitors.length > 0 && !selectedId) {
      setSelectedId(String(competitors[0].id));
    }
  }, [competitors, selectedId]);

  const { data: history = [], isLoading: loadingHistory } = useQuery<Snapshot[]>({
    queryKey: ["competitor-history", selectedId],
    queryFn: () => apiFetch<Snapshot[]>(`/user/competitors/${selectedId}/history`),
    enabled: !!selectedId,
    staleTime: 60000,
  });

  const snapshotMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/user/competitors/${id}/snapshot`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitor-history", selectedId] });
      toast({ title: "Snapshot saved!", description: "Current scores recorded for trend tracking" });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed to save snapshot", description: String(err) }),
  });

  const selectedCompetitor = competitors.find(c => String(c.id) === selectedId);

  const METRICS = [
    { value: "overallScore", label: "Overall Score" },
    { value: "websiteScore", label: "Website" },
    { value: "socialScore", label: "Social" },
    { value: "contentScore", label: "Content" },
    { value: "reviewsScore", label: "Reviews" },
    { value: "messagingScore", label: "Messaging" },
  ];

  const chartData = history.map(s => ({
    date: format(new Date(s.recordedAt), "MMM d"),
    [metric]: s[metric as keyof Snapshot] as number | null,
  }));

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];
  const scoreDelta = latest && previous && latest.overallScore != null && previous.overallScore != null
    ? Math.round(latest.overallScore - previous.overallScore)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Competitor Score Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your competitors' brand scores over time. Save snapshots to build a 90-day trend.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          {loadingCompetitors ? (
            <Skeleton className="h-10 w-48" />
          ) : (
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select competitor" />
              </SelectTrigger>
              <SelectContent>
                {competitors.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={metric} onValueChange={setMetric}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METRICS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => selectedId && snapshotMutation.mutate(selectedId)}
            disabled={!selectedId || snapshotMutation.isPending}
          >
            {snapshotMutation.isPending
              ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              : <><Camera className="h-4 w-4 mr-2" />Save Snapshot</>
            }
          </Button>
        </div>

        {selectedCompetitor && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Overall", value: selectedCompetitor.estimatedScore },
              { label: "Website", value: selectedCompetitor.websiteScore },
              { label: "Social", value: selectedCompetitor.socialScore },
              { label: "Content", value: selectedCompetitor.contentScore },
              { label: "Reviews", value: selectedCompetitor.reviewsScore },
              { label: "Messaging", value: selectedCompetitor.messagingScore },
            ].map(({ label, value }) => (
              <Card key={label} className="text-center">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-xl font-bold">{value != null ? Math.round(value) : "—"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {selectedCompetitor?.name ?? "Select a competitor"} — {METRICS.find(m => m.value === metric)?.label} Trend
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {history.length} data point{history.length !== 1 ? "s" : ""} recorded
                  {scoreDelta != null && (
                    <span className={cn("ml-2 font-semibold", scoreDelta > 0 ? "text-green-600" : scoreDelta < 0 ? "text-red-500" : "text-muted-foreground")}>
                      ({scoreDelta > 0 ? "+" : ""}{scoreDelta} since last snapshot)
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <Skeleton className="h-64 w-full" />
            ) : history.length < 2 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Info className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1">Not enough data yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Save at least 2 snapshots to see the trend. Come back and save a snapshot each time you scan a competitor.
                </p>
                <Button
                  className="mt-4"
                  size="sm"
                  onClick={() => selectedId && snapshotMutation.mutate(selectedId)}
                  disabled={!selectedId || snapshotMutation.isPending}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Save First Snapshot
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 13 }}
                    formatter={(v: number) => [`${Math.round(v)}/100`, METRICS.find(m => m.value === metric)?.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={metric}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={{ fill: "#2563eb", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
