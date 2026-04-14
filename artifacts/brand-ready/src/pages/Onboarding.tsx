import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle2, User, Briefcase,
  TrendingUp, Building2, Target,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useGetUserProfile, getGetUserProfileQueryKey } from "@workspace/api-client-react";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/use-toast";

const ROLES = [
  { value: "founder_ceo", label: "Founder / CEO" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "growth_marketer", label: "Growth Marketer" },
  { value: "business_owner", label: "Business Owner" },
  { value: "consultant", label: "Consultant / Agency" },
  { value: "other", label: "Other" },
];

const AD_EXPERIENCE = [
  { value: "never", label: "Never run ads", desc: "I'm just getting started" },
  { value: "testing", label: "Currently testing", desc: "I've run a few experiments" },
  { value: "yes_small", label: "Yes — small budget", desc: "Under $1,000/month" },
  { value: "yes_medium", label: "Yes — moderate budget", desc: "$1,000–$10,000/month" },
  { value: "yes_large", label: "Yes — serious budget", desc: "Over $10,000/month" },
];

const COMPANY_SIZES = [
  { value: "1", label: "Just me", desc: "Solo founder" },
  { value: "2_10", label: "2–10", desc: "Small team" },
  { value: "11_50", label: "11–50", desc: "Growing team" },
  { value: "51_200", label: "51–200", desc: "Mid-size company" },
  { value: "200_plus", label: "200+", desc: "Large company" },
];

const REVENUES = [
  { value: "pre_revenue", label: "Pre-revenue", desc: "Still building" },
  { value: "under_50k", label: "Under $50K", desc: "Early stage" },
  { value: "50k_200k", label: "$50K–$200K", desc: "Growing" },
  { value: "200k_1m", label: "$200K–$1M", desc: "Scaling up" },
  { value: "1m_5m", label: "$1M–$5M", desc: "Established" },
  { value: "5m_plus", label: "$5M+", desc: "Scaling fast" },
];

const INDUSTRIES = [
  { value: "ecommerce", label: "E-Commerce" },
  { value: "saas", label: "SaaS / Software" },
  { value: "services", label: "Professional Services" },
  { value: "retail", label: "Retail / FMCG" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Education / EdTech" },
  { value: "fintech", label: "Fintech / Finance" },
  { value: "real_estate", label: "Real Estate" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "media", label: "Media / Entertainment" },
  { value: "logistics", label: "Logistics / Supply Chain" },
  { value: "other", label: "Other" },
];

interface ChoiceCardProps {
  label: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
}

function ChoiceCard({ label, desc, selected, onClick }: ChoiceCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-3.5 rounded-xl border-2 transition-all duration-150",
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40"
        )}>
          {selected && <div className="w-full h-full rounded-full bg-white scale-[0.4]" />}
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
      </div>
    </button>
  );
}

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const sessionId = useSession();
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    role: "",
    hasRunAds: "",
    companySize: "",
    yearlyRevenue: "",
    industry: "",
  });

  const { data: profile } = useGetUserProfile(
    { sessionId: sessionId ?? "" },
    { query: { queryKey: getGetUserProfileQueryKey({ sessionId: sessionId ?? "" }), enabled: !!sessionId } }
  );

  useEffect(() => {
    if (profile) {
      if ((profile as any).onboardingCompleted) {
        // Already onboarded — go straight to dashboard
        setLocation("/dashboard");
        return;
      }
      if ((profile as any).fullName) {
        setForm((f) => ({ ...f, fullName: (profile as any).fullName ?? "" }));
      }
    }
  }, [profile]);

  const TOTAL_STEPS = 5;

  const canProceed = () => {
    if (step === 1) return form.fullName.trim().length >= 2;
    if (step === 2) return !!form.role;
    if (step === 3) return !!form.hasRunAds;
    if (step === 4) return !!form.companySize && !!form.yearlyRevenue;
    if (step === 5) return !!form.industry;
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await apiFetch("/user/onboarding", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setLocation("/pricing");
    } catch (err: any) {
      toast({
        title: "Couldn't save your profile",
        description: err?.message ?? "Something went wrong, but you can still continue.",
        variant: "destructive",
      });
      // Still redirect — don't block the user
      setLocation("/pricing");
    } finally {
      setSaving(false);
    }
  };

  const stepIcons = [User, Briefcase, TrendingUp, Building2, Target];
  const StepIcon = stepIcons[step - 1];

  const stepTitles = [
    "What's your name?",
    "What's your role?",
    "Ad experience",
    "Company details",
    "Your industry",
  ];

  const stepSubtitles = [
    "Let's personalise your experience.",
    "This helps us tailor your action plan.",
    "Have you run paid ads before?",
    "Tell us about your business size.",
    "Pick the category that fits best.",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">Skorvia</span>
          </div>
          <span className="text-sm text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-4 py-8 sm:py-12">
        <div className="w-full max-w-lg">

          <div className="flex gap-1.5 mb-8">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  i < step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          <div className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <StepIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{stepTitles[step - 1]}</h1>
            <p className="text-muted-foreground text-sm">{stepSubtitles[step - 1]}</p>
          </div>

          <div className="space-y-3 mb-8">
            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="e.g. Ada Okonkwo"
                  className="text-base h-12"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && canProceed() && handleNext()}
                />
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <ChoiceCard
                    key={r.value}
                    label={r.label}
                    selected={form.role === r.value}
                    onClick={() => setForm({ ...form, role: r.value })}
                  />
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-2">
                {AD_EXPERIENCE.map((a) => (
                  <ChoiceCard
                    key={a.value}
                    label={a.label}
                    desc={a.desc}
                    selected={form.hasRunAds === a.value}
                    onClick={() => setForm({ ...form, hasRunAds: a.value })}
                  />
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-semibold mb-2.5 text-foreground">How many people work here?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COMPANY_SIZES.map((s) => (
                      <ChoiceCard
                        key={s.value}
                        label={s.label}
                        desc={s.desc}
                        selected={form.companySize === s.value}
                        onClick={() => setForm({ ...form, companySize: s.value })}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-2.5 text-foreground">Annual revenue (approximate)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {REVENUES.map((r) => (
                      <ChoiceCard
                        key={r.value}
                        label={r.label}
                        desc={r.desc}
                        selected={form.yearlyRevenue === r.value}
                        onClick={() => setForm({ ...form, yearlyRevenue: r.value })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INDUSTRIES.map((ind) => (
                  <ChoiceCard
                    key={ind.value}
                    label={ind.label}
                    selected={form.industry === ind.value}
                    onClick={() => setForm({ ...form, industry: ind.value })}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : (
              <div />
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="gap-2 min-w-[140px]"
            >
              {saving ? (
                "Saving…"
              ) : step === TOTAL_STEPS ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Let's go!
                </>
              ) : (
                <>
                  Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
