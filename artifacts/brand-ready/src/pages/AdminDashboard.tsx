import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, BarChart3, CreditCard, TrendingUp, Zap, CheckCircle2,
  XCircle, AlertTriangle, Ban, ShieldOff, ShieldCheck,
  Clock, Activity, DollarSign, Key,
} from "lucide-react";
import {
  useGetAdminStats, useListAdminUsers, useUpdateAdminUser, useDeleteAdminUser,
  useGetAdminSettings,
  getGetAdminStatsQueryKey, getListAdminUsersQueryKey, getGetAdminSettingsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

function KpiCard({ label, value, icon: Icon, isLoading, format, color }: {
  label: string; value: number | null | undefined; icon: React.ElementType;
  isLoading: boolean; format?: "currency" | "number" | "score"; color?: string;
}) {
  const formatted = () => {
    if (value === null || value === undefined) return "—";
    if (format === "currency") return `₦${value.toLocaleString()}`;
    if (format === "score") return `${value}/100`;
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color ?? "bg-primary/10"}`}>
            <Icon className={`h-4 w-4 ${color ? "text-white" : "text-primary"}`} />
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-2xl font-bold tracking-tight">{formatted()}</p>
        )}
      </CardContent>
    </Card>
  );
}

const API_INTEGRATION_KEYS = [
  { name: "OpenAI API", key: "openaiApiKey" },
  { name: "SERP API", key: "serpApiKey" },
  { name: "Meta Ads Token", key: "metaAdsToken" },
  { name: "YouTube Data API", key: "youtubeApiKey" },
  { name: "Flutterwave Public", key: "flutterwavePublicKey" },
  { name: "Flutterwave Secret", key: "flutterwaveSecretKey" },
  { name: "Google Custom Search", key: "googleCustomSearchApiKey" },
  { name: "Google OAuth", key: "googleClientId" },
  { name: "Resend Email", key: "resendApiKey" },
  { name: "LinkedIn Client ID", key: "linkedinClientId" },
  { name: "Trustpilot API Key", key: "trustpilotApiKey" },
];

function ApiConfigStatus({ headers }: { headers: Record<string, string> }) {
  const { data: settings, isLoading } = useGetAdminSettings({
    query: { queryKey: getGetAdminSettingsQueryKey(), retry: false },
    request: { headers },
  });

  const cfg = settings as unknown as Record<string, string | null | undefined> | undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" /> Integration Config Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {API_INTEGRATION_KEYS.map((api) => {
          const configured = !!(cfg && cfg[api.key]);
          return (
            <div key={api.key} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  isLoading ? "bg-muted animate-pulse" : configured ? "bg-green-500" : "bg-red-400"
                }`} />
                <span className="text-sm font-medium">{api.name}</span>
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <Badge variant={configured ? "default" : "outline"} className={`text-xs h-5 ${configured ? "bg-green-100 text-green-700 border-green-200" : "text-muted-foreground"}`}>
                  {configured ? "Configured" : "Not set"}
                </Badge>
              )}
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground mt-2 px-2">Configure keys in Admin → API Integrations.</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const adminHeaders = getAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey(), retry: false },
    request: { headers: adminHeaders },
  });
  const { data: users, isLoading: usersLoading } = useListAdminUsers({
    query: { queryKey: getListAdminUsersQueryKey(), retry: false },
    request: { headers: adminHeaders },
  });

  const updateUser = useUpdateAdminUser({ request: { headers: adminHeaders } });
  const deleteUser = useDeleteAdminUser({ request: { headers: adminHeaders } });

  const handleStatusChange = (sessionId: string, status: "active" | "disabled" | "banned") => {
    updateUser.mutate(
      { sessionId, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
          toast({ title: "User updated", description: `Status changed to ${status}.` });
        },
        onError: () => toast({ title: "Error", description: "Failed to update user.", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (sessionId: string) => {
    deleteUser.mutate(
      { sessionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
          setDeleteTarget(null);
          toast({ title: "User deleted", description: "Account has been permanently removed." });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" }),
      }
    );
  };

  const recentUsers = users?.slice(0, 10) ?? [];
  const freeUsers = (stats?.totalUsers ?? 0) - (stats?.activeSubscriptions ?? 0);

  return (
    <AdminAuthGate>
      <AdminLayout title="Overview" subtitle="Platform-wide metrics and management">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <KpiCard label="Total Users" value={stats?.totalUsers} icon={Users} isLoading={statsLoading} />
          <KpiCard label="Active Subs" value={stats?.activeSubscriptions} icon={CreditCard} isLoading={statsLoading} color="bg-blue-500" />
          <KpiCard label="MRR" value={stats?.mrr} icon={DollarSign} isLoading={statsLoading} format="currency" color="bg-green-500" />
          <KpiCard label="Scans Today" value={stats?.scansToday} icon={Zap} isLoading={statsLoading} color="bg-amber-500" />
          <KpiCard label="Avg Score" value={stats?.averageScore ?? undefined} icon={TrendingUp} isLoading={statsLoading} format="score" color="bg-purple-500" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          {/* Revenue Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Revenue Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Monthly Recurring Revenue", value: stats?.mrr != null ? `₦${stats.mrr.toLocaleString()}` : "—" },
                { label: "Active Subscriptions", value: stats?.activeSubscriptions?.toLocaleString() ?? "—" },
                { label: "Free Users", value: freeUsers.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  {statsLoading ? <Skeleton className="h-5 w-16" /> : <span className="font-semibold tabular-nums">{value}</span>}
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">Connect Flutterwave to track payment transactions.</p>
            </CardContent>
          </Card>

          {/* User Plan Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" /> User Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Users", value: stats?.totalUsers, color: "bg-muted" },
                { label: "Paid (Active Subs)", value: stats?.activeSubscriptions, color: "bg-primary" },
                { label: "Free Tier", value: freeUsers, color: "bg-blue-400" },
              ].map(({ label, value, color }) => {
                const pct = stats?.totalUsers ? Math.round(((value ?? 0) / stats.totalUsers) * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{label}</span>
                      {statsLoading ? <Skeleton className="h-4 w-10" /> : <span className="text-muted-foreground">{value?.toLocaleString() ?? "—"} ({pct}%)</span>}
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground pt-1">Per-plan breakdown available in a future update.</p>
            </CardContent>
          </Card>

          {/* API Config Status */}
          <ApiConfigStatus headers={adminHeaders} />
        </div>

        {/* Users Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Recent Users
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No users registered yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email Status</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentUsers.map((user) => (
                      <tr key={user.sessionId} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium truncate max-w-[120px]">
                          {user.fullName ?? <span className="text-muted-foreground italic">No name</span>}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground truncate max-w-[160px]">{user.email ?? "—"}</td>
                        <td className="px-3 py-3">
                          {user.emailConfirmed ? (
                            <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                              <Clock className="h-3 w-3" /> Not Active
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {user.status === "banned" ? (
                            <Badge variant="destructive" className="text-xs">Banned</Badge>
                          ) : user.status === "disabled" ? (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          ) : (
                            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {user.hasActiveSubscription ? (
                            <Badge className="text-xs">Pro</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Free</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {user.status !== "disabled" ? (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                                onClick={() => handleStatusChange(user.sessionId, "disabled")}>
                                <ShieldOff className="h-3 w-3" /> Disable
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
                                onClick={() => handleStatusChange(user.sessionId, "active")}>
                                <ShieldCheck className="h-3 w-3" /> Enable
                              </Button>
                            )}
                            {user.status !== "banned" ? (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-red-500 hover:text-red-600"
                                onClick={() => handleStatusChange(user.sessionId, "banned")}>
                                <Ban className="h-3 w-3" /> Ban
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-green-600"
                                onClick={() => handleStatusChange(user.sessionId, "active")}>
                                <CheckCircle2 className="h-3 w-3" /> Unban
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700"
                              onClick={() => setDeleteTarget(user.sessionId)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground space-y-2">
              <CreditCard className="h-10 w-10 mx-auto opacity-20" />
              <p className="text-sm font-medium">No payment records yet</p>
              <p className="text-xs">Payment transaction history will appear here once Flutterwave is connected and users subscribe to a plan.</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user's account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminAuthGate>
  );
}
