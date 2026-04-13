import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2, Eye, EyeOff, Copy, Check, AlertTriangle,
  Search, Globe, Megaphone, Twitter, Linkedin, MapPin,
  Star, CreditCard, Bot, DollarSign, Info, Mail,
} from "lucide-react";
import {
  useGetAdminSettings, useUpdateAdminSettings,
  getGetAdminSettingsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";

type SettingsForm = Record<string, string | boolean | number | null>;

function ApiKeyField({
  id, label, description, value, placeholder, isSecret = true, link,
  onChange, isConfigured,
}: {
  id: string; label: string; description?: string; value: string; placeholder: string;
  isSecret?: boolean; link?: string; onChange: (v: string) => void; isConfigured?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === "••••••••") return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2">
        {label}
        {isConfigured && (
          <Badge variant="secondary" className="text-xs gap-1 h-4">
            <CheckCircle2 className="h-3 w-3 text-green-600" /> Configured
          </Badge>
        )}
      </Label>
      {description && (
        <p className="text-xs text-muted-foreground">
          {description}{" "}
          {link && <a href={link} target="_blank" rel="noreferrer" className="underline text-primary">Get key →</a>}
        </p>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          type={isSecret && !show ? "password" : "text"}
          value={value === "••••••••" ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={value === "••••••••" ? "Saved — enter new to replace" : placeholder}
          className="font-mono text-sm"
        />
        {isSecret && (
          <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => setShow(!show)}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        )}
        <Button
          variant="outline" size="icon" className="h-9 w-9 flex-shrink-0"
          onClick={handleCopy}
          disabled={!value || value === "••••••••"}
        >
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function SectionSaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button size="sm" onClick={onClick} disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

export default function AdminApiIntegrations() {
  const adminHeaders = getAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useGetAdminSettings({
    query: { queryKey: getGetAdminSettingsQueryKey(), retry: false },
    request: { headers: adminHeaders },
  });

  const updateSettings = useUpdateAdminSettings({ request: { headers: adminHeaders } });

  const [form, setForm] = useState<SettingsForm>({
    serpApiKey: "", keywordDataApiKey: "", domainMetricsApiKey: "", serpApiFallbackKey: "",
    metaAppId: "", metaAppSecret: "", metaWebhookToken: "", metaRedirectUri: "", metaAdsToken: "",
    xApiKey: "", xApiSecret: "", xBearerToken: "",
    linkedinClientId: "", linkedinClientSecret: "", linkedinOauthToken: "", linkedinRedirectUri: "",
    googleClientId: "", googleClientSecret: "",
    googleCustomSearchApiKey: "", googleSearchEngineId: "", googlePlacesApiKey: "",
    trustpilotApiKey: "",
    flutterwavePublicKey: "", flutterwaveSecretKey: "", flutterwaveEncryptionKey: "",
    flutterwaveWebhookSecret: "", flutterwaveLiveMode: false,
    resendApiKey: "",
    resendFromEmail: "",
    openaiApiKey: "",
    youtubeApiKey: "",
    fxProviderApiKey: "", fxRateNGN: "", fxRateGHS: "", fxRateKES: "",
    fxRateZAR: "", fxRateGBP: "", fxRateEUR: "",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        serpApiKey: (settings as unknown as Record<string, unknown>).serpApiKey as string ?? "",
        keywordDataApiKey: (settings as unknown as Record<string, unknown>).keywordDataApiKey as string ?? "",
        domainMetricsApiKey: (settings as unknown as Record<string, unknown>).domainMetricsApiKey as string ?? "",
        serpApiFallbackKey: (settings as unknown as Record<string, unknown>).serpApiFallbackKey as string ?? "",
        metaAppId: (settings as unknown as Record<string, unknown>).metaAppId as string ?? "",
        metaAppSecret: (settings as unknown as Record<string, unknown>).metaAppSecret as string ?? "",
        metaWebhookToken: (settings as unknown as Record<string, unknown>).metaWebhookToken as string ?? "",
        metaRedirectUri: (settings as unknown as Record<string, unknown>).metaRedirectUri as string ?? "",
        metaAdsToken: (settings as unknown as Record<string, unknown>).metaAdsToken as string ?? "",
        xApiKey: (settings as unknown as Record<string, unknown>).xApiKey as string ?? "",
        xApiSecret: (settings as unknown as Record<string, unknown>).xApiSecret as string ?? "",
        xBearerToken: (settings as unknown as Record<string, unknown>).xBearerToken as string ?? "",
        linkedinClientId: settings.linkedinClientId ?? "",
        linkedinClientSecret: settings.linkedinClientSecret ?? "",
        linkedinOauthToken: (settings as unknown as Record<string, unknown>).linkedinOauthToken as string ?? "",
        linkedinRedirectUri: (settings as unknown as Record<string, unknown>).linkedinRedirectUri as string ?? "",
        googleClientId: (settings as unknown as Record<string, unknown>).googleClientId as string ?? "",
        googleClientSecret: (settings as unknown as Record<string, unknown>).googleClientSecret as string ?? "",
        googleCustomSearchApiKey: (settings as unknown as Record<string, unknown>).googleCustomSearchApiKey as string ?? "",
        googleSearchEngineId: (settings as unknown as Record<string, unknown>).googleSearchEngineId as string ?? "",
        googlePlacesApiKey: (settings as unknown as Record<string, unknown>).googlePlacesApiKey as string ?? "",
        trustpilotApiKey: settings.trustpilotApiKey ?? "",
        flutterwavePublicKey: settings.flutterwavePublicKey ?? "",
        flutterwaveSecretKey: settings.flutterwaveSecretKey ?? "",
        flutterwaveEncryptionKey: (settings as unknown as Record<string, unknown>).flutterwaveEncryptionKey as string ?? "",
        flutterwaveWebhookSecret: (settings as unknown as Record<string, unknown>).flutterwaveWebhookSecret as string ?? "",
        flutterwaveLiveMode: (settings as unknown as Record<string, unknown>).flutterwaveLiveMode as boolean ?? false,
        resendApiKey: (settings as unknown as Record<string, unknown>).resendApiKey as string ?? "",
        resendFromEmail: (settings as unknown as Record<string, unknown>).resendFromEmail as string ?? "",
        openaiApiKey: (settings as unknown as Record<string, unknown>).openaiApiKey as string ?? "",
        youtubeApiKey: (settings as unknown as Record<string, unknown>).youtubeApiKey as string ?? "",
        fxProviderApiKey: (settings as unknown as Record<string, unknown>).fxProviderApiKey as string ?? "",
        fxRateNGN: (settings as unknown as Record<string, unknown>).fxRateNGN as string ?? "",
        fxRateGHS: (settings as unknown as Record<string, unknown>).fxRateGHS as string ?? "",
        fxRateKES: (settings as unknown as Record<string, unknown>).fxRateKES as string ?? "",
        fxRateZAR: (settings as unknown as Record<string, unknown>).fxRateZAR as string ?? "",
        fxRateGBP: (settings as unknown as Record<string, unknown>).fxRateGBP as string ?? "",
        fxRateEUR: (settings as unknown as Record<string, unknown>).fxRateEUR as string ?? "",
      });
    }
  }, [settings]);

  const set = (key: string, val: string | boolean | number | null) => setForm(f => ({ ...f, [key]: val }));

  const save = (keys: string[]) => {
    const data: Record<string, string | boolean | null> = {};
    for (const key of keys) {
      const v = form[key];
      if (typeof v === "boolean") {
        data[key] = v;
      } else if (typeof v === "string") {
        if (v === "••••••••") {
          // masked — don't send, keep existing value
        } else if (v === "") {
          data[key] = null; // explicitly clear the key
        } else {
          data[key] = v;
        }
      } else if (v === null) {
        data[key] = null;
      }
    }
    updateSettings.mutate(
      { data: data as Parameters<typeof updateSettings.mutate>[0]["data"] },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
          toast({ title: "Saved", description: "API settings updated." });
        },
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  };

  const isSaving = updateSettings.isPending;

  if (isLoading) {
    return (
      <AdminAuthGate>
        <AdminLayout title="API Integrations">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-48 bg-muted/40 animate-pulse rounded-lg" />)}
          </div>
        </AdminLayout>
      </AdminAuthGate>
    );
  }

  return (
    <AdminAuthGate>
      <AdminLayout title="API Integrations" subtitle="Configure all third-party services powering Skorvia">
        <div className="space-y-6 max-w-3xl">

          {/* SEO & SERP */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" /> SEO & SERP APIs
              </CardTitle>
              <CardDescription>
                Used to check brand rankings, keyword visibility, and domain authority signals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="serpApiKey" label="SERP API Key" isConfigured={form.serpApiKey === "••••••••"}
                description="Check if brand ranks for its own name. Used for brand SERP analysis."
                value={form.serpApiKey as string} placeholder="Enter SERP API key"
                link="https://serpapi.com/" onChange={(v) => set("serpApiKey", v)}
              />
              <ApiKeyField
                id="keywordDataApiKey" label="Keyword Data API Key" isConfigured={form.keywordDataApiKey === "••••••••"}
                description="Keyword visibility and search volume data."
                value={form.keywordDataApiKey as string} placeholder="Enter Keyword Data API key"
                link="https://keywordseverywhere.com/" onChange={(v) => set("keywordDataApiKey", v)}
              />
              <ApiKeyField
                id="domainMetricsApiKey" label="Domain Metrics API Key" isConfigured={form.domainMetricsApiKey === "••••••••"}
                description="Domain authority signals and backlink data."
                value={form.domainMetricsApiKey as string} placeholder="Enter Domain Metrics API key"
                link="https://moz.com/api" onChange={(v) => set("domainMetricsApiKey", v)}
              />
              <ApiKeyField
                id="serpApiFallbackKey" label="SerpApi Fallback Key" isConfigured={form.serpApiFallbackKey === "••••••••"}
                description="Used as fallback for SERP scraping when primary SERP API fails."
                value={form.serpApiFallbackKey as string} placeholder="Enter SerpApi fallback key"
                link="https://serpapi.com/" onChange={(v) => set("serpApiFallbackKey", v)}
              />
              <SectionSaveButton onClick={() => save(["serpApiKey", "keywordDataApiKey", "domainMetricsApiKey", "serpApiFallbackKey"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* Brand Mentions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-orange-500" />
                Brand Mentions
                <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Critical</Badge>
              </CardTitle>
              <CardDescription>
                Uses SerpApi to query brand mentions across the web
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Brand mentions uses your SERP API key (configured above). Queries run for: <strong>"brand name"</strong>,{" "}
                  <strong>"brand name reviews"</strong>, <strong>"brand name company"</strong>. Extracts: number of mentions,
                  sources (blogs, forums, news), and Google News results.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-3 gap-3 text-center">
                {["Total Mentions", "Source Types", "News Results"].map((label) => (
                  <div key={label} className="border rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-bold mt-1 text-muted-foreground/50">—</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Meta Graph API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" /> Meta Graph API
              </CardTitle>
              <CardDescription>
                Facebook & Instagram metrics — followers, engagement rate, posting frequency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="metaAppId" label="App ID" isSecret={false} isConfigured={!!(form.metaAppId as string)}
                description="Your Meta App ID from the Facebook Developer console."
                value={form.metaAppId as string} placeholder="Enter Meta App ID"
                link="https://developers.facebook.com/" onChange={(v) => set("metaAppId", v)}
              />
              <ApiKeyField
                id="metaAppSecret" label="App Secret" isConfigured={form.metaAppSecret === "••••••••"}
                description="Keep this confidential."
                value={form.metaAppSecret as string} placeholder="Enter Meta App Secret"
                onChange={(v) => set("metaAppSecret", v)}
              />
              <ApiKeyField
                id="metaWebhookToken" label="Webhook Token" isConfigured={form.metaWebhookToken === "••••••••"}
                description="Verification token for Meta webhooks."
                value={form.metaWebhookToken as string} placeholder="Enter webhook verify token"
                onChange={(v) => set("metaWebhookToken", v)}
              />
              <ApiKeyField
                id="metaRedirectUri" label="Redirect URI" isSecret={false}
                description="OAuth callback URL registered in your Meta App."
                value={form.metaRedirectUri as string} placeholder="https://yourdomain.com/api/auth/meta/callback"
                onChange={(v) => set("metaRedirectUri", v)}
              />
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-orange-500" /> Ads Library API
                  <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">For Competitor Ads Intelligence</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Required to scan competitor Facebook & Instagram ads.{" "}
                  <a href="https://www.facebook.com/ads/library/api/" target="_blank" rel="noreferrer" className="underline text-primary">
                    Apply for access →
                  </a>
                </p>
              </div>
              <ApiKeyField
                id="metaAdsToken" label="Meta Ads Library Access Token" isConfigured={form.metaAdsToken === "••••••••"}
                description="A long-lived user access token with ads_read permission. Needed to query the Meta Ads Library API for competitor ad creatives."
                value={form.metaAdsToken as string} placeholder="Enter Meta Ads Library access token"
                link="https://developers.facebook.com/tools/explorer/" onChange={(v) => set("metaAdsToken", v)}
              />
              <SectionSaveButton onClick={() => save(["metaAppId", "metaAppSecret", "metaWebhookToken", "metaRedirectUri", "metaAdsToken"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* X API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Twitter className="h-4 w-4" /> X (Twitter) API
              </CardTitle>
              <CardDescription>Brand mentions and social presence on X</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="xApiKey" label="API Key" isConfigured={form.xApiKey === "••••••••"}
                description="From the X Developer Portal."
                value={form.xApiKey as string} placeholder="Enter X API Key"
                link="https://developer.twitter.com/" onChange={(v) => set("xApiKey", v)}
              />
              <ApiKeyField
                id="xApiSecret" label="API Key Secret" isConfigured={form.xApiSecret === "••••••••"}
                value={form.xApiSecret as string} placeholder="Enter X API Key Secret"
                onChange={(v) => set("xApiSecret", v)}
              />
              <ApiKeyField
                id="xBearerToken" label="Bearer Token" isConfigured={form.xBearerToken === "••••••••"}
                description="Used for read-only API requests."
                value={form.xBearerToken as string} placeholder="Enter Bearer Token"
                onChange={(v) => set("xBearerToken", v)}
              />
              <SectionSaveButton onClick={() => save(["xApiKey", "xApiSecret", "xBearerToken"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* LinkedIn API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn API
              </CardTitle>
              <CardDescription>Company page followers, engagement, and professional presence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="linkedinClientId" label="Client ID" isSecret={false} isConfigured={!!(form.linkedinClientId as string)}
                value={form.linkedinClientId as string} placeholder="Enter LinkedIn Client ID"
                link="https://www.linkedin.com/developers/" onChange={(v) => set("linkedinClientId", v)}
              />
              <ApiKeyField
                id="linkedinClientSecret" label="Client Secret" isConfigured={form.linkedinClientSecret === "••••••••"}
                value={form.linkedinClientSecret as string} placeholder="Enter LinkedIn Client Secret"
                onChange={(v) => set("linkedinClientSecret", v)}
              />
              <ApiKeyField
                id="linkedinOauthToken" label="OAuth Access Token" isConfigured={form.linkedinOauthToken === "••••••••"}
                description="Long-lived access token for the LinkedIn API."
                value={form.linkedinOauthToken as string} placeholder="Enter OAuth access token"
                onChange={(v) => set("linkedinOauthToken", v)}
              />
              <ApiKeyField
                id="linkedinRedirectUri" label="Redirect URI" isSecret={false}
                description="Must match the URI registered in your LinkedIn app."
                value={form.linkedinRedirectUri as string} placeholder="https://yourdomain.com/api/auth/linkedin/callback"
                onChange={(v) => set("linkedinRedirectUri", v)}
              />
              <SectionSaveButton onClick={() => save(["linkedinClientId", "linkedinClientSecret", "linkedinOauthToken", "linkedinRedirectUri"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* Google OAuth (Sign in with Google) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google OAuth (Sign in with Google)
              </CardTitle>
              <CardDescription>Allow users to sign in and register using their Google account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-700">
                  To enable Google Sign-In, create an OAuth 2.0 Client ID in the{" "}
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline font-semibold">Google Cloud Console</a>.
                  Set the Authorized Redirect URI to: <code className="bg-blue-100 px-1 rounded font-mono text-[11px]">{window.location.origin}/api/auth/google/callback</code>
                </AlertDescription>
              </Alert>
              <ApiKeyField
                id="googleClientId" label="Google Client ID" isSecret={false}
                isConfigured={!!(form.googleClientId as string) && form.googleClientId !== "••••••••"}
                description="OAuth 2.0 Client ID from Google Cloud Console."
                value={form.googleClientId as string} placeholder="xxxx.apps.googleusercontent.com"
                link="https://console.cloud.google.com/apis/credentials"
                onChange={(v) => set("googleClientId", v)}
              />
              <ApiKeyField
                id="googleClientSecret" label="Google Client Secret"
                isConfigured={form.googleClientSecret === "••••••••"}
                description="OAuth 2.0 Client Secret from Google Cloud Console."
                value={form.googleClientSecret as string} placeholder="Enter Google Client Secret"
                link="https://console.cloud.google.com/apis/credentials"
                onChange={(v) => set("googleClientSecret", v)}
              />
              <SectionSaveButton onClick={() => save(["googleClientId", "googleClientSecret"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* Google APIs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-red-500" /> Google APIs
              </CardTitle>
              <CardDescription>Custom Search for brand mentions + Places for local presence signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="googleCustomSearchApiKey" label="Custom Search API Key" isConfigured={form.googleCustomSearchApiKey === "••••••••"}
                description="Google Custom Search JSON API for brand mention monitoring."
                value={form.googleCustomSearchApiKey as string} placeholder="Enter Google Custom Search API Key"
                link="https://console.cloud.google.com/" onChange={(v) => set("googleCustomSearchApiKey", v)}
              />
              <ApiKeyField
                id="googleSearchEngineId" label="Search Engine ID (CX)" isSecret={false}
                isConfigured={!!(form.googleSearchEngineId as string)}
                description="Programmable Search Engine ID from Google Search Console."
                value={form.googleSearchEngineId as string} placeholder="Enter Custom Search Engine ID"
                onChange={(v) => set("googleSearchEngineId", v)}
              />
              <Separator />
              <div>
                <ApiKeyField
                  id="googlePlacesApiKey" label="Places API Key" isConfigured={form.googlePlacesApiKey === "••••••••"}
                  description="For local business presence signals."
                  value={form.googlePlacesApiKey as string} placeholder="Enter Google Places API Key"
                  link="https://console.cloud.google.com/" onChange={(v) => set("googlePlacesApiKey", v)}
                />
                {!form.googlePlacesApiKey && (
                  <Alert className="mt-2 border-amber-300 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-xs text-amber-700">
                      Places API is not configured. Local business presence scoring will be limited.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <SectionSaveButton onClick={() => save(["googleCustomSearchApiKey", "googleSearchEngineId", "googlePlacesApiKey"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* Trustpilot */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-green-600" /> Trustpilot API
              </CardTitle>
              <CardDescription>Review data for trust and credibility signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="trustpilotApiKey" label="API Key" isConfigured={form.trustpilotApiKey === "••••••••"}
                description="From Trustpilot Business Developer Portal."
                value={form.trustpilotApiKey as string} placeholder="Enter Trustpilot API Key"
                link="https://developers.trustpilot.com/" onChange={(v) => set("trustpilotApiKey", v)}
              />
              <SectionSaveButton onClick={() => save(["trustpilotApiKey"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* Flutterwave */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-orange-500" /> Flutterwave
                  </CardTitle>
                  <CardDescription>Payment processing for subscriptions</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{form.flutterwaveLiveMode ? "Live" : "Test"} Mode</span>
                  <Switch
                    checked={form.flutterwaveLiveMode as boolean}
                    onCheckedChange={(v) => set("flutterwaveLiveMode", v)}
                  />
                  <Badge variant={form.flutterwaveLiveMode ? "default" : "secondary"} className="text-xs">
                    {form.flutterwaveLiveMode ? "LIVE" : "TEST"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.flutterwaveLiveMode && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-700">
                    Live mode is enabled. Real payments will be processed.
                  </AlertDescription>
                </Alert>
              )}
              <ApiKeyField
                id="flutterwavePublicKey" label="Public Key" isSecret={false}
                isConfigured={!!(form.flutterwavePublicKey as string)}
                value={form.flutterwavePublicKey as string}
                placeholder={form.flutterwaveLiveMode ? "FLWPUBK-..." : "FLWPUBK_TEST-..."}
                onChange={(v) => set("flutterwavePublicKey", v)}
              />
              <ApiKeyField
                id="flutterwaveSecretKey" label="Secret Key" isConfigured={form.flutterwaveSecretKey === "••••••••"}
                value={form.flutterwaveSecretKey as string}
                placeholder={form.flutterwaveLiveMode ? "FLWSECK-..." : "FLWSECK_TEST-..."}
                onChange={(v) => set("flutterwaveSecretKey", v)}
              />
              <ApiKeyField
                id="flutterwaveEncryptionKey" label="Encryption Key" isConfigured={form.flutterwaveEncryptionKey === "••••••••"}
                description="Used for encrypting payment payload."
                value={form.flutterwaveEncryptionKey as string} placeholder="Enter encryption key"
                onChange={(v) => set("flutterwaveEncryptionKey", v)}
              />
              <ApiKeyField
                id="flutterwaveWebhookSecret" label="Webhook Secret" isConfigured={form.flutterwaveWebhookSecret === "••••••••"}
                description="Used to verify incoming webhook signatures."
                value={form.flutterwaveWebhookSecret as string} placeholder="Enter webhook secret"
                onChange={(v) => set("flutterwaveWebhookSecret", v)}
              />
              <SectionSaveButton onClick={() => save(["flutterwavePublicKey", "flutterwaveSecretKey", "flutterwaveEncryptionKey", "flutterwaveWebhookSecret", "flutterwaveLiveMode"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* Content & Website URL Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" /> Content & Website URL Analysis
              </CardTitle>
              <CardDescription>Internal scraper checks brand websites for credibility signals</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  The internal scraper uses an HTML parser to detect: <strong>Blog presence</strong>,{" "}
                  <strong>About page</strong>, <strong>Testimonials</strong>, <strong>Landing pages</strong>, and site structure.
                  No additional API key is required — this runs on the Skorvia server.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {["Blog Detection", "About Page", "Testimonials", "Landing Pages"].map((feature) => (
                  <div key={feature} className="border rounded-lg p-3 text-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <p className="text-xs font-medium">{feature}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-500" /> Resend — Transactional Email
              </CardTitle>
              <CardDescription>Powers all account emails: confirmations, welcomes, and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Resend is used for: <strong>email confirmations</strong>, <strong>welcome emails</strong>, and future{" "}
                  <strong>notification emails</strong>. Get your API key from{" "}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="underline">resend.com/api-keys</a>.
                </AlertDescription>
              </Alert>
              <ApiKeyField
                id="resendApiKey"
                label="Resend API Key"
                isConfigured={form.resendApiKey === "••••••••"}
                description="Found in your Resend dashboard under API Keys."
                value={form.resendApiKey as string}
                placeholder="re_..."
                link="https://resend.com/api-keys"
                onChange={(v) => set("resendApiKey", v)}
              />
              <ApiKeyField
                id="resendFromEmail"
                label="From Email Address"
                isSecret={false}
                description="Must be a verified domain in your Resend account. e.g. noreply@yourdomain.com"
                value={form.resendFromEmail as string}
                placeholder="Skorvia <noreply@yourdomain.com>"
                onChange={(v) => set("resendFromEmail", v)}
              />
              <SectionSaveButton onClick={() => save(["resendApiKey", "resendFromEmail"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-500" /> OpenAI API
              </CardTitle>
              <CardDescription>Powers AI-generated analysis, action plans, and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  OpenAI is responsible for: <strong>ABA score explanations</strong>, <strong>30-day action plans</strong>,{" "}
                  <strong>daily task generation</strong>, and <strong>personalized recommendations</strong>.
                </AlertDescription>
              </Alert>
              <ApiKeyField
                id="openaiApiKey" label="OpenAI API Key" isConfigured={form.openaiApiKey === "••••••••"}
                description="From the OpenAI platform dashboard."
                value={form.openaiApiKey as string} placeholder="sk-..."
                link="https://platform.openai.com/api-keys" onChange={(v) => set("openaiApiKey", v)}
              />
              <SectionSaveButton onClick={() => save(["openaiApiKey"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* YouTube Data API */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4 text-red-500" /> YouTube Data API
              </CardTitle>
              <CardDescription>Powers the Viral Content Detector — fetches top trending videos in any niche</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Required for live YouTube data in the <strong>Viral Content Detector</strong>. Without this key, the detector still works using AI general knowledge. Get a free key from the Google Cloud Console under "YouTube Data API v3".
                </AlertDescription>
              </Alert>
              <ApiKeyField
                id="youtubeApiKey" label="YouTube Data API v3 Key" isConfigured={form.youtubeApiKey === "••••••••"}
                description="Free tier allows 10,000 units/day — more than enough for typical usage."
                value={(form.youtubeApiKey as string) ?? ""} placeholder="AIza..."
                link="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                onChange={(v) => set("youtubeApiKey", v)}
              />
              <SectionSaveButton onClick={() => save(["youtubeApiKey"])} loading={isSaving} />
            </CardContent>
          </Card>

          {/* FX Rates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-500" /> FX Rates
              </CardTitle>
              <CardDescription>Currency conversion for localized pricing. Use provider API or manual rates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ApiKeyField
                id="fxProviderApiKey" label="FX Provider API Key" isConfigured={form.fxProviderApiKey === "••••••••"}
                description="Auto-fetch live rates. Leave empty to use manual rates below."
                value={form.fxProviderApiKey as string} placeholder="Enter FX provider API key"
                link="https://openexchangerates.org/" onChange={(v) => set("fxProviderApiKey", v)}
              />
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-3 block">Manual Rate Overrides (per 1 USD)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { key: "fxRateNGN", label: "NGN (₦)", flag: "🇳🇬" },
                    { key: "fxRateGHS", label: "GHS (₵)", flag: "🇬🇭" },
                    { key: "fxRateKES", label: "KES (Ksh)", flag: "🇰🇪" },
                    { key: "fxRateZAR", label: "ZAR (R)", flag: "🇿🇦" },
                    { key: "fxRateGBP", label: "GBP (£)", flag: "🇬🇧" },
                    { key: "fxRateEUR", label: "EUR (€)", flag: "🇪🇺" },
                  ].map(({ key, label, flag }) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={key} className="text-xs">{flag} {label}</Label>
                      <Input
                        id={key}
                        type="number"
                        value={form[key] as string}
                        onChange={(e) => set(key, e.target.value)}
                        placeholder="e.g. 1580"
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <SectionSaveButton onClick={() => save(["fxProviderApiKey", "fxRateNGN", "fxRateGHS", "fxRateKES", "fxRateZAR", "fxRateGBP", "fxRateEUR"])} loading={isSaving} />
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    </AdminAuthGate>
  );
}
