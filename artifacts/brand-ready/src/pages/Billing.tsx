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
  CreditCard, CheckCircle2, Clock, ArrowUpRight, Zap, Copy, Check,
  Gift, FileText, Download, AlertCircle, Wallet,
} from "lucide-react";
import {
  useGetUserProfile, getGetUserProfileQueryKey,
  useGetUserSubscription, getGetUserSubscriptionQueryKey,
} from "@workspace/api-client-react";
import { useSession } from "@/hooks/useSession";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLAN_CONFIG: Record<string, {
  label: string; color: string; bg: string; price: string; interval: string; features: string[];
}> = {
  "starter-monthly": {
    label: "Starter", color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    price: "₦9,900", interval: "/month",
    features: ["1 brand analysis/month", "Ad readiness score", "Basic action plan", "2 competitor comparisons"],
  },
  "growth-monthly": {
    label: "Growth", color: "text-violet-600", bg: "bg-violet-50 border-violet-200",
    price: "₦24,900", interval: "/month",
    features: ["5 brand analyses/month", "Full score breakdown", "Complete action plan", "Daily personalised tasks", "3 competitor analyses"],
  },
  "growth-yearly": {
    label: "Growth Pro", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200",
    price: "₦249,000", interval: "/year",
    features: ["Unlimited analyses", "Full score breakdown", "Daily tasks (365 days)", "Unlimited competitors", "Brand mention monitoring", "Priority support"],
  },
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1.5 rounded-md border hover:bg-muted transition-colors flex-shrink-0"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

export default function Billing() {
  const sessionId = useSession();
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState(false);

  const { data: profile, isLoading: profileLoading } = useGetUserProfile(
    { sessionId },
    { query: { queryKey: getGetUserProfileQueryKey({ sessionId }), enabled: !!sessionId } }
  );

  const email = profile?.email ?? "";
  const { data, isLoading: subLoading, refetch: refetchSub } = useGetUserSubscription(
    { email },
    { query: { queryKey: getGetUserSubscriptionQueryKey({ email }), enabled: !!email } }
  );

  const isLoading = profileLoading || subLoading;
  const hasSubscription = data?.hasActiveSubscription ?? false;
  const subscription = data?.subscription;
  const paymentHistory = (data?.paymentHistory ?? []) as Array<{
    id: number; planId: string; currency: string; status: string;
    isActive?: boolean; expiresAt?: string | null; createdAt: string;
  }>;
  const planKey = subscription?.planId ?? "";
  const planConfig = PLAN_CONFIG[planKey];
  const referralCode = `BR-${sessionId?.slice(-8)?.toUpperCase() ?? "XXXXXXXX"}`;
  const referralLink = `https://skorvia.io/register?ref=${referralCode}`;

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleCancelPlan = async () => {
    if (!sessionId) return;
    setCancelling(true);
    try {
      const res = await fetch(`${BASE}/api/subscriptions/cancel`, {
        method: "POST",
        headers: { "x-session-id": sessionId, "Content-Type": "application/json" },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to cancel");
      toast({ title: "Cancellation scheduled", description: "Your plan stays active until the end of the billing period." });
      refetchSub();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    toast({ title: "PDF generation coming soon", description: `Invoice #${invoiceId} will be available to download shortly.` });
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your plan, invoices, and referrals</p>
        </div>

        {/* Current Plan Card */}
        <Card className={cn("border-2", hasSubscription && planConfig ? planConfig.bg : "border-muted")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Current Plan
              </CardTitle>
              {isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge variant={hasSubscription ? "default" : "secondary"} className="text-xs">
                  {hasSubscription ? "Active" : "Free Plan"}
                </Badge>
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
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <span className={cn("text-4xl font-extrabold", planConfig.color)}>{planConfig.price}</span>
                  <span className="text-muted-foreground text-sm pb-1">{planConfig.interval}</span>
                  <Badge variant="outline" className={cn("ml-2 mb-1", planConfig.color)}>{planConfig.label}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Status</p>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-700">Active</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Renews</p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {subscription?.expiresAt
                          ? new Date(subscription.expiresAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Currency</p>
                    <span className="font-medium">{subscription?.currency ?? "NGN"}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Billing</p>
                    <span className="font-medium capitalize">{planKey.includes("yearly") ? "Annual" : "Monthly"}</span>
                  </div>
                </div>
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={handleCancelPlan}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling..." : "Cancel Plan"}
                  </Button>
                  <Link href="/pricing">
                    <Button size="sm" className="text-xs gap-1">Upgrade <ArrowUpRight className="h-3.5 w-3.5" /></Button>
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

        {/* Payment Method */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payment Method
            </CardTitle>
            <CardDescription>Your active payment method on file</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : hasSubscription ? (
              <div className="flex items-center gap-4 p-4 border rounded-xl bg-muted/20">
                <div className="w-12 h-8 bg-gradient-to-br from-primary/60 to-primary rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Wallet className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">Online Payment</p>
                  <p className="text-xs text-muted-foreground">{subscription?.currency ?? "NGN"} billing · Managed via payment gateway</p>
                </div>
                <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 flex-shrink-0">Active</Badge>
              </div>
            ) : (
              <div className="text-center py-6">
                <CreditCard className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No payment method on file.</p>
                <Link href="/pricing">
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Add Payment Method
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Invoice History
              </CardTitle>
              {paymentHistory.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download All
                </Button>
              )}
            </div>
            <CardDescription>All transactions on your account</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (hasSubscription && paymentHistory.length > 0) ? (
              <div>
                {/* Table Header */}
                <div className="grid grid-cols-5 gap-2 px-6 py-2 border-b bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Plan</span>
                  <span>Date</span>
                  <span>Expires</span>
                  <span>Currency</span>
                  <span className="text-right">Action</span>
                </div>
                {paymentHistory.map((inv) => {
                  const cfg = PLAN_CONFIG[inv.planId];
                  return (
                    <div key={inv.id} className="grid grid-cols-5 gap-2 px-6 py-3.5 border-b last:border-0 items-center hover:bg-muted/20 transition-colors">
                      <span className="text-xs font-medium truncate">{cfg?.label ?? inv.planId}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                      </span>
                      <span className="text-xs font-medium">{inv.currency}</span>
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => handleDownloadInvoice(inv.id)}
                        >
                          <Download className="h-3 w-3" /> PDF
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm">No invoices yet.</p>
                <p className="text-xs mt-1">Invoices will appear here once you subscribe to a plan.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-primary" /> Referral Program
            </CardTitle>
            <CardDescription>Earn ₦5,000 credit for every friend who subscribes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background border">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-0.5">Your Referral Link</p>
                <p className="text-sm font-mono truncate">{referralLink}</p>
              </div>
              <CopyButton value={referralLink} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-background border">
                <p className="text-2xl font-extrabold text-primary">0</p>
                <p className="text-xs text-muted-foreground mt-0.5">Referrals</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background border">
                <p className="text-2xl font-extrabold text-green-600">₦0</p>
                <p className="text-xs text-muted-foreground mt-0.5">Credits Earned</p>
              </div>
              <div className="text-center p-3 rounded-xl bg-background border">
                <p className="text-2xl font-extrabold text-amber-600">₦0</p>
                <p className="text-xs text-muted-foreground mt-0.5">Balance</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share your link — when a friend subscribes to any paid plan, you both earn ₦5,000 credit towards your next billing cycle.
            </p>
          </CardContent>
        </Card>

        {/* Upgrade CTA */}
        {!isLoading && !hasSubscription && (
          <Card className="border-primary/20">
            <CardContent className="p-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="font-semibold">Ready to unlock the full platform?</p>
                <p className="text-sm text-muted-foreground mt-0.5">Daily tasks, unlimited analyses, competitor tracking. Starting at ₦9,900/month.</p>
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
