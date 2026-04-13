import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image, Upload, Palette, Type, Link as LinkIcon, Eye } from "lucide-react";
import {
  useGetAdminSettings, useUpdateAdminSettings, useUploadLogo,
  getGetAdminSettingsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout, AdminAuthGate, getAdminHeaders } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";

type Form = {
  siteName: string; siteTagline: string; metaDescription: string;
  footerText: string; privacyUrl: string; termsUrl: string;
  brandColor: string; accentColor: string; typography: string;
};

function LogoUploadBox({
  label, preview, onUpload, loading,
}: {
  label: string; preview: string | null; onUpload: (file: File) => void; loading?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onUpload(file);
  }, [onUpload]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer
          ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-muted/20"}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => ref.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Logo preview" className="h-16 max-w-[200px] object-contain" />
        ) : (
          <>
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
              <Image className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Drop image here or <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG up to 2MB</p>
          </>
        )}
        {loading && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-xl">
            <div className="text-sm font-medium animate-pulse">Uploading...</div>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onUpload(f);
        e.target.value = "";
      }} />
      {preview && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => ref.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Replace
        </Button>
      )}
    </div>
  );
}

const TYPOGRAPHY_OPTIONS = [
  { value: "inter", label: "Inter (Default)" },
  { value: "geist", label: "Geist" },
  { value: "plus-jakarta", label: "Plus Jakarta Sans" },
  { value: "outfit", label: "Outfit" },
  { value: "dm-sans", label: "DM Sans" },
];

export default function AdminAppearance() {
  const adminHeaders = getAdminHeaders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useGetAdminSettings({
    query: { queryKey: getGetAdminSettingsQueryKey(), retry: false },
    request: { headers: adminHeaders },
  });

  const updateSettings = useUpdateAdminSettings({ request: { headers: adminHeaders } });
  const uploadLogo = useUploadLogo({ request: { headers: adminHeaders } });

  const [logos, setLogos] = useState({ main: null as string | null, light: null as string | null, favicon: null as string | null });
  const [form, setForm] = useState<Form>({
    siteName: "", siteTagline: "", metaDescription: "",
    footerText: "", privacyUrl: "", termsUrl: "",
    brandColor: "#6366F1", accentColor: "#F97316", typography: "inter",
  });

  useEffect(() => {
    if (settings) {
      setForm({
        siteName: settings.siteName ?? "Skorvia",
        siteTagline: settings.siteTagline ?? "",
        metaDescription: (settings as unknown as Record<string, unknown>).metaDescription as string ?? "",
        footerText: (settings as unknown as Record<string, unknown>).footerText as string ?? "",
        privacyUrl: (settings as unknown as Record<string, unknown>).privacyUrl as string ?? "",
        termsUrl: (settings as unknown as Record<string, unknown>).termsUrl as string ?? "",
        brandColor: (settings as unknown as Record<string, unknown>).brandColor as string ?? "#6366F1",
        accentColor: (settings as unknown as Record<string, unknown>).accentColor as string ?? "#F97316",
        typography: (settings as unknown as Record<string, unknown>).typography as string ?? "inter",
      });
      setLogos({
        main: settings.logoUrl ?? null,
        light: (settings as unknown as Record<string, unknown>).lightLogoUrl as string ?? null,
        favicon: settings.faviconUrl ?? null,
      });
    }
  }, [settings]);

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = (key: "main" | "light" | "favicon") => (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      uploadLogo.mutate(
        { data: { imageData: base64, imageType: file.type, logoType: key } },
        {
          onSuccess: (resp) => {
            setLogos(l => ({ ...l, [key]: resp.logoUrl }));
            queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
            toast({ title: "Logo updated" });
          },
          onError: () => toast({ title: "Upload failed", variant: "destructive" }),
        }
      );
    };
    reader.readAsDataURL(file);
  };

  const save = (data: Partial<Form>) => {
    updateSettings.mutate(
      { data: data as Parameters<typeof updateSettings.mutate>[0]["data"] },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAdminSettingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["app-config"] });
          toast({ title: "Saved", description: "Appearance settings updated." });
        },
        onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) {
    return (
      <AdminAuthGate>
        <AdminLayout title="Appearance">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted/40 animate-pulse rounded-lg" />)}
          </div>
        </AdminLayout>
      </AdminAuthGate>
    );
  }

  return (
    <AdminAuthGate>
      <AdminLayout title="Appearance" subtitle="Logos, colors, typography, and platform identity">
        <div className="space-y-6 max-w-3xl">

          {/* Logos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="h-4 w-4" /> Logo & Favicon
              </CardTitle>
              <CardDescription>Drag and drop images or click to browse</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <LogoUploadBox label="Main Logo (dark bg)" preview={logos.main} onUpload={handleLogoUpload("main")} loading={uploadLogo.isPending} />
              <LogoUploadBox label="Light Mode Logo" preview={logos.light} onUpload={handleLogoUpload("light")} loading={uploadLogo.isPending} />
              <LogoUploadBox label="Favicon (32×32)" preview={logos.favicon} onUpload={handleLogoUpload("favicon")} loading={uploadLogo.isPending} />
            </CardContent>
          </Card>

          {/* Brand Colors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" /> Brand Colors
              </CardTitle>
              <CardDescription>Primary and accent colors used across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Brand Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.brandColor}
                      onChange={(e) => set("brandColor", e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-border p-0.5"
                    />
                    <Input value={form.brandColor} onChange={(e) => set("brandColor", e.target.value)}
                      placeholder="#6366F1" className="font-mono uppercase" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => set("accentColor", e.target.value)}
                      className="h-9 w-14 cursor-pointer rounded border border-border p-0.5"
                    />
                    <Input value={form.accentColor} onChange={(e) => set("accentColor", e.target.value)}
                      placeholder="#F97316" className="font-mono uppercase" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: form.brandColor }} />
                <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: form.accentColor }} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save({ brandColor: form.brandColor, accentColor: form.accentColor })}
                  disabled={updateSettings.isPending}>Save Colors</Button>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Type className="h-4 w-4" /> Typography
              </CardTitle>
              <CardDescription>Font family for the platform UI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select value={form.typography} onValueChange={(v) => set("typography", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select font" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPOGRAPHY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save({ typography: form.typography })} disabled={updateSettings.isPending}>
                  Save Typography
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Platform Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Platform Identity
              </CardTitle>
              <CardDescription>Name, tagline, and meta content shown in search engines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Platform Name</Label>
                  <Input value={form.siteName} onChange={(e) => set("siteName", e.target.value)} placeholder="Skorvia" />
                </div>
                <div className="space-y-1.5">
                  <Label>Tagline</Label>
                  <Input value={form.siteTagline} onChange={(e) => set("siteTagline", e.target.value)}
                    placeholder="Know exactly when you're ready to scale" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Meta Description</Label>
                <Textarea value={form.metaDescription} onChange={(e) => set("metaDescription", e.target.value)}
                  placeholder="Skorvia helps founders measure brand credibility and ad readiness..."
                  className="resize-none" rows={3} />
                <p className="text-xs text-muted-foreground">{form.metaDescription.length}/160 characters recommended</p>
              </div>
              <div className="space-y-1.5">
                <Label>Footer Text</Label>
                <Input value={form.footerText} onChange={(e) => set("footerText", e.target.value)}
                  placeholder="© 2026 Skorvia. All rights reserved." />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save({
                  siteName: form.siteName, siteTagline: form.siteTagline,
                  metaDescription: form.metaDescription, footerText: form.footerText,
                })} disabled={updateSettings.isPending}>Save Identity</Button>
              </div>
            </CardContent>
          </Card>

          {/* Legal Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LinkIcon className="h-4 w-4" /> Legal & Footer Links
              </CardTitle>
              <CardDescription>URLs shown in the platform footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Privacy Policy URL</Label>
                <Input value={form.privacyUrl} onChange={(e) => set("privacyUrl", e.target.value)}
                  placeholder="https://skorvia.io/privacy" />
              </div>
              <div className="space-y-1.5">
                <Label>Terms & Conditions URL</Label>
                <Input value={form.termsUrl} onChange={(e) => set("termsUrl", e.target.value)}
                  placeholder="https://skorvia.io/terms" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => save({ privacyUrl: form.privacyUrl, termsUrl: form.termsUrl })}
                  disabled={updateSettings.isPending}>Save Links</Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </AdminLayout>
    </AdminAuthGate>
  );
}
