import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApi } from "@/lib/useApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Globe, Camera, Shield, Lock, Bell, Download, Trash2, Eye, EyeOff, KeyRound, Smartphone, CheckCircle2, QrCode, AlertTriangle } from "lucide-react";
import { useGetUserProfile, getGetUserProfileQueryKey, useGetUserSubscription, getGetUserSubscriptionQueryKey } from "@workspace/api-client-react";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  phone: z.string().optional(),
  country: z.string().optional(),
  bio: z.string().max(200, "Bio must be under 200 characters").optional(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type PasswordForm = z.infer<typeof passwordSchema>;

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria",
  "Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia",
  "Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt",
  "El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon",
  "Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi",
  "Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova",
  "Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau",
  "Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia",
  "Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan",
  "Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo",
  "Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates",
  "United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen","Zambia","Zimbabwe",
];


const NOTIFICATIONS = [
  { key: "_brand", label: "Brand Monitoring", desc: "", group: "Brand Monitoring" },
  { key: "brandMentionAlerts", label: "Brand mention alerts", desc: "Email me whenever your brand is mentioned online" },
  { key: "negativeMentionAlerts", label: "Negative mention priority alert", desc: "Immediate alert for negative or critical brand mentions" },
  { key: "_scans", label: "Analysis & Scans", desc: "", group: "Analysis & Scans" },
  { key: "scanCompleted", label: "Scan completed", desc: "Email notification when a brand analysis finishes" },
  { key: "emailReports", label: "Email analysis reports", desc: "Receive a full report PDF after each scan" },
  { key: "_tasks", label: "Tasks & Action Plan", desc: "", group: "Tasks & Action Plan" },
  { key: "taskReminders", label: "Daily task reminders", desc: "Morning nudge with your tasks for the day" },
  { key: "taskCompleted", label: "Task completed confirmation", desc: "Confirmation email when you mark a task as done" },
  { key: "overdueTaskAlert", label: "Overdue task alerts", desc: "Alert when tasks from previous days remain incomplete" },
  { key: "_account", label: "Account & Competitors", desc: "", group: "Account & Competitors" },
  { key: "weeklyDigest", label: "Weekly brand digest", desc: "Your brand score progress summary every Monday" },
  { key: "competitorAlerts", label: "Competitor score changes", desc: "Notify when a tracked competitor's estimated score changes", requiresPaid: true },
  { key: "adsIntelligenceAlerts", label: "Ads intelligence alerts", desc: "Get notified about competitor ad activity and new ad insights", requiresPaid: true },
  { key: "marketingEmails", label: "Product updates & tips", desc: "Feature announcements, tips, and Skorvia news" },
  { key: "securityNotifs", label: "Security notifications", desc: "Login alerts and unusual account activity" },
] as Array<{ key: string; label: string; desc: string; group?: string; requiresPaid?: boolean }>;

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm",
        checked ? "translate-x-4" : "translate-x-0.5"
      )} />
    </button>
  );
}

export default function Profile() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { apiFetch } = useApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "enabled">("idle");
  const [twoFAQR, setTwoFAQR] = useState<string | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);

  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    emailReports: true, weeklyDigest: true, taskReminders: true,
    competitorAlerts: false, marketingEmails: false, securityNotifs: true,
    brandMentionAlerts: true, negativeMentionAlerts: false, scanCompleted: true,
    taskCompleted: false, overdueTaskAlert: true,
  });
  const [notifsDirty, setNotifsDirty] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: profile, isLoading } = useGetUserProfile(
    { sessionId },
    { query: { queryKey: getGetUserProfileQueryKey({ sessionId }), enabled: !!sessionId } }
  );

  const profileEmail = (profile as any)?.email ?? "";
  const { data: subData } = useGetUserSubscription(
    { email: profileEmail },
    { query: { queryKey: getGetUserSubscriptionQueryKey({ email: profileEmail }), enabled: !!profileEmail } }
  );
  const subRaw = (subData as any)?.data ?? subData;
  const hasActiveSub = subRaw?.hasActiveSubscription === true;

  const [profileSaving, setProfileSaving] = useState(false);

  const { data: usage } = useQuery<any>({
    queryKey: ["user-usage", sessionId],
    queryFn: () => apiFetch<any>("/user/usage"),
    enabled: !!sessionId,
    staleTime: 60_000,
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", country: "", bio: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (profile) {
      const parts = ((profile as any).fullName ?? "").split(" ");
      form.reset({
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") ?? "",
        email: (profile as any).email ?? "",
        phone: (profile as any).phone ?? "",
        country: (profile as any).country ?? "",
        bio: (profile as any).bio ?? "",
      });
      if ((profile as any).avatarUrl) setAvatarPreview((profile as any).avatarUrl);
      if ((profile as any).twoFactorEnabled) setTwoFAStep("enabled");
      if ((profile as any).notificationPrefs) {
        try {
          const parsed = JSON.parse((profile as any).notificationPrefs);
          setNotifications((prev) => ({ ...prev, ...parsed }));
        } catch {}
      }
    }
  }, [profile]);

  const onSubmit = async (data: ProfileForm) => {
    setProfileSaving(true);
    try {
      const fullName = [data.firstName, data.lastName].filter(Boolean).join(" ");
      await apiFetch("/user/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: fullName || null,
          email: data.email || null,
          phone: data.phone || null,
          country: data.country || null,
          bio: data.bio || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey({ sessionId }) });
      toast({ title: "Profile updated", description: "Your profile has been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save profile.", variant: "destructive" });
    } finally {
      setProfileSaving(false);
    }
  };

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      apiFetch("/user/profile/change-password", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      passwordForm.reset();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message || "Failed to change password.", variant: "destructive" }),
  });

  const onPasswordSubmit = (data: PasswordForm) => {
    changePasswordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 2MB.", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setAvatarPreview(dataUrl);
      try {
        await apiFetch("/user/profile/avatar", { method: "POST", body: JSON.stringify({ avatarUrl: dataUrl }) });
        queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey({ sessionId }) });
        toast({ title: "Photo updated", description: "Your profile picture has been saved." });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message || "Please try a smaller image.", variant: "destructive" });
      } finally {
        setAvatarUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handle2FASetup = async () => {
    setTwoFALoading(true);
    try {
      const data = await apiFetch<{ qrCode: string }>("/user/profile/2fa/setup", { method: "POST" });
      setTwoFAQR(data.qrCode);
      setTwoFAStep("setup");
      setTwoFACode("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to initialize 2FA.", variant: "destructive" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FAVerify = async () => {
    if (twoFACode.length !== 6) {
      toast({ title: "Invalid code", description: "Please enter the 6-digit code from your authenticator app.", variant: "destructive" });
      return;
    }
    setTwoFALoading(true);
    try {
      await apiFetch("/user/profile/2fa/enable", { method: "POST", body: JSON.stringify({ code: twoFACode }) });
      setTwoFAStep("enabled");
      setTwoFAQR(null);
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey({ sessionId }) });
      toast({ title: "2FA enabled", description: "Your account is now secured with two-factor authentication." });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message || "Incorrect code. Please try again.", variant: "destructive" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handle2FADisable = async () => {
    setTwoFALoading(true);
    try {
      await apiFetch("/user/profile/2fa", { method: "DELETE" });
      setTwoFAStep("idle");
      setTwoFAQR(null);
      queryClient.invalidateQueries({ queryKey: getGetUserProfileQueryKey({ sessionId }) });
      toast({ title: "2FA disabled", description: "Two-factor authentication has been turned off." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to disable 2FA.", variant: "destructive" });
    } finally {
      setTwoFALoading(false);
    }
  };

  const saveNotifsMutation = useMutation({
    mutationFn: (prefs: Record<string, boolean>) =>
      apiFetch("/user/profile/notifications", { method: "PATCH", body: JSON.stringify({ notificationPrefs: prefs }) }),
    onSuccess: () => {
      setNotifsDirty(false);
      toast({ title: "Notifications saved", description: "Your alert preferences have been updated." });
    },
    onError: () => toast({ title: "Error", description: "Failed to save notification settings.", variant: "destructive" }),
  });

  const handleToggleNotif = (key: string) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    setNotifsDirty(true);
  };

  const handleExportData = () => {
    const data = { profile, sessionId, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "skorvia-data.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported", description: "Your data has been downloaded." });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      await apiFetch(`/admin/users/${sessionId}`, { method: "DELETE" });
    } catch {
      // Best-effort — even if the API call fails, clear local state
    }
    localStorage.clear();
    window.location.href = "/";
  };

  const initials = (profile as any)?.avatarInitials ?? ((profile as any)?.fullName ? (profile as any).fullName.slice(0, 2).toUpperCase() : "BR");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your account, security, and preferences</p>
        </div>

        {/* Avatar + Name Header */}
        <div className="flex items-center gap-5">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold overflow-hidden ring-4 ring-background shadow-md">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
          <div>
            {isLoading ? (
              <><Skeleton className="h-5 w-32 mb-1" /><Skeleton className="h-4 w-48" /></>
            ) : (
              <>
                <p className="font-semibold text-lg">{(profile as any)?.fullName ?? "Your Name"}</p>
                <p className="text-sm text-muted-foreground">{(profile as any)?.email ?? "No email set"}</p>
              </>
            )}
            <button type="button" onClick={handleAvatarClick} className="text-xs text-primary hover:underline mt-1 flex items-center gap-1">
              <Camera className="h-3 w-3" /> {avatarUploading ? "Uploading..." : "Upload photo"}
            </button>
          </div>
        </div>

        {/* Usage This Month */}
        {usage && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Monthly Usage
              </CardTitle>
              <CardDescription>How much you've used this month ({usage.month}) — Plan: <span className="font-semibold capitalize">{usage.planId}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Brand Analyses", used: usage.usage.brandAnalysis, limit: usage.limits.brandAnalysis },
                  { label: "Competitor Analysis", used: usage.usage.competitorAnalysis, limit: usage.limits.competitorAnalysis },
                  { label: "Ads Intelligence", used: usage.usage.adsIntelligence, limit: usage.limits.adsIntelligence },
                ].map(({ label, used, limit }) => {
                  const pct = limit === 999 ? 0 : Math.min((used / limit) * 100, 100);
                  const unlimited = limit === 999;
                  return (
                    <div key={label} className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <p className="text-lg font-extrabold tabular-nums">
                        {used}<span className="text-xs font-normal text-muted-foreground"> / {unlimited ? "∞" : limit}</span>
                      </p>
                      {!unlimited && limit > 0 && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      {!unlimited && limit === 0 && <p className="text-[10px] text-muted-foreground">Not on your plan</p>}
                      {unlimited && <p className="text-[10px] text-green-600 font-medium">Unlimited</p>}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Personal Information</CardTitle>
            <CardDescription>Update your name, email, and contact details</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="firstName" render={({ field }) => (
                      <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} placeholder="Jane" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="lastName" render={({ field }) => (
                      <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} placeholder="Doe" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email Address</FormLabel><FormControl>
                      <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type="email" placeholder="jane@company.com" className="pl-9" />
                      </div>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl>
                      <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="+1 234 567 8900" className="pl-9" />
                      </div>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="country" render={({ field }) => (
                    <FormItem><FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <Globe className="h-4 w-4 text-muted-foreground mr-2" />
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-64">
                          {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="bio" render={({ field }) => (
                    <FormItem><FormLabel>Bio</FormLabel><FormControl>
                      <Textarea {...field} placeholder="Tell us a bit about yourself and your brand..." rows={3} maxLength={200} />
                    </FormControl>
                      <div className="flex justify-between mt-1"><FormMessage /><span className="text-[11px] text-muted-foreground">{(field.value ?? "").length}/200</span></div>
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-1">
                    <Button type="submit" disabled={profileSaving}>
                      {profileSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Security</CardTitle>
            <CardDescription>Manage your password and two-factor authentication</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Change Password */}
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5 mb-3"><KeyRound className="h-3.5 w-3.5" /> Change Password</p>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-3">
                  <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                    <FormItem><FormLabel>Current Password</FormLabel><FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type={showCurrent ? "text" : "password"} placeholder="Current password" className="pl-9 pr-9" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowCurrent(!showCurrent)}>
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem><FormLabel>New Password</FormLabel><FormControl>
                        <div className="relative">
                          <Input {...field} type={showNew ? "text" : "password"} placeholder="Min. 8 chars" className="pr-9" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowNew(!showNew)}>
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel>Confirm Password</FormLabel><FormControl>
                        <div className="relative">
                          <Input {...field} type={showConfirm ? "text" : "password"} placeholder="Repeat password" className="pr-9" />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm(!showConfirm)}>
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <Button type="submit" size="sm" variant="outline" disabled={changePasswordMutation.isPending}>
                    {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </Form>
            </div>

            <Separator />

            {/* 2FA */}
            <div>
              <div className="flex items-start gap-3 mb-3">
                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">Two-Factor Authentication</p>
                    {twoFAStep === "enabled" && <Badge className="text-[10px] bg-green-100 text-green-700 border-0">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Secure your account with an authenticator app (Google Authenticator, Authy, etc.)</p>
                </div>
                {twoFAStep === "idle" && (
                  <Button size="sm" variant="outline" onClick={handle2FASetup} disabled={twoFALoading}>
                    <QrCode className="h-3.5 w-3.5 mr-1.5" /> {twoFALoading ? "Loading..." : "Enable 2FA"}
                  </Button>
                )}
                {twoFAStep === "enabled" && (
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handle2FADisable} disabled={twoFALoading}>
                    {twoFALoading ? "Disabling..." : "Disable"}
                  </Button>
                )}
              </div>

              {twoFAStep === "setup" && twoFAQR && (
                <div className="border rounded-xl p-4 bg-muted/30 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <QrCode className="h-4 w-4 text-primary" /> Scan with your authenticator app
                  </div>
                  <div className="flex justify-center">
                    <img src={twoFAQR} alt="2FA QR Code" className="w-44 h-44 rounded-lg border" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Enter the 6-digit code shown in your authenticator app:</p>
                    <div className="flex gap-2">
                      <Input
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="text-center tracking-widest font-mono text-lg max-w-[140px]"
                        maxLength={6}
                      />
                      <Button onClick={handle2FAVerify} disabled={twoFALoading || twoFACode.length !== 6}>
                        {twoFALoading ? "Verifying..." : "Verify & Enable"}
                      </Button>
                      <Button variant="ghost" onClick={() => { setTwoFAStep("idle"); setTwoFAQR(null); }}>Cancel</Button>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Save your secret key or backup codes. Losing access to your authenticator app will lock you out.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notification Preferences</CardTitle>
            <CardDescription>Choose what emails you want to receive. Changes save automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0">
            {NOTIFICATIONS.map((n) => {
              if (n.group) {
                return <p key={n.key} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-5 pb-2 first:pt-0">{n.label}</p>;
              }
              const isLocked = n.requiresPaid && !hasActiveSub;
              return (
                <div key={n.key} className={`flex items-center justify-between py-3 border-b last:border-0 ${isLocked ? "opacity-60" : ""}`}>
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium">{n.label}</p>
                      {isLocked && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5">
                          <Lock className="h-2.5 w-2.5" /> Paid
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Toggle
                    checked={!isLocked && (notifications[n.key] ?? false)}
                    onToggle={() => {
                      if (isLocked) {
                        toast({ title: "Upgrade required", description: "This notification is only available on paid plans.", variant: "destructive" });
                        return;
                      }
                      handleToggleNotif(n.key);
                    }}
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-4">
              {notifsDirty && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Unsaved changes</p>}
              <div className="ml-auto">
                <Button size="sm" onClick={() => saveNotifsMutation.mutate(notifications)} disabled={saveNotifsMutation.isPending || !notifsDirty}>
                  {saveNotifsMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Danger Zone</CardTitle>
            <CardDescription>Irreversible account actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-4 border border-muted rounded-lg bg-muted/20">
              <div>
                <p className="text-sm font-semibold">Export Your Data</p>
                <p className="text-xs text-muted-foreground">Download all your Skorvia data as JSON</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 flex-shrink-0" onClick={handleExportData}>
                <Download className="h-3.5 w-3.5" /> Export
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div>
                <p className="text-sm font-semibold">Delete Account</p>
                <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
              </div>
              <Button variant="destructive" size="sm" className="flex-shrink-0 gap-1.5" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete your account and all associated data. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <p className="text-sm text-muted-foreground mb-2">Type <strong>DELETE</strong> to confirm:</p>
            <Input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="DELETE" className="border-destructive/50 focus-visible:ring-destructive" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteConfirmText !== "DELETE"} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
