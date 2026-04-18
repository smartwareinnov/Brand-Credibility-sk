import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as z from "zod";
import {
  CheckCircle2, ArrowRight, ArrowLeft, Search, Instagram, Linkedin,
  Bell, Star, Zap, FileText, Globe, Briefcase,
  Plus, Facebook, Twitter, AlignLeft, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import { Link } from "wouter";
import { INDUSTRIES } from "@/lib/industries";

const ANALYSIS_STEPS = [
  { icon: Search, label: "Website & SEO", desc: "Scanning SEO metrics & organic keywords", color: "text-orange-500", bg: "bg-orange-500/10" },
  { icon: Instagram, label: "Instagram", desc: "Fetching social engagement & follower data", color: "text-pink-500", bg: "bg-pink-500/10" },
  { icon: Linkedin, label: "LinkedIn", desc: "Analyzing company profile & B2B signals", color: "text-sky-500", bg: "bg-sky-500/10" },
  { icon: Bell, label: "Google Alerts", desc: "Monitoring brand mentions & press coverage", color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { icon: Star, label: "Trustpilot / Google Reviews", desc: "Aggregating customer trust signals", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Sparkles, label: "Brand Intelligence", desc: "Evaluating brand clarity & positioning signals", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: Zap, label: "Scoring Engine", desc: "Computing your Ad Readiness Score", color: "text-primary", bg: "bg-primary/10" },
  { icon: FileText, label: "Roadmap Generation", desc: "Building your personalized action plan", color: "text-green-500", bg: "bg-green-500/10" },
];

const formSchema = z.object({
  brandName: z.string().min(2, "Brand name must be at least 2 characters."),
  websiteUrl: z.string().url("Please enter a valid URL."),
  industry: z.string().min(2, "Please select an industry."),
  brandDescription: z.string().optional(),
  instagramHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  xHandle: z.string().optional(),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal("")),
});

type FieldName = keyof z.infer<typeof formSchema>;

type UserBrand = {
  id: number;
  brandName: string;
  websiteUrl: string | null;
  industry: string | null;
  instagramHandle: string | null;
  linkedinUrl: string | null;
  facebookUrl: string | null;
  xHandle: string | null;
};

const FORM_STEPS = [
  { id: "details", name: "Brand Details", fields: ["brandName", "websiteUrl", "industry", "brandDescription"] },
  { id: "social", name: "Social Media", fields: ["instagramHandle", "linkedinUrl", "facebookUrl", "xHandle"] },
  { id: "contact", name: "Contact", fields: ["email"] },
];

function AnalyzingScreen({ currentStep }: { currentStep: number }) {
  return (
    <DashboardLayout>
      <div className="min-h-[85vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Analyzing Your Brand</h2>
            <p className="text-muted-foreground mt-1">Please wait while we pull data from 8 sources</p>
          </div>
          <div className="space-y-3">
            {ANALYSIS_STEPS.map((step, i) => {
              const status = i < currentStep ? "done" : i === currentStep ? "active" : "pending";
              return (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border transition-all duration-500",
                    status === "active" && "border-primary/40 bg-primary/5 shadow-sm",
                    status === "done" && "border-green-500/20 bg-green-500/5",
                    status === "pending" && "border-border bg-card opacity-50"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", step.bg)}>
                    {status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <step.icon className={cn("h-5 w-5", step.color, status === "active" && "animate-pulse")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("font-semibold text-sm", status === "pending" && "text-muted-foreground")}>{step.label}</p>
                      {status === "done" && <span className="text-xs text-green-600 font-medium">Done</span>}
                      {status === "active" && (
                        <span className="flex items-center gap-1 text-xs text-primary font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                          Running
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-8">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Progress</span>
              <span>{Math.round((currentStep / ANALYSIS_STEPS.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${(currentStep / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function Analyze() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = useSession();
  const { apiFetch } = useApi();

  const [selectedBrand, setSelectedBrand] = useState<UserBrand | null>(null);
  const [formStep, setFormStep] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandName: "", websiteUrl: "", industry: "",
      brandDescription: "",
      instagramHandle: "", linkedinUrl: "",
      facebookUrl: "", xHandle: "",
      email: "",
    },
  });

  const { data: savedBrands = [], isLoading: brandsLoading } = useQuery<UserBrand[]>({
    queryKey: ["user-brands", sessionId],
    queryFn: () => apiFetch<UserBrand[]>("/user/brands"),
    enabled: !!sessionId,
    staleTime: 60_000,
  });

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleSelectBrand = (brand: UserBrand) => {
    setSelectedBrand(brand);
    form.setValue("brandName", brand.brandName, { shouldValidate: true });
    if (brand.websiteUrl) form.setValue("websiteUrl", brand.websiteUrl, { shouldValidate: true });
    if (brand.industry) form.setValue("industry", brand.industry, { shouldValidate: true });
    if (brand.instagramHandle) form.setValue("instagramHandle", brand.instagramHandle);
    if (brand.linkedinUrl) form.setValue("linkedinUrl", brand.linkedinUrl);
    if (brand.facebookUrl) form.setValue("facebookUrl", brand.facebookUrl);
    if (brand.xHandle) form.setValue("xHandle", brand.xHandle);
    // Keep brandDescription and email blank — user fills those per-analysis
  };

  const startStepAnimation = () => {
    let idx = 0;
    setAnalysisStepIndex(0);
    intervalRef.current = setInterval(() => {
      idx += 1;
      setAnalysisStepIndex(idx);
      if (idx >= ANALYSIS_STEPS.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1800);
  };

  const nextFormStep = async () => {
    const fields = FORM_STEPS[formStep].fields;
    const ok = await form.trigger(fields as FieldName[], { shouldFocus: true });
    if (!ok) return;
    if (formStep < FORM_STEPS.length - 1) {
      setFormStep((s) => s + 1);
    } else {
      await form.handleSubmit(onSubmit)();
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsAnalyzing(true);
      startStepAnimation();
      const analysis = await apiFetch<{ id: number }>("/analyses", {
        method: "POST",
        body: JSON.stringify(values),
      });
      await apiFetch(`/analyses/${analysis.id}/run`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["saved-brand-analyses"] });
      setAnalysisStepIndex(ANALYSIS_STEPS.length);
      setTimeout(() => setLocation(`/results/${analysis.id}`), 800);
    } catch (error: any) {
      setIsAnalyzing(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      toast({
        title: "Analysis Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isAnalyzing) {
    return <AnalyzingScreen currentStep={analysisStepIndex} />;
  }

  const totalSteps = FORM_STEPS.length + 1;
  const currentDisplayStep = selectedBrand ? formStep + 2 : 1;
  const progressPct = ((currentDisplayStep - 1) / (totalSteps - 1)) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">New Brand Analysis</h1>
          <p className="text-muted-foreground">Tell us about your brand and we'll scan 8 data sources.</p>
        </div>

        {/* Step indicator */}
        <div className="relative mb-10">
          <div className="flex items-start justify-between relative z-10">
            {[{ id: "brand", name: "Select Brand" }, ...FORM_STEPS].map((step, index) => {
              const isDone = index === 0 ? !!selectedBrand : selectedBrand && formStep > index - 1;
              const isActive = index === 0 ? !selectedBrand : selectedBrand && formStep === index - 1;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all",
                    isDone && "bg-primary border-primary text-primary-foreground",
                    isActive && "border-primary text-primary bg-background shadow-sm",
                    !isDone && !isActive && "border-muted text-muted-foreground bg-background"
                  )}>
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={cn("text-xs mt-2 font-medium text-center leading-tight max-w-[70px]",
                    (isDone || isActive) ? "text-foreground" : "text-muted-foreground")}>
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="absolute top-4 left-[12%] right-[12%] h-[2px] bg-muted -z-0">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8">
          {/* Step 0: Select Brand */}
          {!selectedBrand ? (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Select a Brand</h2>
                  <p className="text-sm text-muted-foreground">Choose which brand to analyze</p>
                </div>
              </div>

              {brandsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : savedBrands.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                    <Briefcase className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No brands added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You need to add a brand before running an analysis.
                    </p>
                  </div>
                  <Link href="/my-brands">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" /> Add Your First Brand
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedBrands.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBrand(b)}
                      className="w-full text-left p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-150 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-base">{b.brandName[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{b.brandName}</p>
                          {b.websiteUrl && (
                            <p className="text-xs text-muted-foreground truncate">
                              {b.websiteUrl.replace(/^https?:\/\//, "")}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                  <Link href="/my-brands">
                    <button
                      type="button"
                      className="w-full text-left p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-muted/30 transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Add a new brand</p>
                      </div>
                    </button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <Form {...form}>
              <form className="space-y-5">
                {/* Selected brand indicator */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">{selectedBrand.brandName[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{selectedBrand.brandName}</p>
                    {selectedBrand.websiteUrl && (
                      <p className="text-xs text-muted-foreground truncate">{selectedBrand.websiteUrl.replace(/^https?:\/\//, "")}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-muted-foreground"
                    onClick={() => setSelectedBrand(null)}
                  >
                    Change
                  </Button>
                </div>

                {/* Form step 0: Brand Details */}
                {formStep === 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <FormField control={form.control} name="brandName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Brand Name</FormLabel>
                        <FormControl><Input placeholder="e.g. Acme Corp" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="https://acme.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="industry" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select an industry" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRIES.map((ind) => (
                              <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="brandDescription" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <AlignLeft className="h-3.5 w-3.5" /> Brand Description
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your brand: what you do, who you serve, and what makes you different. A clear description helps the AI generate more targeted insights and ad-readiness recommendations."
                            className="min-h-[100px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          The more detail you provide, the more accurate and actionable your brand report will be.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Form step 1: Social Media */}
                {formStep === 1 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-muted/40 rounded-xl px-4 py-3 text-sm text-muted-foreground border border-border/50">
                      <p className="font-medium text-foreground text-xs uppercase tracking-wide mb-1">Accuracy matters</p>
                      <p className="text-xs leading-relaxed">
                        Enter your exact, live profile URLs for each platform. The AI uses these to evaluate your brand's social presence and credibility signals. Inaccurate or placeholder URLs will reduce your score accuracy.
                      </p>
                    </div>

                    <FormField control={form.control} name="instagramHandle" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Instagram className="h-3.5 w-3.5" /> Instagram Handle
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">@</span>
                            <Input className="rounded-l-none" placeholder="yourbrand" {...field} />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your real Instagram username for accurate social scoring.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Linkedin className="h-3.5 w-3.5" /> LinkedIn Company URL
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/company/yourbrand" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your LinkedIn company page URL — not a personal profile. Critical for B2B credibility scoring.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Facebook className="h-3.5 w-3.5" /> Facebook Page URL
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://facebook.com/yourbrand" {...field} />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Required if you plan to run Meta Ads — enter the exact URL to your Facebook business page.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="xHandle" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          <Twitter className="h-3.5 w-3.5" /> X (Twitter) Handle
                          <span className="text-muted-foreground font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">@</span>
                            <Input className="rounded-l-none" placeholder="yourbrand" {...field} />
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your active X profile username. Helps evaluate brand reach and audience engagement signals.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                {/* Form step 2: Contact */}
                {formStep === 2 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Optional — but recommended</p>
                      <p>We'll send your full report and weekly score updates to this email.</p>
                    </div>
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="founder@acme.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                )}

                <div className="flex justify-between pt-5 border-t mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (formStep === 0) setSelectedBrand(null);
                      else setFormStep((s) => Math.max(0, s - 1));
                    }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button type="button" onClick={nextFormStep}>
                    {formStep === FORM_STEPS.length - 1 ? (
                      <><Zap className="w-4 h-4 mr-2" /> Run Analysis</>
                    ) : (
                      <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
