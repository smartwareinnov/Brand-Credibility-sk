import { useState } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard, CheckCircle2, Clock, ArrowUpRight, Zap, AlertCircle,
  RefreshCw, XCircle, ToggleLeft, ToggleRight, CalendarDays, History,
  ShieldCheck, Flame, AlertTriangle, TrendingUp, RotateCcw,
} from "lucide-react";
import { useGetUserProfile, getGetUserProfileQueryKey, useGetUserSubscription, getGetUserSubscriptionQueryKey } from "@workspace/api-client-react";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLAN_CONFIG: Record<string, {
  label: string; color: string; textColor: string; bg: string; price: string; interval: string; features: string[];
}> = {
  "starter-monthly": {
    label: "Starter", color: "border-blue-200 bg-blue-50", textColor: "text-blue-600", bg: "bg-blue-50",
    price: "₦9,900", interval: "/month",
    features: ["1 brand analysis/month", "Ad readiness score", "Basic action plan (10 tasks)", "2 competitor comparisons"],
  },
  "growth-monthly": {
    label: "Growth", color: "border-violet-200 bg-violet-50", textColor: "text-violet-600", bg: "bg-violet-50",
    price: "₦24,900", interval: "/month",
    features: ["5 brand analyses/month", "Full score breakdown", "Complete action plan", "Daily personalised tasks", "3 competitor analyses"],
  },
  "growth-yearly": {
    label: "Growth Annual", color: "border-emerald-200 bg-emerald-50", textColor: "text-emerald-600", bg: "bg-emerald-50",
    price: "₦249,000", interval: "/year",
    features: ["Unlimited analyses", "Full score breakdown", "Daily tasks (365 days)", "Unlimited competitors", "Brand mention monitoring", "Priority support"],
  },
};

const PLAN_NAMES: Record<string, string> = {
  "starter-monthly": "Starter Monthly",
  "growth-monthly": "Growth Monthly",
  "growth-yearly": "Growth Annual",
};

function DaysCountdown({ days }: { days: number }) {
  if (days <= 1) return (
    <div className="flex items-center gap-1.5 text-red-600 font-semibold">
      <Flame className="h-4 w-4" />
      <span>Expires Today!</span>
    </div>
  );
  if (days <= 3) return (
    <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
      <AlertTriangle className="h-4 w-4" />
      <span>{days} days left</span>
    </div>
  );
  if (days <= 7) return (
    <div className="flex items-center gap-1.5 text-orange-500 font-semibold">
      <Clock className="h-4 w-4" />
      <span>{days} days left</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-green-600 font-medium">
      <CheckCircle2 className="h-4 w-4" />
      <span>{days} days left</span>
    </div>
  );
}

function ExpiryBanner({ days, planName, autoRenew }: { days: number; planName: string; autoRenew: boolean }) {
  if (days > 14) return null;

  const isUrgent = days <= 3;
  const isMedium = days > 3 && days <= 7;

  return (
    <div className={cn(
      "flex items-start gap-3 p-4 rounded-xl border text-sm",
      isUrgent ? "bg-red-50 border-red-200" : isMedium ? "bg-amber-50 border-amber-200" : "bg-yellow-50 border-yellow-200"
    )}>
      <AlertCircle className={cn("h-5 w-5 flex-shrink-0 mt-0.5", isUrgent ? "text-red-500" : "text-amber-500")} />
      <div className="flex-1">
        <p className={cn("font-semibold", isUrgent ? "text-red-800" : "text-amber-800")}>
          {days <= 1 ? "Your subscription expires today!" : `Your subscription expires in ${days} days`}
        </p>
        <p className={cn("mt-0.5", isUrgent ? "text-red-600" : "text-amber-700")}>
          {autoRenew
            ? `Your ${planName} will renew automatically. Make sure your payment details are up to date.`
            : `Your ${planName} will not renew automatically. Renew now to keep your access.`}
        </p>
      </div>
      {!autoRenew && (
        <Link href="/pricing">
          <Button size="sm" className="flex-shrink-0 gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Renew
          </Button>
        </Link>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const sessionId = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState<"cancel" | "reactivate" | "toggle-renew" | null>(null);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile(
    { sessionId },
    { query: { queryKey: getGetUserProfileQueryKey({ sessionId }), enabled: !!sessionId } }
  );

  const email = profile?.email ?? "";
  const { data, isLoading: subLoading } = useGetUserSubscription(
    { email },
    { query: { queryKey: getGetUserSubscriptionQueryKey({ email }), enabled: !!email } }
  );

  const isLoading = profileLoading || subLoading;
  const hasSubscription = data?.hasActiveSubscription ?? false;
  const subscription = data?.subscription as (typeof data extends undefined ? null : NonNullable<typeof data>["subscription"] & {
    autoRenew?: boolean; cancelledAt?: string | null; daysUntilExpiry?: number | null;
  }) | null | undefined;
  const paymentHistory = (data?.paymentHistory ?? []) as Array<{
    id: number; planId: string; currency: string; status: string;
    isActive?: boolean; expiresAt?: string | null; createdAt: string;
  }>;

  const planKey = subscription?.planId ?? "";
  const planConfig = PLAN_CONFIG[planKey];
  const planName = PLAN_NAMES[planKey] ?? planKey;
  const autoRenew = (subscription as { autoRenew?: boolean } | null | undefined)?.autoRenew ?? true;
  const cancelledAt = (subscription as { cancelledAt?: string | null } | null | undefined)?.cancelledAt;
  const daysUntilExpiry = (subscription as { daysUntilExpiry?: number | null } | null | undefined)?.daysUntilExpiry ?? null;

  function invalidateSub() {
    queryClient.invalidateQueries({ queryKey: getGetUserSubscriptionQueryKey({ email }) });
  }

  async function handleCancel() {
    if (!sessionId) return;
    setLoading("cancel");
    try {
      const res = await fetch(`${BASE}/api/subscriptions/cancel`, {
        method: "POST",
        headers: { "x-session-id": sessionId, "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast({ title: "Cancellation scheduled", description: "Your subscription will not renew at period end. You'll keep access until then." });
        invalidateSub();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Failed to cancel", description: (err as { error?: string }).error ?? "Please try again." });
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleReactivate() {
    if (!sessionId) return;
    setLoading("reactivate");
    try {
      const res = await fetch(`${BASE}/api/subscriptions/reactivate`, {
        method: "POST",
        headers: { "x-session-id": sessionId, "Content-Type": "application/json" },
      });
      if (res.ok) {
        toast({ title: "Subscription reactivated", description: "Your subscription will now renew automatically." });
        invalidateSub();
      } else {
        toast({ variant: "destructive", title: "Failed to reactivate" });
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleToggleAutoRenew(value: boolean) {
    if (!sessionId) return;
    setLoading("toggle-renew");
    try {
      const res = await fetch(`${BASE}/api/subscriptions/auto-renew`, {
        method: "PATCH",
        headers: { "x-session-id": sessionId, "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: value }),
      });
      if (res.ok) {
        toast({
          title: value ? "Auto-renewal enabled" : "Auto-renewal disabled",
          description: value
            ? "Your subscription will renew automatically before expiry."
            : "Your subscription will not renew. You'll be reminded before expiry.",
        });
        invalidateSub();
      } else {
        toast({ variant: "destructive", title: "Failed to update auto-renewal" });
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6 pb-16">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your plan, renewals, and billing history</p>
        </div>

        {/* Expiry banner */}
        {!isLoading && hasSubscription && daysUntilExpiry !== null && daysUntilExpiry <= 14 && (
          <ExpiryBanner days={daysUntilExpiry} planName={planName} autoRenew={autoRenew} />
        )}

        {/* Current Plan */}
        <Card className={cn("border-2", hasSubscription && planConfig ? planConfig.color : "border-muted")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Current Plan
              </CardTitle>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  {cancelledAt && (
                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                      Cancels at period end
                    </Badge>
                  )}
                  <Badge variant={hasSubscription ? "default" : "secondary"} className="text-xs">
                    {hasSubscription ? "Active" : "Free Plan"}
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : hasSubscription && planConfig ? (
              <div className="space-y-5">
                <div className="flex items-end gap-2">
                  <span className={cn("text-4xl font-extrabold", planConfig.textColor)}>{planConfig.price}</span>
                  <span className="text-muted-foreground text-sm pb-1">{planConfig.interval}</span>
                  <Badge variant="outline" className={cn("ml-2 mb-1", planConfig.textColor)}>{planConfig.label}</Badge>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Status</p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-700">Active</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                      {cancelledAt ? "Access until" : "Next renewal"}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {subscription?.expiresAt
                          ? new Date(subscription.expiresAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Time Remaining</p>
                    {daysUntilExpiry !== null ? (
                      <DaysCountdown days={daysUntilExpiry} />
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Billing Cycle</p>
                    <span className="font-medium capitalize">{planKey.includes("yearly") ? "Annual" : "Monthly"}</span>
                  </div>
                </div>

                <Separator />

                {/* Auto-renewal toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Auto-Renewal</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {autoRenew
                          ? "Your subscription renews automatically. You'll get a reminder email before each renewal."
                          : "Auto-renewal is off. You'll need to manually renew before expiry."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAutoRenew(!autoRenew)}
                    disabled={loading === "toggle-renew"}
                    className="flex-shrink-0 ml-4 disabled:opacity-50"
                    aria-label="Toggle auto-renewal"
                  >
                    {autoRenew
                      ? <ToggleRight className="h-8 w-8 text-primary" />
                      : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    }
                  </button>
                </div>

                {/* Features */}
                <div className="border rounded-xl p-4 bg-background/60">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Included in your plan</p>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {planConfig.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Link href="/pricing">
                    <Button size="sm" className="text-xs gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> Upgrade Plan
                    </Button>
                  </Link>
                  {cancelledAt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50"
                      onClick={handleReactivate}
                      disabled={loading === "reactivate"}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {loading === "reactivate" ? "Reactivating…" : "Undo Cancellation"}
                    </Button>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/5">
                          <XCircle className="h-3.5 w-3.5" /> Cancel Plan
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Your <strong>{planName}</strong> subscription will remain active until{" "}
                            <strong>
                              {subscription?.expiresAt
                                ? new Date(subscription.expiresAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })
                                : "the end of your billing period"}
                            </strong>
                            . After that, you'll be moved to the free plan. You can undo this any time before then.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep my plan</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-destructive hover:bg-destructive/90"
                          >
                            {loading === "cancel" ? "Cancelling…" : "Yes, cancel plan"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Link href="/pricing">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <RefreshCw className="h-3.5 w-3.5" /> Renew Early
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">You're on the Free Plan</p>
                    <p className="text-sm text-muted-foreground">1 analysis/month · basic features only</p>
                  </div>
                </div>
                <Link href="/pricing">
                  <Button className="gap-1.5 flex-shrink-0">
                    <Zap className="h-4 w-4" /> Upgrade Plan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminder schedule card */}
        {hasSubscription && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Renewal Reminder Schedule
              </CardTitle>
              <CardDescription>We'll send you email and in-app reminders before your subscription expires</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { days: 7, label: "7 days before expiry", desc: "First heads-up email" },
                  { days: 3, label: "3 days before expiry", desc: "Second reminder email" },
                  { days: 1, label: "Day of expiry", desc: "Final urgent reminder" },
                ].map((reminder) => {
                  const isSent = daysUntilExpiry !== null && daysUntilExpiry <= reminder.days;
                  return (
                    <div key={reminder.days} className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                        isSent ? "bg-green-100" : "bg-muted"
                      )}>
                        {isSent
                          ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                          : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{reminder.label}</p>
                        <p className="text-xs text-muted-foreground">{reminder.desc}</p>
                      </div>
                      <Badge variant={isSent ? "secondary" : "outline"} className="text-xs flex-shrink-0">
                        {isSent ? "Sent" : "Pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Reminders are sent to <strong>{email || "your email address"}</strong>. Update your email in{" "}
                <Link href="/profile" className="underline underline-offset-2">Profile Settings</Link>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Billing History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Billing History
            </CardTitle>
            <CardDescription>All transactions and subscription periods on your account</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : paymentHistory.length > 0 ? (
              <div>
                <div className="grid grid-cols-12 gap-2 px-6 py-2.5 border-b bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span className="col-span-3">Plan</span>
                  <span className="col-span-3">Started</span>
                  <span className="col-span-3">Expires</span>
                  <span className="col-span-2">Currency</span>
                  <span className="col-span-1 text-right">Status</span>
                </div>
                {paymentHistory.map((inv) => {
                  const config = PLAN_CONFIG[inv.planId];
                  const isCurrentActive = inv.isActive;
                  return (
                    <div key={inv.id} className="grid grid-cols-12 gap-2 px-6 py-3.5 border-b last:border-0 items-center hover:bg-muted/20 transition-colors">
                      <div className="col-span-3">
                        <span className="text-xs font-semibold">{config?.label ?? inv.planId}</span>
                        <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                          {inv.planId.includes("yearly") ? "(Annual)" : "(Monthly)"}
                        </span>
                      </div>
                      <span className="col-span-3 text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      <span className="col-span-3 text-xs text-muted-foreground">
                        {inv.expiresAt
                          ? new Date(inv.expiresAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })
                          : "—"}
                      </span>
                      <span className="col-span-2 text-xs font-medium">{inv.currency}</span>
                      <div className="col-span-1 flex justify-end">
                        {isCurrentActive ? (
                          <Badge className="text-[10px] px-1.5">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-1.5">Past</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm">No billing history yet.</p>
                <p className="text-xs mt-1">Subscriptions will appear here once you subscribe.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade CTA for free users */}
        {!isLoading && !hasSubscription && (
          <Card className="border-primary/20">
            <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold">Ready to unlock the full platform?</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Daily tasks, unlimited analyses, competitor tracking. Starting at ₦9,900/month.
                </p>
              </div>
              <Link href="/pricing">
                <Button className="gap-1.5 flex-shrink-0">
                  Upgrade <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
