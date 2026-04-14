import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Shield, Eye, EyeOff, AlertCircle, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useRecaptcha } from "@/hooks/useRecaptcha";

const ADMIN_TOKEN_KEY = "skorvia_admin_token";
const ADMIN_USER_KEY = "skorvia_admin_user";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { getToken } = useRecaptcha();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [step, setStep] = useState<"login" | "2fa">("login");
  const [tempToken, setTempToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) navigate("/admin");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const recaptchaToken = await getToken("admin_login");
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed. Please check your credentials.");
        return;
      }

      if (data.requiresTwoFactor && data.tempToken) {
        setTempToken(data.tempToken);
        setStep("2fa");
        return;
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      navigate("/admin");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = totpCode.replace(/\s/g, "");
    if (!code || code.length < 6) {
      setTotpError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setTotpError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error || "Invalid code. Please try again.");
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(data.admin));
      navigate("/admin");
    } catch {
      setTotpError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "2fa") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/30 mb-4">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Two-Factor Authentication</h1>
            <p className="text-slate-400 text-sm mt-1">Enter the code from your authenticator app</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="admin-totp" className="text-sm font-medium text-slate-700">Verification Code</Label>
                <Input
                  id="admin-totp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000 000"
                  maxLength={7}
                  value={totpCode}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setTotpCode(raw.length > 3 ? raw.slice(0, 3) + " " + raw.slice(3, 6) : raw);
                    setTotpError("");
                  }}
                  className="text-center text-xl tracking-widest font-mono h-12"
                  autoFocus
                />
                {totpError && <p className="text-xs text-red-600">{totpError}</p>}
              </div>

              <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-sm" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>

              <button
                type="button"
                className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 mt-2"
                onClick={() => { setStep("login"); setTempToken(""); setTotpCode(""); setTotpError(""); }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Code expires in 5 minutes. Open your authenticator app for a fresh code.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg shadow-primary/30 mb-4">
            <Shield className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">Skorvia — Secure Access</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800">Sign in to continue</h2>
            <p className="text-sm text-slate-500 mt-0.5">Enter your admin credentials below</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="admin-username" className="text-sm font-medium text-slate-700">
                Username
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  autoComplete="username"
                  autoFocus
                  disabled={loading}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <Link href="/admin/forgot-password">
                  <span className="text-xs text-primary hover:text-primary/80 cursor-pointer transition-colors font-medium">
                    Forgot password?
                  </span>
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  disabled={loading}
                  className="pl-10 pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold shadow-sm"
              disabled={loading || !username.trim() || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t text-center">
            <Link href="/">
              <span className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
                ← Back to Skorvia
              </span>
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Protected area — unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
