import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, Mail, Send, Users, CheckCircle2, AlertCircle,
  Radio, UserCheck, UserX, CreditCard, MessageSquare,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useListAdminUsers } from "@workspace/api-client-react";

const API_BASE = (() => {
  try {
    return import.meta.env.BASE_URL.replace(/\/$/, "");
  } catch {
    return "";
  }
})();

type Channel = "in_app" | "email" | "both";
type Target = "all" | "active" | "inactive" | "subscribed" | "unsubscribed" | "selected";

const targetOptions: { value: Target; label: string; icon: React.ElementType; description: string }[] = [
  { value: "all", label: "All Users", icon: Users, description: "Send to every registered user" },
  { value: "active", label: "Active Users", icon: UserCheck, description: "Users with active status" },
  { value: "inactive", label: "Inactive Users", icon: UserX, description: "Users with disabled status" },
  { value: "subscribed", label: "Subscribed Users", icon: CreditCard, description: "Users with an active subscription" },
  { value: "unsubscribed", label: "Unsubscribed Users", icon: CreditCard, description: "Users without an active subscription" },
  { value: "selected", label: "Selected Users", icon: MessageSquare, description: "Pick specific users manually" },
];

const channelOptions: { value: Channel; label: string; icon: React.ElementType }[] = [
  { value: "in_app", label: "In-App Only", icon: Bell },
  { value: "email", label: "Email Only", icon: Mail },
  { value: "both", label: "Both (In-App + Email)", icon: Send },
];

interface BroadcastResult {
  success: boolean;
  inAppSent: number;
  emailSent: number;
  emailFailed: number;
  totalTargeted: number;
}

function AdminNotificationsContent() {
  const { toast } = useToast();
  const adminHeaders = getAdminHeaders();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<Channel>("in_app");
  const [target, setTarget] = useState<Target>("all");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null);
  const [lastChannel, setLastChannel] = useState<Channel>("in_app");
  const [userSearch, setUserSearch] = useState("");

  const { data: users = [], isLoading: usersLoading } = useListAdminUsers({
    query: { queryKey: ["admin-users-list"], retry: false },
    request: { headers: adminHeaders },
  });

  const filteredUsers = users.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.company?.toLowerCase().includes(q)
    );
  });

  const toggleUser = (sessionId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId]
    );
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Title and message are required.", variant: "destructive" });
      return;
    }
    if (target === "selected" && selectedUserIds.length === 0) {
      toast({ title: "No users selected", description: "Select at least one user.", variant: "destructive" });
      return;
    }

    setSending(true);
    setLastResult(null);
    const sentChannel = channel;

    try {
      const res = await fetch(`${API_BASE}/api/admin/notifications/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), channel, target, userIds: selectedUserIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "Failed to send broadcast.", variant: "destructive" });
        return;
      }

      setLastResult(data as BroadcastResult);
      setLastChannel(sentChannel);
      toast({
        title: "Broadcast sent",
        description: `${data.totalTargeted} user${data.totalTargeted !== 1 ? "s" : ""} targeted.`,
      });
      setTitle("");
      setMessage("");
      setSelectedUserIds([]);
    } catch {
      toast({ title: "Error", description: "Connection error. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Notifications" subtitle="Send in-app notifications or emails to your users">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Compose form */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Compose Broadcast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="notif-title">Title / Subject</Label>
                <Input
                  id="notif-title"
                  placeholder="e.g. Important update for your account"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                />
                <p className="text-xs text-muted-foreground text-right">{title.length}/120</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notif-message">Message</Label>
                <Textarea
                  id="notif-message"
                  placeholder="Write your message here…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
              </div>

              <div className="space-y-1.5">
                <Label>Delivery Channel</Label>
                <div className="grid grid-cols-3 gap-2">
                  {channelOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setChannel(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm font-medium transition-colors",
                          channel === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs leading-tight text-center">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target audience */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {targetOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setTarget(opt.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors",
                        target === opt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5", target === opt.value ? "text-primary" : "text-muted-foreground")} />
                        <span className={cn("text-xs font-semibold", target === opt.value ? "text-primary" : "text-foreground")}>
                          {opt.label}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground leading-tight">{opt.description}</span>
                    </button>
                  );
                })}
              </div>

              {/* User picker for selected target */}
              {target === "selected" && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Select Users</Label>
                    {selectedUserIds.length > 0 && (
                      <Badge variant="secondary">{selectedUserIds.length} selected</Badge>
                    )}
                  </div>
                  <Input
                    placeholder="Search by name, email, or company…"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-9"
                  />
                  <div className="max-h-52 overflow-y-auto border rounded-lg divide-y">
                    {usersLoading ? (
                      <div className="p-3 space-y-2">
                        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">No users found</p>
                    ) : (
                      filteredUsers.map((u) => {
                        const selected = selectedUserIds.includes(u.sessionId);
                        return (
                          <button
                            key={u.sessionId}
                            onClick={() => toggleUser(u.sessionId)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors",
                              selected && "bg-primary/5"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center",
                              selected ? "bg-primary border-primary" : "border-border"
                            )}>
                              {selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.fullName ?? "Unnamed"}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email ?? "No email"}</p>
                            </div>
                            {u.hasActiveSubscription && (
                              <Badge variant="outline" className="text-xs flex-shrink-0">Pro</Badge>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Send button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim()}
          >
            {sending ? (
              <>Sending…</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>

          {/* Last send result */}
          {lastResult && (
            <Card className={cn("border", lastResult.success ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900" : "border-destructive/20 bg-destructive/5")}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Broadcast Sent Successfully</p>
                    <div className="mt-1 space-y-0.5 text-xs text-green-700 dark:text-green-400">
                      <p>Total targeted: <strong>{lastResult.totalTargeted}</strong></p>
                      {(lastChannel === "in_app" || lastChannel === "both") && (
                        <p>In-app sent: <strong>{lastResult.inAppSent}</strong></p>
                      )}
                      {(lastChannel === "email" || lastChannel === "both") && (
                        <>
                          <p>Email sent: <strong>{lastResult.emailSent}</strong></p>
                          {lastResult.emailFailed > 0 && (
                            <p className="text-orange-600 dark:text-orange-400">Email failed: <strong>{lastResult.emailFailed}</strong></p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tips panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">Delivery Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <Bell className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                <p><strong className="text-foreground">In-app</strong> messages appear instantly in the user's Messages page with a badge on the bell icon.</p>
              </div>
              <div className="flex gap-2">
                <Mail className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" />
                <p><strong className="text-foreground">Email</strong> requires Resend API to be configured in General Settings. Only users with verified emails will receive it.</p>
              </div>
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-500 mt-0.5" />
                <p>Keep titles short and clear. Messages should be concise and actionable.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">Notification Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Admin Message", desc: "Manual broadcast from admin" },
                { label: "Brand Mention", desc: "New mention detected" },
                { label: "Task Completed", desc: "User completed a task" },
                { label: "Task Expiring", desc: "Task deadline approaching" },
                { label: "Subscription Renewal", desc: "Subscription renewed" },
                { label: "Subscription Expiring", desc: "Subscription about to expire" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium">{t.label}</span>
                    <span className="text-xs text-muted-foreground"> — {t.desc}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminNotifications() {
  return (
    <AdminAuthGate>
      <AdminNotificationsContent />
    </AdminAuthGate>
  );
}
