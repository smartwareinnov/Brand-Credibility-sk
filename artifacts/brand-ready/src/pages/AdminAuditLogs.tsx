import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Search, Download, User, Settings, CreditCard, Shield, Zap, AlertTriangle } from "lucide-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders, ADMIN_SECRET_KEY } from "@/components/layout/AdminLayout";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Category = "user" | "billing" | "settings" | "security" | "analysis" | "admin";
type Severity = "info" | "warning" | "critical";

type LogEntry = {
  id: number;
  ts: string;
  actor: string;
  action: string;
  target: string;
  category: Category;
  severity: Severity;
};

function deriveCategory(targetType: string): Category {
  if (!targetType) return "admin";
  const t = targetType.toLowerCase();
  if (t === "user") return "user";
  if (["billing", "subscription", "plan", "coupon", "payment"].includes(t)) return "billing";
  if (["settings", "platform", "logo", "smtp", "smtp-config"].includes(t)) return "settings";
  if (["security", "auth", "login", "2fa"].includes(t)) return "security";
  if (["analysis", "scan"].includes(t)) return "analysis";
  return "admin";
}

function deriveSeverity(action: string): Severity {
  const a = action.toLowerCase();
  if (
    a.includes("delete") || a.includes("ban") || a.includes("block") ||
    a.includes("brute") || a.includes("critical") || a.includes("removed")
  ) return "critical";
  if (
    a.includes("disable") || a.includes("maintenance") || a.includes("live mode") ||
    a.includes("toggled") || a.includes("warn") || a.includes("failed login")
  ) return "warning";
  return "info";
}

function mapEntry(l: {
  id: number; actor: string; action: string; targetType: string; targetId: string; createdAt: string;
}): LogEntry {
  const target = [l.targetType, l.targetId].filter(Boolean).join(": ") || "—";
  return {
    id: l.id,
    ts: new Date(l.createdAt).toLocaleString("en-GB", { hour12: false }),
    actor: l.actor,
    action: l.action,
    target,
    category: deriveCategory(l.targetType),
    severity: deriveSeverity(l.action),
  };
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  user: User, billing: CreditCard, settings: Settings,
  security: Shield, analysis: Zap, admin: AlertTriangle,
};

const CATEGORY_COLORS: Record<string, string> = {
  user: "bg-blue-100 text-blue-700", billing: "bg-green-100 text-green-700",
  settings: "bg-purple-100 text-purple-700", security: "bg-red-100 text-red-700",
  analysis: "bg-amber-100 text-amber-700", admin: "bg-gray-100 text-gray-700",
};

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminAuditLogs() {
  const adminHeaders = getAdminHeaders();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | Category>("all");
  const [severity, setSeverity] = useState<"all" | Severity>("all");

  const adminToken = localStorage.getItem(ADMIN_SECRET_KEY) ?? "";

  const { data, isLoading } = useQuery<{ logs: LogEntry[]; total: number }>({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/admin/audit-logs?limit=100`, {
        headers: { "x-admin-token": adminToken },
      });
      const json = await res.json() as { logs: Array<{ id: number; actor: string; action: string; targetType: string; targetId: string; createdAt: string; }>; total: number };
      return {
        logs: (json.logs ?? []).map(mapEntry),
        total: json.total ?? 0,
      };
    },
    retry: false,
    enabled: !!adminToken,
  });

  const allLogs = data?.logs ?? [];

  const filtered = allLogs.filter((log) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      log.action.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q);
    const matchCat = category === "all" || log.category === category;
    const matchSev = severity === "all" || log.severity === severity;
    return matchSearch && matchCat && matchSev;
  });

  const handleExport = () => {
    const csv = [
      "Timestamp,Actor,Action,Target,Category,Severity",
      ...filtered.map(l => `"${l.ts}","${l.actor}","${l.action}","${l.target}","${l.category}","${l.severity}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const infoCount = allLogs.filter(l => l.severity === "info").length;
  const warnCount = allLogs.filter(l => l.severity === "warning").length;
  const critCount = allLogs.filter(l => l.severity === "critical").length;

  return (
    <AdminAuthGate>
      <AdminLayout
        title="Audit Logs"
        subtitle="Track all admin actions and system events"
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      >
        <div className="space-y-4">

          {/* Severity summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Info", count: infoCount, style: "text-blue-600" },
              { label: "Warnings", count: warnCount, style: "text-amber-600" },
              { label: "Critical", count: critCount, style: "text-red-600" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-8 mx-auto" />
                  ) : (
                    <p className={`text-2xl font-bold ${s.style}`}>{s.count}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search actions, actors, targets..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="analysis">Analysis</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">{filtered.length} of {allLogs.length} entries</p>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-72" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y">
                  {filtered.map((log) => {
                    const Icon = CATEGORY_ICONS[log.category] ?? ClipboardList;
                    return (
                      <div key={log.id} className="flex items-start gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${CATEGORY_COLORS[log.category]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium">{log.action}</span>
                            <Badge variant="outline" className={`text-xs ${SEVERITY_STYLES[log.severity]}`}>
                              {log.severity}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{log.ts}</span>
                            <span>·</span>
                            <span>Actor: <span className="font-medium text-foreground/80">{log.actor}</span></span>
                            {log.target !== "—" && (
                              <>
                                <span>·</span>
                                <span>Target: <span className="font-medium text-foreground/80">{log.target}</span></span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs flex-shrink-0 capitalize ${CATEGORY_COLORS[log.category]}`}>
                          {log.category}
                        </Badge>
                      </div>
                    );
                  })}
                  {filtered.length === 0 && !isLoading && (
                    <div className="py-16 text-center">
                      <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        {allLogs.length === 0
                          ? "No audit log entries yet. Actions like user management and settings changes will appear here."
                          : "No log entries match your filters."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminAuthGate>
  );
}
