import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings, Shield, Globe, CreditCard, Key, Image,
  AlertTriangle, CheckCircle2, Upload, BarChart3, Menu, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetAdminSettings,
  useUpdateAdminSettings,
  useUploadLogo,
  getGetAdminSettingsQueryKey,
} from "@workspace/api-client-react";

import { getAdminHeaders } from "@/components/layout/AdminLayout";

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function AdminNav({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const [location] = useLocation();
  return (
    <>
      {open !== undefined && open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        "flex-shrink-0 bg-card border-r flex flex-col",
        open !== undefined
          ? cn("fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 md:static md:translate-x-0", open ? "translate-x-0" : "-translate-x-full")
          : "w-64"
      )}>
        <div className="h-16 flex items-center px-6 border-b gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">Admin Panel</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="ml-auto md:hidden p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t">
          <Link href="/dashboard">
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
              ← Back to dashboard
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}

export default function AdminSettings() {
  const adminHeaders = getAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: settings, isLoading } = useGetAdminSettings({
    query: {
      queryKey: getGetAdminSettingsQueryKey(),
      retry: false,
    },
    request: { headers: adminHeaders },
  });

  const updateSettings = useUpdateAdminSettings({
    request: { headers: adminHeaders },
  });

  const uploadLogo = useUploadLogo({
    request: { headers: adminHeaders },
  });

  const [form, setForm] = useState({
    siteName: "",
    siteTagline: "",
    supportEmail: "",
    defaultCurrency: "USD",
    flutterwavePublicKey: "",
    flutterwaveSecretKey: "",
    semrushApiKey: "",
    googleAlertsApiKey: "",
    trustpilotApiKey: "",
    instagramAccessToken: "",
    linkedinClientId: "",
    linkedinClientSecret: "",
    maintenanceMode: false,
    allowSignups: true,
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        siteName: settings.siteName ?? "Skorvia",
        siteTagline: settings.siteTagline ?? "",
        supportEmail: settings.supportEmail ?? "",
        defaultCurrency: settings.defaultCurrency ?? "USD",
        flutterwavePublicKey: settings.flutterwavePublicKey ?? "",
        flutterwaveSecretKey: settings.flutterwaveSecretKey ?? "",
        semrushApiKey: (settings as unknown as Record<string, string | null>).semrushApiKey ?? "",
        googleAlertsApiKey: (settings as unknown as Record<string, string | null>).googleAlertsApiKey ?? "",
        trustpilotApiKey: settings.trustpilotApiKey ?? "",
        instagramAccessToken: (settings as unknown as Record<string, string | null>).instagramAccessToken ?? "",
        linkedinClientId: settings.linkedinClientId ?? "",
        linkedinClientSecret: settings.linkedinClientSecret ?? "",
        maintenanceMode: settings.maintenanceMode ?? false,
        allowSignups: settings.allowSignups ?? true,
      });
      setLogoPreview(settings.logoUrl ?? null);
    }
  }, [settings]);

  const handleSave = (section: Partial<typeof form>) => {
    updateSettings.mutate(
      { data: section },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
          toast({ title: "Settings saved", description: "Changes applied successfully." });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to save settings. Check your admin secret.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      const imageType = file.type;

      uploadLogo.mutate(
        { data: { imageData: base64, imageType } },
        {
          onSuccess: (resp) => {
            setLogoPreview(resp.logoUrl);
            queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
            toast({ title: "Logo uploaded", description: "Your site logo has been updated." });
          },
          onError: () => {
            toast({
              title: "Upload failed",
              description: "Could not upload logo.",
              variant: "destructive",
            });
          },
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const MobileHeader = () => (
    <div className="md:hidden flex items-center h-14 border-b bg-card px-4 gap-3 flex-shrink-0">
      <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-muted-foreground hover:text-foreground">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="font-bold text-base">Admin Settings</span>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-muted/20">
        <div className="hidden md:block"><AdminNav /></div>
        <AdminNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto min-w-0">
          <MobileHeader />
          <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-8 w-40" />
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div className="hidden md:block"><AdminNav /></div>
      <AdminNav open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto min-w-0">
        <MobileHeader />
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Platform Settings</h1>
            <p className="text-muted-foreground mt-1 text-sm">Configure your Skorvia platform</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Site Identity
              </CardTitle>
              <CardDescription>Basic branding and display settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Site Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex items-center justify-center overflow-hidden bg-muted/40">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Site logo" className="w-full h-full object-contain" />
                    ) : (
                      <Image className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadLogo.isPending ? "Uploading..." : "Upload Logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG up to 2MB</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    data-testid="input-logo-file"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={form.siteName}
                    onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                    placeholder="Skorvia"
                    data-testid="input-site-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="siteTagline">Tagline</Label>
                  <Input
                    id="siteTagline"
                    value={form.siteTagline}
                    onChange={(e) => setForm({ ...form, siteTagline: e.target.value })}
                    placeholder="Know exactly when you're ready to scale"
                    data-testid="input-site-tagline"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={form.supportEmail}
                    onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                    placeholder="support@skorvia.io"
                    data-testid="input-support-email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Input
                    id="defaultCurrency"
                    value={form.defaultCurrency}
                    onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
                    placeholder="USD"
                    data-testid="input-default-currency"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() =>
                    handleSave({
                      siteName: form.siteName,
                      siteTagline: form.siteTagline,
                      supportEmail: form.supportEmail,
                      defaultCurrency: form.defaultCurrency,
                    })
                  }
                  disabled={updateSettings.isPending}
                  data-testid="button-save-site"
                >
                  Save Site Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Flutterwave Payment Integration
              </CardTitle>
              <CardDescription>
                Configure payment processing. Get keys from{" "}
                <a
                  href="https://dashboard.flutterwave.com"
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-primary"
                >
                  dashboard.flutterwave.com
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="flutterwavePublicKey">Public Key</Label>
                <Input
                  id="flutterwavePublicKey"
                  value={form.flutterwavePublicKey}
                  onChange={(e) => setForm({ ...form, flutterwavePublicKey: e.target.value })}
                  placeholder="FLWPUBK_TEST-..."
                  data-testid="input-flutterwave-public"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="flutterwaveSecretKey">
                  Secret Key
                  {form.flutterwaveSecretKey === "••••••••" && (
                    <Badge variant="secondary" className="ml-2 text-xs">Saved</Badge>
                  )}
                </Label>
                <Input
                  id="flutterwaveSecretKey"
                  type="password"
                  value={form.flutterwaveSecretKey === "••••••••" ? "" : form.flutterwaveSecretKey}
                  onChange={(e) => setForm({ ...form, flutterwaveSecretKey: e.target.value })}
                  placeholder={
                    form.flutterwaveSecretKey === "••••••••"
                      ? "Key saved — enter new to replace"
                      : "FLWSECK_TEST-..."
                  }
                  data-testid="input-flutterwave-secret"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() =>
                    handleSave({
                      flutterwavePublicKey: form.flutterwavePublicKey,
                      ...(form.flutterwaveSecretKey && form.flutterwaveSecretKey !== "••••••••"
                        ? { flutterwaveSecretKey: form.flutterwaveSecretKey }
                        : {}),
                    })
                  }
                  disabled={updateSettings.isPending}
                  data-testid="button-save-flutterwave"
                >
                  Save Payment Keys
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Integrations
              </CardTitle>
              <CardDescription>Third-party services for deeper brand analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  id: "semrushApiKey",
                  label: "SEMrush API Key",
                  placeholder: "Enter SEMrush API key",
                  description: "For SEO & keyword analysis",
                  link: "https://www.semrush.com/api-documentation/",
                },
                {
                  id: "googleAlertsApiKey",
                  label: "Google Custom Search API Key",
                  placeholder: "Enter Google API key",
                  description: "For brand mention monitoring",
                  link: "https://console.cloud.google.com/",
                },
                {
                  id: "trustpilotApiKey",
                  label: "Trustpilot API Key",
                  placeholder: "Enter Trustpilot API key",
                  description: "For review data",
                  link: null,
                },
                {
                  id: "instagramAccessToken",
                  label: "Instagram Graph API Token",
                  placeholder: "Enter Instagram access token",
                  description: "For Instagram engagement analysis",
                  link: "https://developers.facebook.com/",
                },
                {
                  id: "linkedinClientId",
                  label: "LinkedIn Client ID",
                  placeholder: "Enter LinkedIn Client ID",
                  description: "For LinkedIn company page analysis",
                  link: "https://www.linkedin.com/developers/",
                },
                {
                  id: "linkedinClientSecret",
                  label: "LinkedIn Client Secret",
                  placeholder: "Enter LinkedIn Client Secret",
                  description: "",
                  link: null,
                },
              ].map((field) => (
                <div key={field.id} className="space-y-1.5">
                  <Label htmlFor={field.id}>
                    {field.label}
                    {(form as Record<string, unknown>)[field.id] === "••••••••" && (
                      <Badge variant="secondary" className="ml-2 text-xs gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Configured
                      </Badge>
                    )}
                  </Label>
                  {field.description && (
                    <p className="text-xs text-muted-foreground">
                      {field.description}{" "}
                      {field.link && (
                        <a href={field.link} target="_blank" rel="noreferrer" className="underline text-primary">
                          Get key
                        </a>
                      )}
                    </p>
                  )}
                  <Input
                    id={field.id}
                    type="password"
                    value={
                      (form as Record<string, unknown>)[field.id] === "••••••••"
                        ? ""
                        : ((form as Record<string, unknown>)[field.id] as string) ?? ""
                    }
                    onChange={(e) => setForm({ ...form, [field.id]: e.target.value })}
                    placeholder={
                      (form as Record<string, unknown>)[field.id] === "••••••••"
                        ? "Saved — enter new key to replace"
                        : field.placeholder
                    }
                    data-testid={`input-${field.id}`}
                  />
                </div>
              ))}

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => {
                    const apiData: Record<string, string> = {};
                    const apiFields = [
                      "semrushApiKey",
                      "googleAlertsApiKey",
                      "trustpilotApiKey",
                      "instagramAccessToken",
                      "linkedinClientId",
                      "linkedinClientSecret",
                    ];
                    for (const key of apiFields) {
                      const val = (form as unknown as Record<string, string>)[key];
                      if (val && val !== "••••••••") apiData[key] = val;
                    }
                    handleSave(apiData);
                  }}
                  disabled={updateSettings.isPending}
                  data-testid="button-save-apis"
                >
                  Save API Keys
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Platform Controls
              </CardTitle>
              <CardDescription>Control platform availability and access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Users will see a maintenance notice
                  </p>
                </div>
                <Switch
                  checked={form.maintenanceMode}
                  onCheckedChange={(v) => setForm({ ...form, maintenanceMode: v })}
                  data-testid="switch-maintenance-mode"
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Allow New Sign-ups</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    When off, new users cannot create profiles
                  </p>
                </div>
                <Switch
                  checked={form.allowSignups}
                  onCheckedChange={(v) => setForm({ ...form, allowSignups: v })}
                  data-testid="switch-allow-signups"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() =>
                    handleSave({
                      maintenanceMode: form.maintenanceMode,
                      allowSignups: form.allowSignups,
                    })
                  }
                  disabled={updateSettings.isPending}
                  data-testid="button-save-platform"
                >
                  Save Platform Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted bg-muted/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" />
                Set <code>ADMIN_SECRET</code> env var on the server to change the default admin secret.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
