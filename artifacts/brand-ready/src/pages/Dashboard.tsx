import { useState, useEffect } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetRecentAnalyses, getGetRecentAnalysesQueryKey,
  useGetUserProfile, getGetUserProfileQueryKey,
} from "@workspace/api-client-react";
import {
  BarChart3, CheckSquare, Bell, CalendarDays, Plus, ArrowRight,
  Zap, Globe, Instagram, Linkedin, Star,
  TrendingUp, CheckCircle2, Loader2, Tag, XCircle, ArrowLeft, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function ScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, [score]);
  const r = size / 2 - 14;
  const circumference = 2 * Math.PI * r;
  const offset = animated ? circumference - (score / 100) * circumference : circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : score >= 40 ? "#f97316" : "#ef4444";
  const label = score >= 80 ? "Ad-Ready" : score >= 60 ? "Almost There" : score >= 40 ? "Getting There" : "Needs Work";
  return (
    <div className="relative flex-shrink-0 mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transform: `rotate(-90deg)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
            transition: "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-extrabold tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function KPICard({ title, value, sub, icon: Icon, iconBg, isLoading }: {
  title: string; value: string | number; sub?: string;
  icon: React.ElementType; iconBg: string; isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <p className="text-3xl font-extrabold tracking-tight">{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

const DIMENSIONS = [
  { key: "websiteScore", label: "Website Experience", icon: Globe },
  { key: "socialScore", label: "Social Media", icon: Instagram },
  { key: "contentScore", label: "Content Quality", icon: BarChart3 },
  { key: "reviewsScore", label: "Reviews & Trust", icon: Star },
  { key: "competitorScore", label: "Competitor Position", icon: Linkedin },
  { key: "messagingScore", label: "Messaging Clarity", icon: Zap },
];

function DimensionBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-400" : score >= 40 ? "bg-orange-400" : "bg-red-400";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        <span className="text-sm font-bold tabular-nums">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function ScoreBarChart({ items }: { items: { label: string; score: number }[] }) {
  const max = 100;
  return (
    <div className="flex items-end gap-1.5 h-24 w-full mt-2">
      {items.map((item, i) => {
        const pct = (item.score / max) * 100;
        const color = item.score >= 80 ? "bg-green-500" : item.score >= 60 ? "bg-yellow-400" : item.score >= 40 ? "bg-orange-400" : "bg-red-400";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex flex-col justify-end" style={{ height: "80px" }}>
              <div
                className={cn("w-full rounded-t transition-all duration-700", color)}
                style={{ height: `${Math.max(pct, 4)}%` }}
                title={`${item.label}: ${item.score}`}
              />
            </div>
            <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}


const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
async function fetchJson(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}/api${path}`, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) } });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "Request failed");
  return json;
}

type UpgradePlan = {
  id: string; name: string; description: string; price: number;
  currency: string; currencySymbol: string; interval: string;
  features: string[]; isPopular: boolean; badge?: string | null; priceNGN?: number;
};
type CouponResult = { code: string; discountType: "percentage" | "flat"; discountValue: number; description?: string | null };

function applyDiscount(price: number, coupon: CouponResult | null): number {
  if (!coupon) return price;
  if (coupon.discountType === "percentage") return Math.max(0, price * (1 - coupon.discountValue / 100));
  return Math.max(0, price - coupon.discountValue);
}

function UpgradeModal({ isOpen, onClose, profile, sessionId }: {
  isOpen: boolean; onClose: () => void; profile: any; sessionId: string;
}) {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<UpgradePlan[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("$");
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchJson("/subscriptions/detect-currency")
      .then((info) => { setCurrency(info.currency || "USD"); setSymbol(info.currencySymbol || "$"); })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingPlans(true);
    setSelectedPlan(null);
    fetchJson(`/subscriptions/plans?currency=${currency}&period=${period}`)
      .then((data) => setPlans(Array.isArray(data) ? data.filter((p: any) => !p.isAgency && p.price > 0) : []))
      .catch(() => {})
      .finally(() => setIsLoadingPlans(false));
  }, [currency, period, isOpen]);

  const validateCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setIsValidatingCoupon(true);
    setCouponError("");
    setCouponResult(null);
    try {
      const result = await fetchJson("/subscriptions/validate-coupon", { method: "POST", body: JSON.stringify({ code }) });
      setCouponResult(result);
      toast({ title: "Coupon applied!", description: result.description ?? (result.discountType === "percentage" ? `${result.discountValue}% off` : `${symbol}${result.discountValue} off`) });
    } catch (err: any) {
      setCouponError(err.message || "Invalid coupon code");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPlan || !sessionId) return;
    setIsProcessing(true);
    try {
      const response = await fetchJson("/subscriptions/initiate-payment", {
        method: "POST",
        body: JSON.stringify({
          planId: selectedPlan.id,
          email: profile?.email || "",
          name: profile?.fullName || "User",
          currency,
          period,
          redirectUrl: `${window.location.origin}${import.meta.env.BASE_URL}payment/callback`,
          couponCode: couponResult?.code ?? undefined,
        }),
      });
      if (response.paymentLink) {
        window.location.href = response.paymentLink;
      } else {
        throw new Error("No payment link received");
      }
    } catch (error: any) {
      setIsProcessing(false);
      toast({ title: "Payment Error", description: error.message || "Failed to initiate payment.", variant: "destructive" });
    }
  };

  const finalPrice = selectedPlan ? applyDiscount(selectedPlan.price, couponResult) : 0;
  const hasDiscount = couponResult && selectedPlan && finalPrice < selectedPlan.price;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <DialogTitle className="text-lg">Upgrade your plan</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Choose the plan that works best for your brand.</p>
        </DialogHeader>

        <div className="px-6 py-4">
          <div className="flex items-center justify-center mb-5">
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full border">
              <button
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${period === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                onClick={() => { setPeriod("monthly"); setSelectedPlan(null); }}
              >Monthly</button>
              <button
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${period === "yearly" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                onClick={() => { setPeriod("yearly"); setSelectedPlan(null); }}
              >
                Yearly
                <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5 py-0">10% off</Badge>
              </button>
            </div>
          </div>

          {!selectedPlan ? (
            isLoadingPlans ? (
              <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => { setSelectedPlan(plan); setCouponCode(""); setCouponResult(null); setCouponError(""); }}
                    className={cn(
                      "relative text-left p-5 rounded-xl border bg-card transition-all hover:border-primary hover:shadow-md group",
                      plan.isPopular && "border-primary ring-1 ring-primary"
                    )}
                  >
                    {(plan.badge || plan.isPopular) && (
                      <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                        {plan.badge ?? "Most Popular"}
                      </span>
                    )}
                    <div className="mb-3">
                      <h3 className="font-bold text-base">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
                    </div>
                    <div className="flex items-end gap-1 mb-3">
                      <span className="text-2xl font-extrabold">{plan.currencySymbol}{plan.price.toFixed(2)}</span>
                      <span className="text-muted-foreground text-sm mb-0.5">/{plan.interval === "yearly" ? "year" : "month"}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-px" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-xs font-semibold text-primary group-hover:underline">Select this plan →</span>
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-5">
              <button
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => { setSelectedPlan(null); setCouponResult(null); setCouponCode(""); setCouponError(""); }}
              >
                <ArrowLeft className="h-4 w-4" /> Back to plans
              </button>

              <div className={cn("p-5 rounded-xl border bg-card", selectedPlan.isPopular && "border-primary ring-1 ring-primary")}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-base">{selectedPlan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedPlan.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {hasDiscount && (
                      <span className="text-sm line-through text-muted-foreground block">
                        {selectedPlan.currencySymbol}{selectedPlan.price.toFixed(2)}
                      </span>
                    )}
                    <span className="text-2xl font-extrabold">{selectedPlan.currencySymbol}{finalPrice.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm ml-1">/{selectedPlan.interval === "yearly" ? "year" : "month"}</span>
                  </div>
                </div>
                <Separator className="my-3" />
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {selectedPlan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-px" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Have a coupon code?</p>
                {couponResult ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">{couponResult.code} applied</p>
                      <p className="text-xs text-green-600">
                        {couponResult.description ?? (couponResult.discountType === "percentage" ? `${couponResult.discountValue}% discount` : `${symbol}${couponResult.discountValue} off`)}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-green-700 hover:text-red-600 px-2"
                      onClick={() => { setCouponResult(null); setCouponCode(""); setCouponError(""); }}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && validateCoupon()}
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" onClick={validateCoupon} disabled={!couponCode.trim() || isValidatingCoupon} className="shrink-0">
                      {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total due today</span>
                  <span className="font-bold text-lg">{selectedPlan.currencySymbol}{finalPrice.toFixed(2)}</span>
                </div>
                {period === "yearly" && <p className="text-xs text-green-600">Billed annually — 10% off the monthly rate</p>}
                <Button className="w-full h-11 text-base font-semibold" onClick={handleCheckout} disabled={isProcessing}>
                  {isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : "Proceed to Checkout"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">Secure payment via Flutterwave. Cancel anytime.</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


type ShareOfVoiceData = {
  brandName: string;
  brandSharePercent: number;
  competitors: { name: string; mentions: number; sharePercent: number }[];
  totalMentions: number;
};

function ShareOfVoiceWidget({ apiFetch }: { apiFetch: <T>(path: string, opts?: RequestInit) => Promise<T> }) {
  const { data, isLoading } = useQuery<ShareOfVoiceData>({
    queryKey: ["share-of-voice"],
    queryFn: () => apiFetch<ShareOfVoiceData>("/user/competitors/share-of-voice"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  if (isLoading) return (
    <Card><CardContent className="p-5"><Skeleton className="h-20 w-full" /></CardContent></Card>
  );

  const competitors = data?.competitors ?? [];
  if (!data || competitors.length < 1) return null;

  const brands = [
    { name: data.brandName, sharePercent: data.brandSharePercent, isUser: true },
    ...competitors.map((c) => ({ name: c.name, sharePercent: c.sharePercent, isUser: false })),
  ];

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Share of Voice
        </CardTitle>
        <Link href="/competitor-tracker">
          <Button variant="ghost" size="sm" className="text-xs gap-1">Track Trends <ArrowRight className="h-3 w-3" /></Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {brands.map((brand) => (
            <div key={brand.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-medium truncate max-w-[140px]">{brand.name}</span>
                  {brand.isUser && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>}
                </div>
                <span className="text-xs font-bold tabular-nums">{brand.sharePercent}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", brand.isUser ? "bg-primary" : "bg-muted-foreground/30")}
                  style={{ width: `${brand.sharePercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Based on brand mentions vs competitors</p>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const sessionId = useSession();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });
  const { data: recentAnalyses, isLoading: analysesLoading } = useGetRecentAnalyses({
    query: { queryKey: getGetRecentAnalysesQueryKey() },
  });
  const { data: profile } = useGetUserProfile(
    { sessionId },
    { query: { queryKey: getGetUserProfileQueryKey({ sessionId }), enabled: !!sessionId } }
  );

  const { apiFetch } = useApi();
  const { data: usage } = useQuery<any>({
    queryKey: ["user-usage", sessionId],
    queryFn: () => apiFetch<any>("/user/usage"),
    enabled: !!sessionId,
    staleTime: 60_000,
  });

  const isLoading = summaryLoading || analysesLoading;
  const rawSummary = (summary as any)?.data ?? summary;
  const stats = (rawSummary && typeof rawSummary === "object" && !Array.isArray(rawSummary))
    ? rawSummary
    : { totalAnalyses: 0, averageScore: 0, completedTasks: 0, pendingTasks: 0, adReadyCount: 0, notReadyCount: 0 };
  const rawAnalyses = (recentAnalyses as any)?.data ?? recentAnalyses;
  const analysesList: any[] = Array.isArray(rawAnalyses) ? rawAnalyses : [];
  const latestAnalysis = analysesList[0];

  const credScore = Math.round(stats.averageScore || 0);
  const firstName = profile?.fullName?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const daysSinceFirst = analysesList.length > 0
    ? Math.max(1, Math.floor((Date.now() - new Date(analysesList[analysesList.length - 1]?.createdAt || Date.now()).getTime()) / 86400000))
    : 0;

  const scoreHistory = [...analysesList].reverse().slice(-7).map((a: any, i: number) => ({
    label: `#${i + 1}`,
    score: a.overallScore || 0,
  }));

  const dimensionScores = DIMENSIONS.map((d) => ({
    ...d,
    score: latestAnalysis ? (latestAnalysis[d.key] ?? 0) : 0,
  }));

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{greeting}, {firstName} 👋</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Here's your brand credibility overview for today.</p>
          </div>
          <Link href="/analyze">
            <Button className="gap-2 flex-shrink-0 self-start sm:self-auto">
              <Plus className="h-4 w-4" /> New Analysis
            </Button>
          </Link>
        </div>

        {/* Usage This Month */}
        {usage && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">Monthly Usage</span>
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary capitalize">{usage.planId} plan</Badge>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {[
                    { label: "Brand Analyses", used: usage.usage.brandAnalysis, limit: usage.limits.brandAnalysis },
                    { label: "Competitor Tracking", used: usage.usage.competitorAnalysis, limit: usage.limits.competitorAnalysis },
                    { label: "Ads Intelligence", used: usage.usage.adsIntelligence, limit: usage.limits.adsIntelligence },
                  ].map(({ label, used, limit }) => {
                    const unlimited = limit === 999;
                    const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground truncate">{label}</p>
                          <p className="text-xs font-bold tabular-nums ml-1">{used}{!unlimited && `/${limit}`}</p>
                        </div>
                        {unlimited ? (
                          <p className="text-[10px] text-green-600 font-medium">∞ Unlimited</p>
                        ) : limit === 0 ? (
                          <p className="text-[10px] text-muted-foreground">Not on your plan</p>
                        ) : (
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button size="sm" variant="outline" className="text-xs flex-shrink-0 gap-1" onClick={() => setShowUpgradeModal(true)}>
                  <Sparkles className="h-3 w-3" /> Upgrade
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Score Ring + KPI Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Score Ring */}
          <Card className="lg:col-span-1 flex items-center justify-center">
            <CardContent className="p-6 flex flex-col items-center gap-3 w-full">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Credibility Score</p>
              {isLoading ? (
                <Skeleton className="w-40 h-40 rounded-full" />
              ) : analysesList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-36 h-36 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/25" />
                  </div>
                  <p className="text-xs text-center text-muted-foreground leading-relaxed">Run your first analysis<br />to see your score</p>
                </div>
              ) : (
                <ScoreRing score={credScore} size={160} />
              )}
              {analysesList.length > 0 && (
                <p className="text-xs text-center text-muted-foreground">Average across all your brand analyses</p>
              )}
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <KPICard
              title="Cred Score"
              value={analysesList.length === 0 ? "—" : `${credScore}/100`}
              sub={analysesList.length === 0 ? "No analysis yet" : credScore >= 80 ? "Ad-ready!" : "Keep improving"}
              icon={BarChart3}
              iconBg="bg-blue-500/10 text-blue-600"
              isLoading={isLoading}
            />
            <KPICard
              title="Tasks Done"
              value={stats.completedTasks || 0}
              sub={`${stats.pendingTasks || 0} pending`}
              icon={CheckSquare}
              iconBg="bg-green-500/10 text-green-600"
              isLoading={isLoading}
            />
            <KPICard
              title="Brand Mentions"
              value="—"
              sub="Set up Google Alerts"
              icon={Bell}
              iconBg="bg-purple-500/10 text-purple-600"
              isLoading={false}
            />
            <KPICard
              title="Days on Plan"
              value={daysSinceFirst || "—"}
              sub={daysSinceFirst > 0 ? "Keep the streak!" : "Start your first analysis"}
              icon={CalendarDays}
              iconBg="bg-amber-500/10 text-amber-600"
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* 6-Dimension Breakdown */}
        {latestAnalysis && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>6-Dimension Breakdown</span>
                <span className="text-xs font-normal text-muted-foreground">From latest analysis: {latestAnalysis.brandName}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {dimensionScores.map((d) => (
                  <DimensionBar key={d.key} label={d.label} score={d.score} icon={d.icon} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share of Voice Widget */}
        <ShareOfVoiceWidget apiFetch={apiFetch} />

        {/* Two-column: Roadmap + Daily Plan */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Interactive Roadmap */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Action Roadmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!latestAnalysis ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Zap className="h-6 w-6 text-primary/60" />
                  </div>
                  <p className="font-medium mb-1">No roadmap yet</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xs">Run a brand analysis to get your personalised action roadmap with prioritised tasks</p>
                  <Link href="/analyze">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" /> Start Analysis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="pt-1 border-t">
                    <Link href={`/tasks/${latestAnalysis.id}`}>
                      <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                        View full task list for {latestAnalysis.brandName} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Action Plan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Today's Action Plan
                <Badge variant="outline" className="ml-auto text-xs text-primary border-primary/30">
                  <Star className="h-3 w-3 mr-1" /> Daily
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!latestAnalysis ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <CalendarDays className="h-6 w-6 text-primary/60" />
                  </div>
                  <p className="font-medium mb-1">No tasks yet</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-xs">Complete your first brand analysis to unlock a personalised daily action plan</p>
                  <Link href="/analyze">
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Plus className="h-4 w-4" /> Run First Analysis
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Your daily tasks are based on your brand analysis.</p>
                  <Link href="/daily-tasks">
                    <Button variant="ghost" size="sm" className="w-full text-xs gap-1">
                      View today's tasks <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score History Bar Chart */}
        {scoreHistory.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreBarChart items={scoreHistory} />
              <p className="text-xs text-muted-foreground mt-3">Your Ad Readiness Score across all analyses (most recent on the right)</p>
            </CardContent>
          </Card>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        profile={(profile as any)?.data ?? profile}
        sessionId={sessionId}
      />
    </DashboardLayout>
  );
}
