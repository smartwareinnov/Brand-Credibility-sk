import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface AppConfig {
  siteName: string;
  siteTagline: string | null;
  logoUrl: string | null;
  lightLogoUrl: string | null;
  faviconUrl: string | null;
  brandColor: string | null;
  accentColor: string | null;
  typography: string | null;
  metaDescription: string | null;
  footerText: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
  maintenanceMode: boolean;
  allowSignups: boolean;
  waitlistMode: boolean;
  recaptchaEnabled: boolean;
  recaptchaSiteKey: string | null;
  sessionTimeout: number | null;
}

const DEFAULT_CONFIG: AppConfig = {
  siteName: "Skorvia",
  siteTagline: null,
  logoUrl: null,
  lightLogoUrl: null,
  faviconUrl: null,
  brandColor: null,
  accentColor: null,
  typography: null,
  metaDescription: null,
  footerText: null,
  privacyUrl: null,
  termsUrl: null,
  maintenanceMode: false,
  allowSignups: true,
  waitlistMode: false,
  recaptchaEnabled: false,
  recaptchaSiteKey: null,
  sessionTimeout: null,
};

async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch(`${BASE}/api/app/config`);
  if (!res.ok) return DEFAULT_CONFIG;
  return res.json();
}

export function useAppConfig() {
  const { data } = useQuery({
    queryKey: ["app-config"],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const config = data ?? DEFAULT_CONFIG;

  // Site title
  useEffect(() => {
    if (config.siteName) {
      document.title = config.siteName;
    }
  }, [config.siteName]);

  // Meta description
  useEffect(() => {
    if (config.metaDescription) {
      let meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = config.metaDescription;
    }
  }, [config.metaDescription]);

  // Brand color → update --primary CSS variable (HSL)
  useEffect(() => {
    if (config.brandColor) {
      const hex = config.brandColor.replace("#", "");
      if (hex.length !== 6) return;
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      const hDeg = Math.round(h * 360);
      const sPct = Math.round(s * 100);
      const lPct = Math.round(l * 100);
      const hsl = `${hDeg} ${sPct}% ${lPct}%`;
      document.documentElement.style.setProperty("--primary", hsl);
      document.documentElement.style.setProperty("--ring", hsl);
      document.documentElement.style.setProperty("--sidebar-primary", hsl);
    }
  }, [config.brandColor]);

  // Accent color → update --accent CSS variable
  useEffect(() => {
    if (config.accentColor) {
      const hex = config.accentColor.replace("#", "");
      if (hex.length !== 6) return;
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      document.documentElement.style.setProperty("--chart-1", hsl);
    }
  }, [config.accentColor]);

  // Typography → load Google Font and set --app-font-sans
  useEffect(() => {
    const FONT_MAP: Record<string, { family: string; googleName: string }> = {
      inter: { family: "'Inter', sans-serif", googleName: "Inter:wght@400;500;600;700" },
      geist: { family: "'Geist', sans-serif", googleName: "Geist:wght@400;500;600;700" },
      "plus-jakarta": { family: "'Plus Jakarta Sans', sans-serif", googleName: "Plus+Jakarta+Sans:wght@400;500;600;700" },
      outfit: { family: "'Outfit', sans-serif", googleName: "Outfit:wght@400;500;600;700" },
      "dm-sans": { family: "'DM Sans', sans-serif", googleName: "DM+Sans:wght@400;500;600;700" },
    };
    const font = FONT_MAP[config.typography ?? "inter"] ?? FONT_MAP.inter;
    document.documentElement.style.setProperty("--app-font-sans", font.family);
    // Load font if not already loaded
    const linkId = `font-${config.typography ?? "inter"}`;
    if (!document.getElementById(linkId) && config.typography && config.typography !== "inter") {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${font.googleName}&display=swap`;
      document.head.appendChild(link);
    }
  }, [config.typography]);

  // Favicon
  useEffect(() => {
    if (config.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
    }
  }, [config.faviconUrl]);

  return config;
}
