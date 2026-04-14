import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/lib/useApi";
import { cn } from "@/lib/utils";
import {
  ShieldCheck, Users, MessageCircle, Globe, Star,
  RefreshCw, AlertCircle, ChevronRight, Lightbulb, Info,
} from "lucide-react";

type Pillar = {
  score: number;
  label: string;
  insight: string;
};

type TrustScoreResult = {
  overallScore: number;
  grade: string;
  pillars: {
    reviewTrust: Pillar;
    communityEngagement: Pillar;
    contentCredibility: Pillar;
    audienceConversation: Pillar;
  };
  summary: string;
  recommendations: string[];
  brandName: string;
  dataAvailability: {
    hasAnalysis: boolean;
    hasSocialStats: boolean;
    hasMentions: boolean;
  };
};

function gradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-green-600 bg-green-50 border-green-200";
  if (grade.startsWith("B")) return "text-blue-600 bg-blue-50 border-blue-200";
  if (grade.startsWith("C")) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function scoreRingColor(score: number) {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#2563eb";
  if (score >= 30) return "#ca8a04";
  return "#dc2626";
}

function labelColor(label: string) {
  if (label === "Excellent") return "bg-green-100 text-green-700 border-green-200";
  if (label === "Good") return "bg-blue-100 text-blue-700 border-blue-200";
  if (label === "Fair") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

const PILLARS = [
  {
    key: "reviewTrust" as const,
    label: "Review Trust",
    icon: Star,
    description: "Based on your brand analysis score",
    color: "text-amber-600",
  },
  {
    key: "communityEngagement" as const,
    label: "Community Engagement",
    icon: Users,
    description: "Based on your social engagement stats",
    color: "text-blue-600",
  },
  {
    key: "contentCredibility" as const,
    label: "Content Credibility",
    icon: Globe,
    description: "Based on your website & content score",
    color: "text-purple-600",
  },
  {
    key: "audienceConversation" as const,
    label: "Audience Conversation",
    icon: MessageCircle,
    description: "Based on your brand mentions sentiment",
    color: "text-green-600",
  },
];

export default function AudienceTrustScore() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [followerCount, setFollowerCount] = useState("");
  const [avgLikes, setAvgLikes] = useState("");
  const [avgComments, setAvgComments] = useState("");
  const [responseRate, setResponseRate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<TrustScoreResult>("/ai/trust-score", {
        method: "POST",
        body: JSON.stringify({
          followerCount: followerCount ? parseInt(followerCount) : undefined,
          avgLikes: avgLikes ? parseInt(avgLikes) : undefined,
          avgComments: avgComments ? parseInt(avgComments) : undefined,
          responseRate: responseRate ? parseFloat(responseRate) : undefined,
        }),
      }),
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const result = mutation.data;

  const circumference = 2 * Math.PI * 54;
  const overallScore = result?.overallScore ?? 0;
  const dashOffset = circumference - (overallScore / 100) * circumference;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Audience Trust Score
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            AI-synthesized trust score built from your brand data, social stats, and mention sentiment
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Social Engagement Stats</CardTitle>
            <CardDescription>
              Optional — providing these improves the Community Engagement pillar score. Leave blank to use your existing brand data only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label htmlFor="followers" className="text-xs">Total Followers</Label>
                <Input
                  id="followers"
                  type="number"
                  placeholder="e.g. 12000"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="likes" className="text-xs">Avg Likes / Post</Label>
                <Input
                  id="likes"
                  type="number"
                  placeholder="e.g. 320"
                  value={avgLikes}
                  onChange={(e) => setAvgLikes(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comments" className="text-xs">Avg Comments / Post</Label>
                <Input
                  id="comments"
                  type="number"
                  placeholder="e.g. 45"
                  value={avgComments}
                  onChange={(e) => setAvgComments(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="response" className="text-xs">Response Rate (%)</Label>
                <Input
                  id="response"
                  type="number"
                  placeholder="e.g. 80"
                  value={responseRate}
                  onChange={(e) => setResponseRate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", mutation.isPending && "animate-spin")} />
              {mutation.isPending ? "Computing Trust Score..." : result ? "Recompute Score" : "Compute Trust Score"}
            </Button>
          </CardContent>
        </Card>

        {mutation.isPending && (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
            </div>
          </div>
        )}

        {result && !mutation.isPending && (
          <>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                      <circle cx="64" cy="64" r="54" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                      <circle
                        cx="64" cy="64" r="54" fill="none"
                        stroke={scoreRingColor(overallScore)}
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{overallScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                      <h2 className="text-xl font-bold">{result.brandName} Trust Score</h2>
                      <Badge className={cn("text-sm font-bold border", gradeColor(result.grade))}>
                        Grade {result.grade}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{result.summary}</p>

                    {!result.dataAvailability.hasAnalysis && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-3">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Run a brand analysis first for a more accurate score
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PILLARS.map(({ key, label, icon: Icon, description, color }) => {
                const pillar = result.pillars[key];
                return (
                  <Card key={key}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center", color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{label}</p>
                            <p className="text-xs text-muted-foreground">{description}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-xs border", labelColor(pillar.label))}>
                          {pillar.label}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Score</span>
                          <span className="font-semibold">{pillar.score}/100</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pillar.score}%`,
                              backgroundColor: scoreRingColor(pillar.score),
                            }}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{pillar.insight}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" /> Recommendations to Improve Trust
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-100 bg-blue-50/40">
              <CardContent className="p-4 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>How this score is calculated:</strong> Your Trust Score combines your Skorvia analysis data (overall, website, and social scores), brand mention sentiment from tracked sources, and any social engagement stats you enter above. The more data you provide, the more accurate your score will be.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {!result && !mutation.isPending && (
          <Card>
            <CardContent className="py-14 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">Ready to compute your Trust Score</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Optionally enter your social engagement stats above, then click "Compute Trust Score" to get your AI-synthesized audience trust analysis.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
