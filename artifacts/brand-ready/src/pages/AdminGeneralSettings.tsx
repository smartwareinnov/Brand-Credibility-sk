import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield, Lock, Mail, Sliders, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import {
  useGetAdminSettings, useUpdateAdminSettings,
  getGetAdminSettingsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";

type Form = {
  maintenanceMode: boolean; allowSignups: boolean; emailVerificationRequired: boolean;
  freeTrialEnabled: boolean; referralProgramEnabled: boolean; waitlistMode: boolean;
  force2FA: boolean; sessionTimeout: string; ipWhitelist: string; recaptchaEnabled: boolean;
  recaptchaSiteKey: string; recaptchaSecretKey: string;
  smtpHost: string; smtpPort: string; smtpUser: string; smtpPass: string; smtpFrom: string;
  weightWebsite: number; weightSocial: number; weightContent: number;
  weightReviews: number; weightCompetitor: number; weightMessaging: number;
};

function ToggleRow({ label, desc, checked, onChange, danger }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void; danger?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${danger && checked ? "border-red-200 bg-red-50/50" : ""}`}>
      <div>
        <p className="font-medium text-sm flex items-center gap-2">
          {label}
          {danger && checked && <Badge variant="destructive" className="text-xs">Active</Badge>}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono font-bold text-primary">{value}%</span>
      </div>
      <input
        type="range" min={0} max={50} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

export default function AdminGeneralSettings() {
  const adminHeaders = getAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showSmtpPass, setShowSmtpPass] = useState(false);

  const { data: settings, isLoading } = useGetAdminSettings({
    query: { queryKey: getGetAdminSettingsQueryKey(), retry: false },
    request: { headers: adminHeaders },
  });

  const updateSettings = useUpdateAdminSettings({ request: { headers: adminHeaders } });

  const [form, setForm] = useState<Form>({
    maintenanceMode: false, allowSignups: true, emailVerificationRequired: true,
    freeTrialEnabled: true, referralProgramEnabled: true, waitlistMode: false,
    force2FA: false, sessionTimeout: "30", ipWhitelist: "", recaptchaEnabled: false,
    recaptchaSiteKey: "", recaptchaSecretKey: "",
    smtpHost: "", smtpPort: "587", smtpUser: "", smtpPass: "", smtpFrom: "",
    weightWebsite: 20, weightSocial: 20, weightContent: 17, weightReviews: 16, weightCompetitor: 14, weightMessaging: 13,
  });

  useEffect(() => {
    if (settings) {
      const s = settings as unknown as Record<string, unknown>;
      setForm({
        maintenanceMode: settings.maintenanceMode,
        allowSignups: settings.allowSignups,
        emailVerificationRequired: settings.emailVerificationRequired,
        freeTrialEnabled: settings.freeTrialEnabled,
        referralProgramEnabled: settings.referralProgramEnabled,
        waitlistMode: settings.waitlistMode,
        force2FA: settings.force2FA,
        sessionTimeout: String(s.sessionTimeout ?? "30"),
        ipWhitelist: s.ipWhitelist as string ?? "",
        recaptchaEnabled: settings.recaptchaEnabled,
        recaptchaSiteKey: s.recaptchaSiteKey as string ?? "",
        recaptchaSecretKey: s.recaptchaSecretKey as string ?? "",
        smtpHost: s.smtpHost as string ?? "",
        smtpPort: String(s.smtpPort ?? "587"),
        smtpUser: s.smtpUser as string ?? "",
        smtpPass: s.smtpPass as string ?? "",
        smtpFrom: s.smtpFrom as string ?? "",
        weightWebsite: Number(s.weightWebsite ?? 20),
        weightSocial: Number(s.weightSocial ?? 20),
        weightContent: Number(s.weightContent ?? 17),
        weightReviews: Number(s.weightReviews ?? 16),
        weightCompetitor: Number(s.weightCompetitor ?? 14),
        weightMessaging: Number(s.weightMessaging ?? 13),
      });
    }
  }, [settings]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));

  const totalWeight = form.weightWebsite + form.weightSocial + form.weightContent +
    form.weightReviews + form.weightCompetitor + form.weightMessaging;

  const save = (data: Partial<Record<string, unknown>>) => {
    updateSettings.mutate(
      { data: data as Parameters<typeof updateSettings.mutate>[0]["data"] },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["app-config"] });
          toast({ title: "Saved", description: "Settings updated successfully." });
        },
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <AdminAuthGate>
        <AdminLayout title="General Settings">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-muted/40 animate-pulse rounded-lg" />)}
          </div>
        </AdminLayout>
      </AdminAuthGate>
    );
  }

  return (
    <AdminAuthGate>
      <AdminLayout title="General Settings" subtitle="Platform controls, security, and configuration">
        <div className="space-y-6 max-w-3xl">

          {/* Platform Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="h-4 w-4" /> Platform Controls
              </CardTitle>
              <CardDescription>Toggle platform features and availability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.maintenanceMode && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-xs text-red-700">
                    Maintenance mode is ON. Users see a maintenance notice when they visit.
                  </AlertDescription>
                </Alert>
              )}
              <ToggleRow label="Maintenance Mode" desc="Shows a maintenance notice to all users" checked={form.maintenanceMode} onChange={(v) => set("maintenanceMode", v)} danger />
              <ToggleRow label="Allow New Sign-ups" desc="When off, new registrations are blocked" checked={form.allowSignups} onChange={(v) => set("allowSignups", v)} />
              <ToggleRow label="Email Verification Required" desc="Users must confirm email before accessing the platform" checked={form.emailVerificationRequired} onChange={(v) => set("emailVerificationRequired", v)} />
              <ToggleRow label="Free Trial Enabled" desc="New users get a free trial on sign-up" checked={form.freeTrialEnabled} onChange={(v) => set("freeTrialEnabled", v)} />
              <ToggleRow label="Referral Program" desc="Users can earn credits by referring others" checked={form.referralProgramEnabled} onChange={(v) => set("referralProgramEnabled", v)} />
              <ToggleRow label="Waitlist Mode" desc="Show a waitlist form instead of direct sign-up" checked={form.waitlistMode} onChange={(v) => set("waitlistMode", v)} />
              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={() => save({
                  maintenanceMode: form.maintenanceMode, allowSignups: form.allowSignups,
                  emailVerificationRequired: form.emailVerificationRequired,
                  freeTrialEnabled: form.freeTrialEnabled, referralProgramEnabled: form.referralProgramEnabled,
                  waitlistMode: form.waitlistMode,
                })} disabled={updateSettings.isPending}>Save Platform Settings</Button>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" /> Security
              </CardTitle>
              <CardDescription>Authentication and access control settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <ToggleRow label="Force Two-Factor Authentication" desc="Require 2FA for all users on login" checked={form.force2FA} onChange={(v) => set("force2FA", v)} />
                <ToggleRow label="reCAPTCHA on Sign-up" desc="Add Google reCAPTCHA to the registration form" checked={form.recaptchaEnabled} onChange={(v) => set("recaptchaEnabled", v)} />
              </div>
              {form.recaptchaEnabled && (
                <div className="space-y-3 pl-1">
                  <div className="space-y-1.5">
                    <Label>reCAPTCHA Site Key <span className="text-muted-foreground font-normal">(public)</span></Label>
                    <Input
                      value={form.recaptchaSiteKey}
                      onChange={(e) => set("recaptchaSiteKey", e.target.value)}
                      placeholder="6Le..."
                    />
                    <p className="text-xs text-muted-foreground">Used in the frontend. Get from <a href="https://www.google.com/recaptcha/admin" target="_blank" rel="noreferrer" className="underline text-primary">Google reCAPTCHA console</a>.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>reCAPTCHA Secret Key <span className="text-muted-foreground font-normal">(server-side)</span></Label>
                    <Input
                      type="password"
                      value={form.recaptchaSecretKey === "••••••••" ? "" : form.recaptchaSecretKey}
                      onChange={(e) => set("recaptchaSecretKey", e.target.value)}
                      placeholder={form.recaptchaSecretKey === "••••••••" ? "Saved — enter new to replace" : "Enter secret key"}
                    />
                  </div>
                </div>
              )}
              <Separator />
              <div className="space-y-1.5">
                <Label>Session Timeout (minutes)</Label>
                <Input
                  type="number" value={form.sessionTimeout}
                  onChange={(e) => set("sessionTimeout", e.target.value)}
                  placeholder="30" className="w-32"
                />
                <p className="text-xs text-muted-foreground">Users are logged out after this period of inactivity</p>
              </div>
              <div className="space-y-1.5">
                <Label>IP Whitelist <span className="text-muted-foreground font-normal">(admin panel only)</span></Label>
                <Input
                  value={form.ipWhitelist}
                  onChange={(e) => set("ipWhitelist", e.target.value)}
                  placeholder="192.168.1.1, 10.0.0.0/24"
                />
                <p className="text-xs text-muted-foreground">Comma-separated IPs or CIDR ranges. Leave empty to allow all.</p>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => {
                  const data: Record<string, unknown> = {
                    force2FA: form.force2FA, recaptchaEnabled: form.recaptchaEnabled,
                    sessionTimeout: Number(form.sessionTimeout), ipWhitelist: form.ipWhitelist,
                    recaptchaSiteKey: form.recaptchaSiteKey,
                  };
                  if (form.recaptchaSecretKey && form.recaptchaSecretKey !== "••••••••") {
                    data.recaptchaSecretKey = form.recaptchaSecretKey;
                  }
                  save(data);
                }} disabled={updateSettings.isPending}>Save Security</Button>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Weights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="h-4 w-4" /> Analysis Dimension Weights
              </CardTitle>
              <CardDescription>Adjust how each dimension contributes to the overall ABA score</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`text-right text-sm font-mono font-bold ${totalWeight === 100 ? "text-green-600" : "text-red-500"}`}>
                Total: {totalWeight}% {totalWeight !== 100 && "(should be 100%)"}
              </div>
              <div className="space-y-4">
                <WeightSlider label="Website Experience" value={form.weightWebsite} onChange={(v) => set("weightWebsite", v)} />
                <WeightSlider label="Social Media" value={form.weightSocial} onChange={(v) => set("weightSocial", v)} />
                <WeightSlider label="Content Quality" value={form.weightContent} onChange={(v) => set("weightContent", v)} />
                <WeightSlider label="Reviews & Trust" value={form.weightReviews} onChange={(v) => set("weightReviews", v)} />
                <WeightSlider label="Competitor Position" value={form.weightCompetitor} onChange={(v) => set("weightCompetitor", v)} />
                <WeightSlider label="Messaging Clarity" value={form.weightMessaging} onChange={(v) => set("weightMessaging", v)} />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">Changes apply to new analyses only</p>
                <Button size="sm" onClick={() => save({
                  weightWebsite: form.weightWebsite, weightSocial: form.weightSocial,
                  weightContent: form.weightContent, weightReviews: form.weightReviews,
                  weightCompetitor: form.weightCompetitor, weightMessaging: form.weightMessaging,
                })} disabled={updateSettings.isPending || totalWeight !== 100}>Save Weights</Button>
              </div>
            </CardContent>
          </Card>

          {/* SMTP */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" /> SMTP / Email Configuration
              </CardTitle>
              <CardDescription>Configure the email server for transactional emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SMTP Host</Label>
                  <Input value={form.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input type="number" value={form.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} placeholder="587" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SMTP Username</Label>
                  <Input value={form.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} placeholder="noreply@skorvia.io" />
                </div>
                <div className="space-y-1.5">
                  <Label>SMTP Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSmtpPass ? "text" : "password"}
                      value={form.smtpPass === "••••••••" ? "" : form.smtpPass}
                      onChange={(e) => set("smtpPass", e.target.value)}
                      placeholder={form.smtpPass === "••••••••" ? "Saved — enter new" : "SMTP password"}
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowSmtpPass(!showSmtpPass)}>
                      {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>From Email</Label>
                <Input value={form.smtpFrom} onChange={(e) => set("smtpFrom", e.target.value)} placeholder="Skorvia <noreply@skorvia.io>" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => {
                  const data: Record<string, unknown> = {
                    smtpHost: form.smtpHost, smtpPort: Number(form.smtpPort),
                    smtpUser: form.smtpUser, smtpFrom: form.smtpFrom,
                  };
                  if (form.smtpPass && form.smtpPass !== "••••••••") data.smtpPass = form.smtpPass;
                  save(data);
                }} disabled={updateSettings.isPending}>Save SMTP</Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    </AdminAuthGate>
  );
}
