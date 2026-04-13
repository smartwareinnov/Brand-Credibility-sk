import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApi } from "@/lib/useApi";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { isAuthenticated, markPlanSelected } from "@/hooks/useSession";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchJson(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "Request failed");
  return json;
}

type Plan = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  currencySymbol: string;
  interval: string;
  features: string[];
  isPopular: boolean;
  badge?: string | null;
  isAgency?: boolean;
  priceNGN?: number;
};

export default function Pricing() {
  const { toast } = useToast();
  const { apiFetch, sessionId } = useApi();
  const [, setLocation] = useLocation();
  const isLoggedIn = isAuthenticated();
  const { data: profileData } = useGetUserProfile(
    { sessionId: sessionId ?? "" },
    { query: { queryKey: getGetUserProfileQueryKey({ sessionId: sessionId ?? "" }), enabled: !!sessionId } }
  );
  const profile = (profileData as any)?.data ?? profileData;

  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("$");
  const [isCurrencyLoading, setIsCurrencyLoading] = useState(true);
  const [isPlansLoading, setIsPlansLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchJson("/subscriptions/detect-currency")
      .then((info) => {
        const cur = info.currency || "USD";
        const sym = info.currencySymbol || "$";
        setCurrency(cur);
        setSymbol(sym);
      })
      .catch(() => {})
      .finally(() => setIsCurrencyLoading(false));
  }, []);

  useEffect(() => {
    if (isCurrencyLoading) return;
    setIsPlansLoading(true);
    fetchJson(`/subscriptions/plans?currency=${currency}&period=${period}`)
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setIsPlansLoading(false));
  }, [currency, period, isCurrencyLoading]);

  const handleSubscribe = async (plan: Plan) => {
    if (!sessionId || !isLoggedIn) {
      toast({ title: "Sign in required", description: "Please sign in to subscribe.", variant: "destructive" });
      setLocation("/login");
      return;
    }

    // Free plan — just mark selected and go to dashboard
    if (plan.price === 0) {
      markPlanSelected();
      setLocation("/dashboard");
      return;
    }

    setIsProcessing(plan.id);
    try {
      const email = profile?.email || "";
      const name = profile?.fullName || "User";
      const response = await fetchJson("/subscriptions/initiate-payment", {
        method: "POST",
        body: JSON.stringify({
          planId: plan.id,
          email,
          name,
          currency,
          period,
          redirectUrl: `${window.location.origin}${import.meta.env.BASE_URL}payment/callback`,
        }),
      });
      if (response.paymentLink) {
        window.location.href = response.paymentLink;
      } else {
        throw new Error("No payment link received");
      }
    } catch (error: any) {
      setIsProcessing(null);
      toast({ title: "Payment Error", description: error.message || "Failed to initiate payment.", variant: "destructive" });
    }
  };

  const isLoading = isCurrencyLoading || isPlansLoading;
  const displayedPlans = plans.filter((p) => !p.isAgency);
  const agencyPlan = plans.find((p) => p.isAgency);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            {isLoggedIn && (
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-4 py-2 rounded-full mb-6">
                <Zap className="h-4 w-4" />
                Choose a plan to start using Skorvia
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Invest in your brand's growth
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Stop wasting money on ads that won't convert. Get actionable insights to build a credible brand.
            </p>

            <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-full border">
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${period === "monthly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setPeriod("monthly")}
              >
                Monthly
              </button>
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${period === "yearly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setPeriod("yearly")}
              >
                Yearly
                <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5 py-0">10% off</Badge>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
                {displayedPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col p-8 rounded-2xl border bg-card shadow-sm transition-transform hover:scale-[1.02] ${
                      plan.isPopular ? "border-primary ring-1 ring-primary shadow-md lg:scale-105 hover:lg:scale-[1.07] z-10" : ""
                    }`}
                  >
                    {(plan.badge || plan.isPopular) && (
                      <div className="absolute -top-4 left-0 right-0 flex justify-center">
                        <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          {plan.badge ?? "Most Popular"}
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm h-10">{plan.description}</p>
                    </div>

                    <div className="mb-8">
                      {plan.price === 0 ? (
                        <span className="text-4xl font-extrabold">Free</span>
                      ) : (
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-extrabold">
                            {plan.currencySymbol}{plan.price.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground mb-1">
                            /{plan.interval === "yearly" ? "year" : "month"}
                          </span>
                        </div>
                      )}
                      {period === "yearly" && plan.price > 0 && (
                        <p className="text-xs text-green-600 mt-1">Billed annually — 10% off</p>
                      )}
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mr-3 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full h-12 text-base font-semibold"
                      variant={plan.isPopular ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan)}
                      disabled={isProcessing !== null}
                    >
                      {isProcessing === plan.id ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Processing...</>
                      ) : plan.price === 0 ? "Get Started Free" : "Choose Plan"}
                    </Button>
                  </div>
                ))}
              </div>

              {agencyPlan && (
                <div className="mt-12 max-w-4xl mx-auto">
                  <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                      <Badge className="bg-amber-100 text-amber-700 border-0 mb-3">Enterprise / Agency</Badge>
                      <h3 className="text-2xl font-bold mb-2">{agencyPlan.name}</h3>
                      <p className="text-muted-foreground mb-4">{agencyPlan.description || "Custom plans for agencies and large teams."}</p>
                      <ul className="space-y-2">
                        {agencyPlan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="text-3xl font-extrabold mb-1">
                        {agencyPlan.price === 0 ? "Custom" : `${agencyPlan.currencySymbol}${agencyPlan.price.toFixed(2)}`}
                      </div>
                      {agencyPlan.price > 0 && <p className="text-sm text-muted-foreground mb-4">/{agencyPlan.interval === "yearly" ? "year" : "month"}</p>}
                      <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold" onClick={() => handleSubscribe(agencyPlan)} disabled={isProcessing !== null}>
                        {isProcessing === agencyPlan.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "Contact Sales"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-16 text-center text-sm text-muted-foreground">
            <p>No credit card required for the free plan. Secure payments via Flutterwave.</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
