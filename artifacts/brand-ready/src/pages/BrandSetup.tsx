import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Instagram, Linkedin, Twitter, Youtube, Facebook,
  Target, Users, Zap, Check, Plus, X, ChevronRight, ChevronLeft,
  Link as LinkIcon, CheckCircle2,
} from "lucide-react";
import {
  useGetUserBrandProfile, useUpdateUserBrandProfile, getGetUserBrandProfileQueryKey,
} from "@workspace/api-client-react";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { INDUSTRIES } from "@/lib/industries";

const brandSchema = z.object({
  brandName: z.string().min(1, "Brand name is required"),
  websiteUrl: z.string().url("Enter a valid URL").or(z.literal("")),
  industry: z.string().min(1, "Industry is required"),
  brandDescription: z.string().optional(),
  targetAudience: z.string().optional(),
  instagramHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  twitterHandle: z.string().optional(),
  facebookUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  competitor1: z.string().optional(),
  competitor2: z.string().optional(),
  competitor3: z.string().optional(),
});
type BrandForm = z.infer<typeof brandSchema>;

const STEPS = [
  { id: 1, label: "Brand Info", description: "Core brand details" },
  { id: 2, label: "Social Channels", description: "Connect your social media" },
  { id: 3, label: "Competitors", description: "Who you compete with" },
  { id: 4, label: "Review & Launch", description: "Confirm and run analysis" },
];

const SOCIAL_PLATFORMS = [
  { key: "instagramHandle" as const, label: "Instagram", Icon: Instagram, color: "text-pink-600", bg: "bg-pink-50 border-pink-200", placeholder: "@yourbrand" },
  { key: "linkedinUrl" as const, label: "LinkedIn", Icon: Linkedin, color: "text-blue-700", bg: "bg-blue-50 border-blue-200", placeholder: "https://linkedin.com/company/yourbrand" },
  { key: "twitterHandle" as const, label: "X (Twitter)", Icon: Twitter, color: "text-sky-500", bg: "bg-sky-50 border-sky-200", placeholder: "@yourbrand" },
  { key: "youtubeUrl" as const, label: "YouTube", Icon: Youtube, color: "text-red-600", bg: "bg-red-50 border-red-200", placeholder: "https://youtube.com/@yourbrand" },
  { key: "facebookUrl" as const, label: "Facebook", Icon: Facebook, color: "text-blue-600", bg: "bg-blue-50 border-blue-100", placeholder: "https://facebook.com/yourbrand" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                done ? "bg-primary border-primary text-primary-foreground"
                  : active ? "border-primary text-primary bg-primary/10"
                    : "border-muted-foreground/30 text-muted-foreground bg-background"
              )}>
                {done ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <div className="mt-1.5 text-center hidden sm:block">
                <p className={cn("text-[11px] font-semibold leading-tight", active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-1 transition-colors", done ? "bg-primary" : "bg-muted")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SocialRow({
  platform, value, onChange,
}: {
  platform: typeof SOCIAL_PLATFORMS[0];
  value: string;
  onChange: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const connected = !!value;

  const handleConnect = () => {
    setDraft(value);
    setEditing(true);
  };

  const handleSave = () => {
    onChange(draft);
    setEditing(false);
  };

  const handleDisconnect = () => {
    onChange("");
    setEditing(false);
  };

  return (
    <div className={cn("rounded-xl border p-4 transition-all", connected ? platform.bg : "bg-card border-muted")}>
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", connected ? "bg-white shadow-sm" : "bg-muted")}>
          <platform.Icon className={cn("h-5 w-5", connected ? platform.color : "text-muted-foreground")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{platform.label}</p>
          {connected && !editing && (
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          )}
        </div>
        {!editing && (
          connected ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-[11px] text-green-600 border-green-200 bg-green-50 gap-1 h-5 px-2">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </Badge>
              <button
                type="button"
                onClick={handleConnect}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1 flex-shrink-0" onClick={handleConnect}>
              <Plus className="h-3.5 w-3.5" /> Connect
            </Button>
          )
        )}
      </div>
      {editing && (
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={platform.placeholder}
              className="pl-8 h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <Button type="button" size="sm" className="h-8 text-xs" onClick={handleSave}>Save</Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b last:border-0">
      <span className="text-xs text-muted-foreground font-medium flex-shrink-0 w-32">{label}</span>
      <span className={cn("text-sm text-right flex-1", value ? "font-medium" : "text-muted-foreground italic")}>
        {value || "Not set"}
      </span>
    </div>
  );
}

export default function BrandSetup() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const { data: profile, isLoading } = useGetUserBrandProfile(
    { sessionId },
    { query: { queryKey: getGetUserBrandProfileQueryKey({ sessionId }), enabled: !!sessionId, retry: false } }
  );
  const updateBrandProfile = useUpdateUserBrandProfile();

  const form = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      brandName: "", websiteUrl: "", industry: "", brandDescription: "",
      targetAudience: "", instagramHandle: "", linkedinUrl: "",
      twitterHandle: "", facebookUrl: "", youtubeUrl: "",
      competitor1: "", competitor2: "", competitor3: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        brandName: profile.brandName ?? "",
        websiteUrl: profile.websiteUrl ?? "",
        industry: profile.industry ?? "",
        brandDescription: profile.brandDescription ?? "",
        targetAudience: profile.targetAudience ?? "",
        instagramHandle: profile.instagramHandle ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        twitterHandle: profile.twitterHandle ?? "",
        facebookUrl: profile.facebookUrl ?? "",
        youtubeUrl: profile.youtubeUrl ?? "",
        competitor1: profile.competitor1 ?? "",
        competitor2: profile.competitor2 ?? "",
        competitor3: profile.competitor3 ?? "",
      });
    }
  }, [profile, form]);

  const saveProfile = async (data: BrandForm) => {
    return new Promise<void>((resolve, reject) => {
      updateBrandProfile.mutate(
        {
          params: { sessionId },
          data: {
            brandName: data.brandName || null,
            websiteUrl: data.websiteUrl || null,
            industry: data.industry || null,
            brandDescription: data.brandDescription || null,
            targetAudience: data.targetAudience || null,
            instagramHandle: data.instagramHandle || null,
            linkedinUrl: data.linkedinUrl || null,
            twitterHandle: data.twitterHandle || null,
            facebookUrl: data.facebookUrl || null,
            youtubeUrl: data.youtubeUrl || null,
            competitor1: data.competitor1 || null,
            competitor2: data.competitor2 || null,
            competitor3: data.competitor3 || null,
          },
        },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetUserBrandProfileQueryKey({ sessionId }) });
            resolve();
          },
          onError: reject,
        }
      );
    });
  };

  const handleNext = async () => {
    if (step === 1) {
      const valid = await form.trigger(["brandName", "websiteUrl", "industry"]);
      if (!valid) return;
    }
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    const data = form.getValues();
    setSaving(true);
    try {
      await saveProfile(data);
      toast({ title: "Brand profile saved", description: "Your brand details have been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save brand profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndAnalyze = async () => {
    const data = form.getValues();
    setSaving(true);
    try {
      await saveProfile(data);
      setLocation("/analyze");
    } catch {
      toast({ title: "Error", description: "Failed to save brand profile.", variant: "destructive" });
      setSaving(false);
    }
  };

  const values = form.watch();
  const completedSocials = SOCIAL_PLATFORMS.filter((p) => !!values[p.key]).length;
  const completedCompetitors = [values.competitor1, values.competitor2, values.competitor3].filter(Boolean).length;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Brand Setup</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Complete your brand profile to get the most accurate analysis results
            </p>
          </div>
          {profile?.brandName && (
            <Badge variant="secondary" className="mt-1 flex-shrink-0">{profile.brandName}</Badge>
          )}
        </div>

        {/* Step Indicator */}
        <StepIndicator currentStep={step} />

        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}>

            {/* Step 1: Brand Info */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Brand Basics
                  </CardTitle>
                  <CardDescription>Core information about your brand</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="brandName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Name <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Acme Technologies" data-testid="input-brand-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input {...field} placeholder="https://yourwebsite.com" className="pl-9" data-testid="input-website-url" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-industry">
                            <SelectValue placeholder="Select your industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDUSTRIES.map((ind) => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="brandDescription" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe what your brand does, who it serves, and what makes it unique..."
                          rows={3}
                          data-testid="textarea-brand-description"
                        />
                      </FormControl>
                      <FormDescription>Used to generate more accurate AI recommendations</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="targetAudience" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" /> Target Audience
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g. Small business owners aged 25-45 in West Africa"
                          data-testid="input-target-audience"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            )}

            {/* Step 2: Social Media */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" /> Social Channels
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {completedSocials}/{SOCIAL_PLATFORMS.length} connected
                    </span>
                  </CardTitle>
                  <CardDescription>Connect your social media profiles to improve your analysis accuracy</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SOCIAL_PLATFORMS.map((platform) => (
                    <FormField
                      key={platform.key}
                      control={form.control}
                      name={platform.key}
                      render={({ field }) => (
                        <SocialRow
                          platform={platform}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      )}
                    />
                  ))}
                  <p className="text-xs text-muted-foreground pt-1">
                    Connecting more channels improves your Social Media dimension score accuracy.
                    You can always update these later.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Competitors */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Target className="h-4 w-4" /> Top Competitors
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {completedCompetitors}/3 added
                    </span>
                  </CardTitle>
                  <CardDescription>Enter up to 3 competitor websites to benchmark against</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(["competitor1", "competitor2", "competitor3"] as const).map((fieldName, i) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Competitor {i + 1}
                            {field.value && <Badge variant="outline" className="text-[10px] text-green-600 border-green-200 h-4 px-1.5">Added</Badge>}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                {...field}
                                placeholder={`https://competitor${i + 1}.com`}
                                className="pl-9"
                                data-testid={`input-${fieldName}`}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mt-2">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Why add competitors?</p>
                    <p className="text-xs text-blue-600">
                      Competitor benchmarking is one of your 6 scored dimensions.
                      Adding competitors gives you a relative position and surfaces gaps they've solved that you haven't.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Review & Launch */}
            {step === 4 && (
              <div className="space-y-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" /> Review Your Brand Profile
                    </CardTitle>
                    <CardDescription>Confirm everything looks right before running your analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Brand Info */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Brand Info</p>
                      <div className="bg-muted/30 rounded-xl px-4 py-1">
                        <ReviewRow label="Brand Name" value={values.brandName} />
                        <ReviewRow label="Website" value={values.websiteUrl} />
                        <ReviewRow label="Industry" value={values.industry} />
                        <ReviewRow label="Description" value={values.brandDescription} />
                        <ReviewRow label="Target Audience" value={values.targetAudience} />
                      </div>
                    </div>

                    {/* Social Channels */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                        Social Channels ({completedSocials} connected)
                      </p>
                      <div className="bg-muted/30 rounded-xl px-4 py-1">
                        {SOCIAL_PLATFORMS.map((p) => (
                          <ReviewRow key={p.key} label={p.label} value={values[p.key]} />
                        ))}
                      </div>
                    </div>

                    {/* Competitors */}
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
                        Competitors ({completedCompetitors} added)
                      </p>
                      <div className="bg-muted/30 rounded-xl px-4 py-1">
                        <ReviewRow label="Competitor 1" value={values.competitor1} />
                        <ReviewRow label="Competitor 2" value={values.competitor2} />
                        <ReviewRow label="Competitor 3" value={values.competitor3} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Launch card */}
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-blue-50/40">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg">Ready to run your analysis?</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          We'll scan 8 data sources across your brand — website, social, content, reviews, SEO, competitors, messaging, and more.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={saving}
                            onClick={handleSave}
                            data-testid="button-save-brand"
                          >
                            {saving ? "Saving..." : "Save Only"}
                          </Button>
                          <Button
                            type="button"
                            disabled={saving}
                            className="gap-2"
                            data-testid="button-save-and-analyze"
                            onClick={handleSaveAndAnalyze}
                          >
                            <Zap className="h-4 w-4" />
                            {saving ? "Saving..." : "Run Full Analysis"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </form>
        </Form>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Step {step} of {STEPS.length}
          </div>
          {step < 4 ? (
            <Button type="button" onClick={handleNext} className="gap-1.5">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-20" />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
