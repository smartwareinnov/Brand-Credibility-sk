import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Zap, ShieldCheck, ArrowLeft } from "lucide-react";
import { markAuthenticated, markPlanSelected, hasPlanSelected } from "@/hooks/useSession";
import { useRecaptcha } from "@/hooks/useRecaptcha";

const SESSION_KEY = "skorvia_session_id";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { getToken } = useRecaptcha();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [step, setStep] = useState<"login" | "2fa">("login");
  const [tempToken, setTempToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpError, setTotpError] = useState("");

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.includes("@")) e.email = "Enter a valid email";
    if (!form.password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const recaptchaToken = await getToken("login");
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, recaptchaToken }),
      });
      const data = await res.json();

      if (res.status === 403 && (data.error ?? "").toLowerCase().includes("confirm")) {
        setLocation(`/resend-confirmation?email=${encodeURIComponent(form.email)}`);
        return;
      }

      if (!res.ok) throw new Error(data.error || "Login failed");

      if (data.requiresTwoFactor && data.tempToken) {
        setTempToken(data.tempToken);
        setStep("2fa");
        return;
      }

      localStorage.setItem(SESSION_KEY, data.sessionId);
      markAuthenticated();
      await syncSubscriptionStatus(data.email);
      setLocation(hasPlanSelected() ? "/dashboard" : "/pricing");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const syncSubscriptionStatus = async (email: string) => {
    if (!email) return;
    try {
      const subRes = await fetch(`${API_BASE}/api/user/subscription?email=${encodeURIComponent(email)}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData.hasActiveSubscription) {
          markPlanSelected();
        }
      }
    } catch {
      // non-critical, ignore errors
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
      const res = await fetch(`${API_BASE}/api/auth/verify-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error || "Invalid code. Please try again.");
        return;
      }
      localStorage.setItem(SESSION_KEY, data.sessionId);
      markAuthenticated();
      await syncSubscriptionStatus(data.email);
      setLocation(hasPlanSelected() ? "/dashboard" : "/pricing");
    } catch {
      setTotpError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  if (step === "2fa") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Two-Factor Authentication</h1>
              <p className="text-muted-foreground mt-2">Enter the 6-digit code from your authenticator app</p>
            </div>

            <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8">
              <form onSubmit={handleVerify2FA} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="totp">Verification Code</Label>
                  <Input
                    id="totp"
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
                    className="text-center text-xl tracking-widest font-mono"
                    autoFocus
                  />
                  {totpError && <p className="text-xs text-destructive">{totpError}</p>}
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Verifying..." : "Verify & Log In"}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 mt-2"
                  onClick={() => { setStep("login"); setTempToken(""); setTotpCode(""); setTotpError(""); }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-5">
              Code expires in 5 minutes. Open your authenticator app to get a fresh code.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mt-2">Log in to your BrandReady account</p>
          </div>

          <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2.5 mb-5 font-medium"
              onClick={handleGoogleLogin}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Your password"
                    className="pr-10"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "Logging in..." : "Log In"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
