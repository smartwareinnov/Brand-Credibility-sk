import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAuthenticated } from "@/hooks/useSession";
import { useAppConfig } from "@/hooks/useAppConfig";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoggedIn = useIsAuthenticated();
  const { siteName, logoUrl } = useAppConfig();

  const isDashboard =
    location.startsWith("/dashboard") ||
    location.startsWith("/results") ||
    location.startsWith("/tasks") ||
    location.startsWith("/analyze") ||
    location.startsWith("/profile") ||
    location.startsWith("/billing") ||
    location.startsWith("/brand-setup") ||
    location.startsWith("/admin");

  if (isDashboard) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href={isLoggedIn ? "/dashboard" : "/"} className="flex items-center gap-2 flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-8 w-auto object-contain" />
          ) : (
            <>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-xl tracking-tight">{siteName}</span>
            </>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <Link key={item.href} href={item.href}>
              <span className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location === item.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Link href="/dashboard">
              <Button size="sm" className="gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started Free</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "block px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    location === item.href
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </span>
              </Link>
            ))}
            <div className="pt-3 mt-2 border-t flex flex-col gap-2">
              {isLoggedIn ? (
                <Link href="/dashboard">
                  <Button className="w-full gap-1.5" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                      Log in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="w-full" onClick={() => setMobileOpen(false)}>
                      Get Started Free
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
