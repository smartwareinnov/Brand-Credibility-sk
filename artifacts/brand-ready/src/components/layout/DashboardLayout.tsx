import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, PlusCircle, User, CreditCard,
  Menu, Zap, LogOut, Megaphone, Users, CalendarCheck,
  Bell, MessageSquare, Repeat, Crown, Briefcase, BarChart3, TrendingUp, FolderOpen,
  Bot, Wand2, Newspaper, Star, Search, LineChart, ShieldCheck, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/useApi";
import { clearAuthenticated } from "@/hooks/useSession";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import { useAppConfig } from "@/hooks/useAppConfig";

const SESSION_KEY = "skorvia_session_id";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const mainNav = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Analysis", href: "/analyze", icon: PlusCircle },
  { name: "My Brands", href: "/my-brands", icon: Briefcase },
];

const trackingNav = [
  { name: "Brand Mentions", href: "/brand-mentions", icon: Megaphone },
  { name: "Competitors", href: "/competitors", icon: Users },
  { name: "Competitor Analysis", href: "/competitor-analysis", icon: BarChart3 },
  { name: "Competitor Ads Intelligence", href: "/competitor-ads", icon: TrendingUp },
  { name: "My Analysis", href: "/my-analysis", icon: FolderOpen },
  { name: "Daily Tasks", href: "/daily-tasks", icon: CalendarCheck },
];

const aiToolsNav = [
  { name: "AI Brand Coach", href: "/ai-coach", icon: Bot },
  { name: "Content Generator", href: "/content-generator", icon: Wand2 },
  { name: "Press Release Builder", href: "/press-release", icon: Newspaper },
  { name: "Review Templates", href: "/review-templates", icon: Star },
  { name: "Industry Benchmarks", href: "/benchmarks", icon: BarChart3 },
  { name: "Score Tracker", href: "/competitor-tracker", icon: LineChart },
  { name: "Strategy Decoder", href: "/strategy-decoder", icon: Search },
  { name: "Audience Trust Score", href: "/trust-score", icon: ShieldCheck },
  { name: "Viral Content Detector", href: "/viral-detector", icon: Flame },
];

const accountNav = [
  { name: "Profile", href: "/profile", icon: User },
  { name: "Subscription", href: "/subscription", icon: Repeat },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Messages", href: "/messages", icon: MessageSquare },
];

function NavItem({ href, icon: Icon, name, location, onNav, badge, pill }: {
  href: string; icon: React.ElementType; name: string; location: string; onNav?: () => void; badge?: number; pill?: React.ReactNode;
}) {
  const isActive = location === href;
  return (
    <Link href={href}>
      <span
        onClick={onNav}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {name}
        {pill && <span className="ml-auto">{pill}</span>}
        {badge != null && badge > 0 && (
          <span className={cn(
            "ml-auto text-xs font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center",
            isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
          )}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </span>
    </Link>
  );
}

function useUnreadCount() {
  const { apiFetch } = useApi();
  const { data } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => apiFetch<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 30000,
    staleTime: 20000,
  });
  return data?.count ?? 0;
}

function useSubscriptionPlanId() {
  const { apiFetch } = useApi();
  const sessionId = localStorage.getItem(SESSION_KEY);
  const { data } = useQuery<{ planId?: string; hasActiveSubscription?: boolean }>({
    queryKey: ["sidebar-subscription"],
    queryFn: () => apiFetch<{ planId?: string; hasActiveSubscription?: boolean }>(`/user/subscription?sessionId=${sessionId}`),
    enabled: !!sessionId,
    staleTime: 60000,
    retry: false,
  });
  return data?.planId ?? "free";
}

const GROWTH_PLANS = ["growth-monthly", "growth-yearly"];
const isGrowthPlan = (planId: string) => GROWTH_PLANS.includes(planId);

function SidebarContent({ location, onNav }: { location: string; onNav?: () => void }) {
  const unreadCount = useUnreadCount();
  const planId = useSubscriptionPlanId();
  const isGrowth = isGrowthPlan(planId);
  const { siteName, logoUrl } = useAppConfig();

  const handleLogout = () => {
    clearAuthenticated();
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNav}>
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
      </div>

      <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
        {mainNav.map((item) => (
          <NavItem key={item.name} {...item} location={location} onNav={onNav} />
        ))}

        <Separator className="my-3" />

        <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Tracking
        </p>

        {trackingNav.map((item) => (
          <NavItem key={item.name} {...item} location={location} onNav={onNav} />
        ))}

        <Separator className="my-3" />

        <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          AI Tools
        </p>

        {aiToolsNav.map((item) => (
          <NavItem key={item.name} {...item} location={location} onNav={onNav} />
        ))}

        <Separator className="my-3" />

        <p className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Account
        </p>

        {accountNav.map((item) => (
          <NavItem
            key={item.name}
            {...item}
            location={location}
            onNav={onNav}
            badge={item.name === "Messages" ? unreadCount : undefined}
          />
        ))}

      </nav>

      <div className="p-4 border-t space-y-2">
        {isGrowth ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
            <Crown className="h-3.5 w-3.5" />
            Growth Plan
          </div>
        ) : (
          <Link href="/pricing">
            <span className="flex items-center gap-2 text-xs text-primary font-semibold hover:underline cursor-pointer">
              <Zap className="h-3.5 w-3.5" />
              Upgrade Plan
            </span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Log out
        </button>
      </div>
    </div>
  );
}

function NotificationBell() {
  const unreadCount = useUnreadCount();
  return (
    <Link href="/messages">
      <button className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </Link>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { siteName, logoUrl } = useAppConfig();
  useInactivityLogout();

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r bg-card flex-shrink-0 flex-col">
        <SidebarContent location={location} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-card border-r flex flex-col transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent location={location} onNav={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="flex items-center h-14 border-b bg-card px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="md:hidden flex items-center gap-2 flex-1">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-7 w-auto object-contain" />
            ) : (
              <>
                <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="font-bold text-base tracking-tight">{siteName}</span>
              </>
            )}
          </div>
          <div className="hidden md:block flex-1" />
          <div className="flex items-center gap-2 ml-auto">
            <NotificationBell />
            <Link href="/analyze">
              <Button size="sm" className="h-8 px-3 text-xs">+ Analyze</Button>
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
