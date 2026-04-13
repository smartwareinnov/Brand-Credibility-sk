import { Link } from "wouter";
import { Zap, Twitter, Linkedin, Instagram, Mail } from "lucide-react";
import { useAppConfig } from "@/hooks/useAppConfig";

const PRODUCT_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Start Analysis", href: "/analyze" },
];

const COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function Footer() {
  const { siteName, logoUrl, footerText, privacyUrl, termsUrl } = useAppConfig();

  const legalLinks = [
    { label: "Privacy Policy", href: privacyUrl || "/privacy", external: !!privacyUrl },
    { label: "Terms & Conditions", href: termsUrl || "/terms", external: !!termsUrl },
  ];

  return (
    <footer className="border-t bg-background">
      <div className="container py-10 md:py-14">
        {/* Main footer content */}
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">

          {/* Brand column */}
          <div className="flex-shrink-0 max-w-xs space-y-4">
            <Link href="/" className="flex items-center gap-2 w-fit">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-7 w-auto object-contain" />
              ) : (
                <>
                  <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg tracking-tight">{siteName}</span>
                </>
              )}
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The intelligent growth strategist for ambitious founders. Analyze your brand credibility and get ready to scale.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <a href="https://twitter.com" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="mailto:hello@skorvia.io"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-3 gap-6 sm:gap-10">
            {/* Product */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-sm font-semibold whitespace-nowrap">Product</h4>
              <ul className="space-y-2.5">
                {PRODUCT_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-sm font-semibold whitespace-nowrap">Company</h4>
              <ul className="space-y-2.5">
                {COMPANY_LINKS.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>
                      <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                        {l.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3 min-w-0">
              <h4 className="text-sm font-semibold whitespace-nowrap">Legal</h4>
              <ul className="space-y-2.5">
                {legalLinks.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} target="_blank" rel="noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href}>
                        <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                          {l.label}
                        </span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t py-5">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {footerText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
          </p>
          <div className="flex items-center gap-4">
            {legalLinks.map((l) => (
              l.external ? (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {l.label}
                </a>
              ) : (
                <Link key={l.label} href={l.href}>
                  <span className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    {l.label}
                  </span>
                </Link>
              )
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
