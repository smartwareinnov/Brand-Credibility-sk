import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetUserBrandProfile, getGetUserBrandProfileQueryKey } from "@workspace/api-client-react";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import {
  Megaphone, Globe, Twitter, Linkedin, Facebook, ExternalLink,
  Search, Plus, X, Bell, BellOff, TrendingUp, TrendingDown, Minus,
  RefreshCw, Info, Mail, Clock, Sparkles, Brain, Radio,
} from "lucide-react";

type Sentiment = "positive" | "neutral" | "negative";

type ApiMention = {
  id: number;
  sessionId: string | null;
  brandName: string;
  source: string;
  platform: string;
  title: string;
  snippet: string;
  url: string | null;
  sentiment: Sentiment;
  isRead: boolean;
  createdAt: string;
};

type ApiMentionSettings = {
  mentionAlerts: boolean;
  alertFrequency: "realtime" | "daily" | "weekly";
  positiveMentions: boolean;
  negativeMentions: boolean;
  neutralMentions: boolean;
  trackedKeywords: string[];
};

type MentionsResponse = {
  mentions: ApiMention[];
  settings: ApiMentionSettings;
};

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  web: Globe, twitter: Twitter, linkedin: Linkedin,
  facebook: Facebook, news: Globe,
};

const PLATFORM_LABELS: Record<string, string> = {
  web: "Web", twitter: "X / Twitter", linkedin: "LinkedIn",
  facebook: "Facebook", news: "News",
};

const SENTIMENT_STYLES: Record<Sentiment, { badge: string; icon: React.ElementType; label: string }> = {
  positive: { badge: "bg-green-100 text-green-700 border-green-200", icon: TrendingUp, label: "Positive" },
  neutral: { badge: "bg-slate-100 text-slate-600 border-slate-200", icon: Minus, label: "Neutral" },
  negative: { badge: "bg-red-100 text-red-700 border-red-200", icon: TrendingDown, label: "Negative" },
};

function NlpInsightsPanel({ apiFetch, total }: { apiFetch: <T>(path: string, opts?: RequestInit) => Promise<T>; total: number }) {
  const [data, setData] = useState<{ sentimentScore: number; positive: number; neutral: number; negative: number; total: number; aiSummary: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    if (total === 0) return;
    setLoading(true);
    try {
      const result = await apiFetch<{ sentimentScore: number; positive: number; neutral: number; negative: number; total: number; aiSummary: string | null }>("/user/mentions/sentiment-summary");
      setData(result);
    } catch { /* silently fail */ } finally { setLoading(false); }
  };

  if (!data && !loading) {
    return (
      <div className="border rounded-xl p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">NLP Sentiment Analysis</p>
            <p className="text-xs text-muted-foreground">Run AI analysis on your mentions for deep insights</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={runAnalysis} disabled={total === 0}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />Analyze
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="border rounded-xl p-4 bg-muted/30">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary animate-spin" /><span className="text-sm text-muted-foreground">Running NLP analysis on your mentions...</span></div>
      </div>
    );
  }

  if (!data) return null;
  const positiveWidth = data.total > 0 ? (data.positive / data.total) * 100 : 0;
  const neutralWidth = data.total > 0 ? (data.neutral / data.total) * 100 : 0;
  const negativeWidth = data.total > 0 ? (data.negative / data.total) * 100 : 0;
  const scoreColor = data.sentimentScore >= 70 ? "text-green-600" : data.sentimentScore >= 40 ? "text-yellow-600" : "text-red-500";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /><CardTitle className="text-base">NLP Sentiment Intelligence</CardTitle></div>
        <Button variant="ghost" size="sm" onClick={runAnalysis}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center flex-shrink-0">
            <p className={`text-3xl font-extrabold ${scoreColor}`}>{data.sentimentScore}</p>
            <p className="text-xs text-muted-foreground">Sentiment Score</p>
          </div>
          <div className="flex-1">
            <div className="flex h-3 rounded-full overflow-hidden">
              {positiveWidth > 0 && <div className="bg-green-500" style={{ width: `${positiveWidth}%` }} />}
              {neutralWidth > 0 && <div className="bg-slate-300" style={{ width: `${neutralWidth}%` }} />}
              {negativeWidth > 0 && <div className="bg-red-400" style={{ width: `${negativeWidth}%` }} />}
            </div>
            <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
              <span><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1" />{data.positive} positive</span>
              <span><span className="inline-block w-2 h-2 bg-slate-300 rounded-full mr-1" />{data.neutral} neutral</span>
              <span><span className="inline-block w-2 h-2 bg-red-400 rounded-full mr-1" />{data.negative} negative</span>
            </div>
          </div>
        </div>
        {data.aiSummary && (
          <div className="bg-white/70 rounded-lg p-3 border border-primary/10">
            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI Insight</p>
            <p className="text-sm text-foreground/80 leading-relaxed">{data.aiSummary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BrandMentions() {
  const sessionId = useSession();
  const { toast } = useToast();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();

  const { data: brandProfile } = useGetUserBrandProfile(
    { sessionId: sessionId ?? "" },
    { query: { queryKey: getGetUserBrandProfileQueryKey(), retry: false } }
  );
  const brandName = (brandProfile as unknown as Record<string, unknown>)?.brandName as string ?? "Your Brand";

  const { data, isLoading } = useQuery<MentionsResponse>({
    queryKey: ["mentions", sessionId],
    queryFn: () => apiFetch<MentionsResponse>("/user/mentions"),
    enabled: !!sessionId,
  });

  const mentions = data?.mentions ?? [];
  const serverSettings = data?.settings;

  const [filter, setFilter] = useState<"all" | Sentiment>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [newKeyword, setNewKeyword] = useState("");

  const [alerts, setAlerts] = useState<ApiMentionSettings>({
    mentionAlerts: true,
    alertFrequency: "realtime",
    positiveMentions: true,
    negativeMentions: true,
    neutralMentions: false,
    trackedKeywords: [brandName],
  });

  useEffect(() => {
    if (serverSettings) {
      // Map DB field names to frontend field names
      const mapped: ApiMentionSettings = {
        mentionAlerts: serverSettings.mentionAlerts ?? true,
        alertFrequency: serverSettings.alertFrequency ?? "realtime",
        positiveMentions: serverSettings.positiveMentions ?? true,
        negativeMentions: serverSettings.negativeMentions ?? true,
        neutralMentions: serverSettings.neutralMentions ?? false,
        trackedKeywords: Array.isArray(serverSettings.trackedKeywords)
          ? serverSettings.trackedKeywords
          : [],
      };
      setAlerts(mapped);
    }
  }, [serverSettings]);

  const refreshMutation = useMutation({
    mutationFn: () => apiFetch<{ refreshed: number }>("/user/mentions/refresh", { method: "POST" }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["mentions", sessionId] });
      toast({ title: "Mentions refreshed", description: `${res.refreshed ?? 0} new mentions scanned.` });
    },
    onError: () => {
      toast({ title: "Refresh failed", description: "Could not refresh mentions.", variant: "destructive" });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (settings: Partial<ApiMentionSettings>) =>
      apiFetch("/user/mentions/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentions", sessionId] });
      toast({ title: "Alert settings saved", description: "You'll receive notifications based on your preferences." });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/user/mentions/${id}/read`, { method: "PATCH" }),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<MentionsResponse>(["mentions", sessionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          mentions: old.mentions.map(m => m.id === id ? { ...m, isRead: true } : m),
        };
      });
    },
  });

  const filtered = mentions.filter((m) => {
    const sentimentMatch = filter === "all" || m.sentiment === filter;
    const platformMatch = platformFilter === "all" || m.platform === platformFilter;
    return sentimentMatch && platformMatch;
  });

  const sentimentCounts = {
    positive: mentions.filter(m => m.sentiment === "positive").length,
    neutral: mentions.filter(m => m.sentiment === "neutral").length,
    negative: mentions.filter(m => m.sentiment === "negative").length,
  };

  const handleAddKeyword = () => {
    const k = newKeyword.trim();
    if (!k || alerts.trackedKeywords.includes(k)) return;
    const updated = { ...alerts, trackedKeywords: [...alerts.trackedKeywords, k] };
    setAlerts(updated);
    setNewKeyword("");
    saveSettingsMutation.mutate({ trackedKeywords: updated.trackedKeywords });
  };

  const handleRemoveKeyword = (kw: string) => {
    if (kw === brandName) return;
    const updated = { ...alerts, trackedKeywords: alerts.trackedKeywords.filter(k => k !== kw) };
    setAlerts(updated);
    saveSettingsMutation.mutate({ trackedKeywords: updated.trackedKeywords });
  };

  const handleSaveAlerts = () => {
    saveSettingsMutation.mutate(alerts);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-primary" /> Brand Mentions
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track what people are saying about <span className="font-semibold text-foreground">{brandName}</span> across the web
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
            <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            {refreshMutation.isPending ? "Scanning..." : "Refresh"}
          </Button>
        </div>

        {/* Sentiment counters — only shown when there are real mentions */}
        {(isLoading || mentions.length > 0) && (
          <div className="grid grid-cols-3 gap-3">
            {isLoading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : [
              { key: "positive" as const, label: "Positive", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", count: sentimentCounts.positive },
              { key: "neutral" as const, label: "Neutral", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", count: sentimentCounts.neutral },
              { key: "negative" as const, label: "Negative", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", count: sentimentCounts.negative },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => setFilter(filter === s.key ? "all" : s.key)}
                className={`border rounded-xl p-4 text-center transition-all ${s.border} ${s.bg}
                  ${filter === s.key ? "ring-2 ring-primary ring-offset-1" : "hover:ring-1 hover:ring-muted-foreground/20"}`}
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>
        )}

        {/* NLP panel — only shown when there are real mentions */}
        {mentions.length > 0 && (
          <NlpInsightsPanel apiFetch={apiFetch} total={mentions.length} />
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <CardTitle className="text-base">
                Mentions Feed
                {mentions.length > 0 && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">({filtered.length} results)</span>
                )}
              </CardTitle>
              {mentions.length > 0 && (
                <div className="flex gap-2">
                  <Select value={platformFilter} onValueChange={setPlatformFilter}>
                    <SelectTrigger className="h-8 w-36 text-xs">
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="twitter">X / Twitter</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="news">News</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Sentiment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sentiment</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : mentions.length === 0 ? (
              <div className="py-14 text-center px-6">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Radio className="h-7 w-7 text-primary/60" />
                </div>
                <h3 className="font-semibold text-base mb-2">No mentions yet</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                  Once Skorvia starts tracking your brand across the web, mentions will appear here. Add keywords below and hit Refresh to start.
                </p>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
                  {refreshMutation.isPending ? "Scanning..." : "Scan Now"}
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No mentions match your current filters.
              </div>
            ) : (
              filtered.map((mention) => {
                const PlatformIcon = PLATFORM_ICONS[mention.platform] ?? Globe;
                const sentiment = SENTIMENT_STYLES[mention.sentiment];
                const SentimentIcon = sentiment.icon;
                return (
                  <div
                    key={mention.id}
                    className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer ${!mention.isRead ? "bg-primary/2" : ""}`}
                    onClick={() => !mention.isRead && markReadMutation.mutate(mention.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                        <PlatformIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">{PLATFORM_LABELS[mention.platform] ?? mention.platform}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{mention.source}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{mention.createdAt.split("T")[0]}</span>
                          {!mention.isRead && <Badge variant="secondary" className="text-xs px-1.5 py-0.5">New</Badge>}
                          <Badge variant="outline" className={`text-xs gap-1 ${sentiment.badge}`}>
                            <SentimentIcon className="h-3 w-3" />
                            {sentiment.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold mb-1 leading-snug">{mention.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{mention.snippet}</p>
                      </div>
                      {mention.url && mention.url !== "#" && (
                        <a href={mention.url} target="_blank" rel="noreferrer"
                          className="text-muted-foreground hover:text-primary flex-shrink-0 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Tracked Keywords
            </CardTitle>
            <CardDescription>
              Skorvia scans the web for mentions of these keywords
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(alerts.trackedKeywords.length > 0 ? alerts.trackedKeywords : [brandName]).map((kw) => (
                <Badge key={kw} variant="secondary" className="pl-3 pr-2 py-1.5 text-sm gap-1.5">
                  {kw}
                  {kw !== brandName && (
                    <button
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-muted-foreground hover:text-foreground ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder='e.g. "brand name" or competitor name'
                className="text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
              />
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={handleAddKeyword}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" /> Email Alert Settings
            </CardTitle>
            <CardDescription>
              Get notified when your brand is mentioned online
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Alerts are sent to your registered email address. You can update it in your Profile settings.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {alerts.mentionAlerts ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="text-sm font-medium">Brand Mention Alerts</p>
                  <p className="text-xs text-muted-foreground">Email me when my brand is mentioned</p>
                </div>
              </div>
              <Switch
                checked={alerts.mentionAlerts}
                onCheckedChange={(v) => setAlerts(a => ({ ...a, mentionAlerts: v }))}
              />
            </div>

            {alerts.mentionAlerts && (
              <>
                <div className="space-y-2 pl-1">
                  <Label className="text-sm">Alert Frequency</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: "realtime", label: "Real-time", icon: Bell, desc: "Immediately" },
                      { value: "daily", label: "Daily Digest", icon: Mail, desc: "Once per day" },
                      { value: "weekly", label: "Weekly", icon: Clock, desc: "Every Monday" },
                    ].map(({ value, label, icon: Icon, desc }) => (
                      <button
                        key={value}
                        onClick={() => setAlerts(a => ({ ...a, alertFrequency: value as typeof a.alertFrequency }))}
                        className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-all ${
                          alerts.alertFrequency === value
                            ? "border-primary bg-primary/5 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-muted-foreground/50"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{label}</span>
                        <span className="text-xs opacity-70">({desc})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-sm">Notify me for</Label>
                  {[
                    { key: "positiveMentions" as const, label: "Positive mentions", desc: "Good news about your brand" },
                    { key: "negativeMentions" as const, label: "Negative mentions", desc: "Critical or unfavourable content — high priority" },
                    { key: "neutralMentions" as const, label: "Neutral mentions", desc: "News, discussions, and general references" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={alerts[key]}
                        onCheckedChange={(v) => setAlerts(a => ({ ...a, [key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="flex justify-end pt-1">
              <Button size="sm" onClick={handleSaveAlerts} disabled={saveSettingsMutation.isPending}>
                {saveSettingsMutation.isPending ? "Saving..." : "Save Alert Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
