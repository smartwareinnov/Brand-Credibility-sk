import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search, Users, CheckCircle2, Clock, Ban, ShieldOff, ShieldCheck, Trash2,
  AlertTriangle, CreditCard, Crown,
} from "lucide-react";
import {
  useListAdminUsers, useUpdateAdminUser, useDeleteAdminUser,
  getListAdminUsersQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import type { AdminUser } from "@workspace/api-client-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface DbPlan {
  planId: string;
  name: string;
  period: string;
  active: boolean;
  popular?: boolean;
}

const PLAN_COLORS: Record<string, string> = {
  free: "text-slate-600 bg-slate-100 border-slate-200",
};
const DEFAULT_COLOR = "text-blue-600 bg-blue-50 border-blue-200";

const FALLBACK_PLANS = [
  { value: "free", label: "Free" },
  { value: "starter-monthly", label: "Starter Monthly" },
  { value: "growth-monthly", label: "Growth Monthly" },
  { value: "growth-yearly", label: "Growth Annual" },
];

function usePlatformPlans(adminToken: string) {
  const [plans, setPlans] = useState<{ value: string; label: string }[]>(FALLBACK_PLANS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!adminToken) return;
    const controller = new AbortController();
    fetch(`${API_BASE}/api/admin/plans`, {
      headers: { "x-admin-token": adminToken },
      signal: controller.signal,
    })
      .then(r => r.json())
      .then((data: DbPlan[]) => {
        if (controller.signal.aborted) return;
        if (Array.isArray(data) && data.length > 0) {
          const seen = new Set<string>();
          const items: { value: string; label: string }[] = [];
          items.push({ value: "free", label: "Free (remove plan)" });
          seen.add("free");
          for (const p of data) {
            if (!p.active || seen.has(p.planId)) continue;
            seen.add(p.planId);
            const suffix = p.period === "yearly" ? " (Annual)" : p.period === "monthly" ? " (Monthly)" : "";
            items.push({ value: p.planId, label: `${p.name}${suffix}` });
          }
          setPlans(items);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, [adminToken]);

  return { plans, loaded };
}

const DURATIONS = [
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
];

type AssignTarget = { sessionId: string; name: string; email: string; currentPlan: string };

function AssignPlanDialog({
  target,
  onClose,
  onAssigned,
  adminToken,
  plans,
}: {
  target: AssignTarget;
  onClose: () => void;
  onAssigned: () => void;
  adminToken: string;
  plans: { value: string; label: string }[];
}) {
  const { toast } = useToast();
  const defaultPlan = plans.find(p => p.value !== "free")?.value ?? "free";
  const [planId, setPlanId] = useState(defaultPlan);
  const [duration, setDuration] = useState("30");
  const [loading, setLoading] = useState(false);

  const handleAssign = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${target.sessionId}/assign-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ planId, durationDays: parseInt(duration) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to assign plan");
      toast({
        title: "Plan assigned",
        description: data.message ?? `${planId} assigned to ${target.email}`,
      });
      onAssigned();
      onClose();
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const isFree = planId === "free";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Assign Plan
          </DialogTitle>
          <DialogDescription>
            Manually assign a subscription plan to <strong>{target.name || target.email}</strong>.
            The user will receive an email and in-app notification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Select Plan</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isFree && (
            <div className="space-y-1.5">
              <Label>Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview */}
          <div className={`rounded-lg border px-4 py-3 ${PLAN_COLORS[planId] ?? DEFAULT_COLOR}`}>
            <p className="text-sm font-semibold">{plans.find(p => p.value === planId)?.label ?? planId}</p>
            {!isFree ? (
              <p className="text-xs mt-0.5 opacity-80">
                Active for {duration} days · expires {new Date(Date.now() + parseInt(duration) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            ) : (
              <p className="text-xs mt-0.5 opacity-80">User will be downgraded — existing subscription cancelled</p>
            )}
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <CreditCard className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>
              {isFree
                ? "This will cancel any active subscription and set the user's plan to Free."
                : "This is a manual assignment — no payment is processed. The user will be notified by email and in-app."}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? "Assigning…" : `Assign ${plans.find(p => p.value === planId)?.label ?? planId}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const adminHeaders = getAdminHeaders();
  const adminToken = localStorage.getItem("skorvia_admin_token") ?? "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { plans: platformPlans } = usePlatformPlans(adminToken);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled" | "banned">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");
  const [emailFilter, setEmailFilter] = useState<"all" | "confirmed" | "pending">("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);

  const { data: users, isLoading } = useListAdminUsers({
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
          toast({ title: "User deleted", description: "Account permanently removed." });
        },
        onError: () => toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" }),
      }
    );
  };

  const filtered = (users ?? []).filter((u: AdminUser) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (u.fullName ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.company ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    const matchPlan = planFilter === "all" ||
      (planFilter === "pro" && u.hasActiveSubscription) ||
      (planFilter === "free" && !u.hasActiveSubscription);
    const matchEmail = emailFilter === "all" ||
      (emailFilter === "confirmed" && u.emailConfirmed) ||
      (emailFilter === "pending" && !u.emailConfirmed);
    return matchSearch && matchStatus && matchPlan && matchEmail;
  });

  const stats = {
    total: users?.length ?? 0,
    active: users?.filter((u: AdminUser) => u.status === "active").length ?? 0,
    disabled: users?.filter((u: AdminUser) => u.status === "disabled").length ?? 0,
    banned: users?.filter((u: AdminUser) => u.status === "banned").length ?? 0,
    confirmed: users?.filter((u: AdminUser) => u.emailConfirmed).length ?? 0,
  };

  return (
    <AdminAuthGate>
      <AdminLayout title="Users" subtitle="Search, filter, and manage all user accounts">
        <div className="space-y-6">

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-foreground" },
              { label: "Active", value: stats.active, color: "text-green-600" },
              { label: "Disabled", value: stats.disabled, color: "text-amber-600" },
              { label: "Banned", value: stats.banned, color: "text-red-600" },
              { label: "Verified", value: stats.confirmed, color: "text-blue-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-10 mx-auto" />
                  ) : (
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search & Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> All Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Account status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as typeof planFilter)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={emailFilter} onValueChange={(v) => setEmailFilter(v as typeof emailFilter)}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Email status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Emails</SelectItem>
                    <SelectItem value="confirmed">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                Showing {filtered.length} of {stats.total} users
              </p>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  {search || statusFilter !== "all" ? "No users match your filters." : "No users registered yet."}
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {["Name", "Email", "Company", "Email Status", "Account", "Plan", "Analyses", "Joined", "Actions"].map((h) => (
                          <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((user: AdminUser) => (
                        <tr key={user.sessionId} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3 font-medium whitespace-nowrap">
                            {user.fullName ?? <span className="text-muted-foreground italic">No name</span>}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground max-w-[160px] truncate">{user.email ?? "—"}</td>
                          <td className="px-3 py-3 text-muted-foreground">{user.company ?? "—"}</td>
                          <td className="px-3 py-3">
                            {user.emailConfirmed ? (
                              <Badge className="text-xs gap-1 bg-green-100 text-green-700 border-green-200">
                                <CheckCircle2 className="h-3 w-3" /> Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300">
                                <Clock className="h-3 w-3" /> Pending
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
                            <div className="flex items-center gap-1.5">
                              {user.hasActiveSubscription ? (
                                <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">Pro</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Free</Badge>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-xs text-muted-foreground hover:text-primary"
                                title="Assign plan"
                                onClick={() => setAssignTarget({
                                  sessionId: user.sessionId,
                                  name: user.fullName ?? "",
                                  email: user.email ?? "",
                                  currentPlan: user.hasActiveSubscription ? "pro" : "free",
                                })}
                              >
                                <Crown className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 py-3 tabular-nums text-center">{user.analysisCount}</td>
                          <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              {user.status !== "disabled" ? (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs"
                                  title="Disable"
                                  onClick={() => handleStatusChange(user.sessionId, "disabled")}>
                                  <ShieldOff className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600"
                                  title="Enable"
                                  onClick={() => handleStatusChange(user.sessionId, "active")}>
                                  <ShieldCheck className="h-3 w-3" />
                                </Button>
                              )}
                              {user.status !== "banned" ? (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-500"
                                  title="Ban"
                                  onClick={() => handleStatusChange(user.sessionId, "banned")}>
                                  <Ban className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600"
                                  title="Unban"
                                  onClick={() => handleStatusChange(user.sessionId, "active")}>
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600"
                                title="Delete"
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
        </div>
      </AdminLayout>

      {/* Assign Plan Dialog */}
      {assignTarget && (
        <AssignPlanDialog
          target={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() })}
          adminToken={adminToken}
          plans={platformPlans}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" /> Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the user's account and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminAuthGate>
  );
}
