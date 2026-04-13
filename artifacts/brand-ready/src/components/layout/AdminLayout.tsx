import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3, Settings, Shield, Menu, X, Zap, Users, Key,
  Palette, CreditCard, LineChart, ClipboardList, LogOut, User, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_TOKEN_KEY = "skorvia_admin_token";
export const ADMIN_USER_KEY = "skorvia_admin_user";

export const ADMIN_SECRET_KEY = ADMIN_TOKEN_KEY;

export function getAdminHeaders(): Record<string, string> {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
  return { "x-admin-token": token };
}

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/api-integrations", label: "API Integrations", icon: Key },
  { href: "/admin/appearance", label: "Appearance", icon: Palette },
  { href: "/admin/general", label: "General Settings", icon: Settings },
  { href: "/admin/plans", label: "Plans & Pricing", icon: CreditCard },
  { href: "/admin/analytics", label: "Analytics", icon: LineChart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/admin/security", label: "Security", icon: Shield },
];

function getAdminUsername(): string {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return "Admin";
    const parsed = JSON.parse(raw);
    return parsed?.username ?? "Admin";
  } catch {
    return "Admin";
  }
}

function AdminSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const [location] = useLocation();

  const handleLogout = async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      try {
        await fetch(`${import.meta.env.BASE_URL}api/admin/logout`, {
          method: "POST",
          headers: { "x-admin-token": token },
        });
      } catch {
      }
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    window.location.href = `${import.meta.env.BASE_URL}admin/login`;
  };

  const username = getAdminUsername();

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
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">Admin Panel</span>
          {onClose && (
            <button onClick={onClose} className="ml-auto md:hidden p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {adminNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <span
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t space-y-2">
          <div className="flex items-center gap-2 px-1 py-1 mb-1">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground truncate">{username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-red-500 hover:text-red-600 cursor-pointer transition-colors"
          >
            <LogOut className="h-3 w-3" />
            Sign out of admin
          </button>
        </div>
      </aside>
    </>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>
      <div className="md:hidden">
        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="md:hidden flex items-center h-14 border-b bg-card px-4 gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">Admin Panel</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) {
      navigate("/admin/login");
      setChecking(false);
      return;
    }
    const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE}/api/admin/me`, { headers: { "x-admin-token": token } })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
          localStorage.removeItem(ADMIN_USER_KEY);
          navigate("/admin/login");
        } else {
          setAuthed(true);
        }
      })
      .catch(() => {
        setAuthed(true);
      })
      .finally(() => setChecking(false));
  }, [navigate]);

  if (checking) return null;
  if (!authed) return null;

  return <>{children}</>;
}
