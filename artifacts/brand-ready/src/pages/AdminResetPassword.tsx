import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Shield, Eye, EyeOff, CheckCircle2, AlertCircle, Lock, ArrowLeft, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const prefillCode = params.get("code") ?? "";
  const prefillUsername = params.get("username") ?? "";

  const [code, setCode] = useState(prefillCode);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (prefillCode) setCode(prefillCode);
  }, [prefillCode]);

  const passwordStrength = (() => {
    if (!newPassword) return { score: 0, label: "", color: "" };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
    if (score <= 3) return { score, label: "Fair", color: "bg-amber-500" };
    return { score, label: "Strong", color: "bg-green-500" };
  })();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError("Please enter your reset code."); return; }
    if (!newPassword) { setError("Please enter a new password."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: prefillUsername || undefined,
          code: code.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reset failed. The code may be expired or invalid.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-slate-400 text-sm mt-1">Skorvia — Password Reset</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Password Updated!</h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Your admin password has been successfully changed. You can now sign in with your new password.
                </p>
              </div>
              <Button
                className="w-full h-11 text-sm font-semibold mt-2"
                onClick={() => navigate("/admin/login")}
              >
                Sign In Now
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Reset your password</h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Enter your reset code and choose a new password.
                </p>
              </div>

              <form onSubmit={handleReset} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-code" className="text-sm font-medium text-slate-700">
                    Reset Code
                  </Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="reset-code"
                      type="text"
                      placeholder="Enter your 8-char reset code"
                      value={code}
                      onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                      autoFocus={!prefillCode}
                      disabled={loading}
                      className="pl-10 h-11 font-mono tracking-widest uppercase"
                      maxLength={12}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="new-password"
                      type={showNew ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                      disabled={loading}
                      autoComplete="new-password"
                      className="pl-10 pr-10 h-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 1 ? "text-red-600"
                          : passwordStrength.score <= 3 ? "text-amber-600"
                            : "text-green-600"
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-slate-700">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                      disabled={loading}
                      autoComplete="new-password"
                      className={`pl-10 pr-10 h-11 ${confirmPassword && newPassword !== confirmPassword ? "border-red-400 focus-visible:ring-red-400" : confirmPassword && newPassword === confirmPassword ? "border-green-400 focus-visible:ring-green-400" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold"
                  disabled={loading || !code.trim() || !newPassword || newPassword !== confirmPassword}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Resetting…
                    </span>
                  ) : "Reset Password"}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t text-center">
                <Link href="/admin/forgot-password">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Get a new reset code
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
