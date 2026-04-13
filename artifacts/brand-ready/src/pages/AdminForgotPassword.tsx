import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Shield, ArrowLeft, CheckCircle2, Copy, AlertCircle, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "request" | "success";

export default function AdminForgotPassword() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("request");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your admin username.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate reset code. Please try again.");
        return;
      }
      setResetCode(data.resetCode ?? "");
      setStep("success");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(resetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <p className="text-slate-400 text-sm mt-1">Skorvia — Password Recovery</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === "request" ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800">Forgot your password?</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Enter your admin username and we'll generate a one-time reset code.
                </p>
              </div>

              <form onSubmit={handleRequest} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-username" className="text-sm font-medium text-slate-700">
                    Admin Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="reset-username"
                      type="text"
                      placeholder="admin"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); setError(""); }}
                      autoFocus
                      disabled={loading}
                      className="pl-10 h-11"
                    />
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
                  className="w-full h-11 text-sm font-semibold"
                  disabled={loading || !username.trim()}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating code…
                    </span>
                  ) : "Generate Reset Code"}
                </Button>
              </form>

              <div className="mt-6 pt-5 border-t text-center">
                <Link href="/admin/login">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                  </span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-slate-800">Reset Code Generated</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Use the code below to reset your password. It expires in <strong>30 minutes</strong>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
                <p className="text-xs text-slate-500 mb-2 font-medium">Your one-time reset code:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-2xl font-mono font-bold text-slate-800 tracking-widest text-center py-2 bg-white rounded-lg border border-slate-200">
                    {resetCode}
                  </code>
                  <button
                    onClick={handleCopy}
                    title="Copy code"
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5">
                <p className="text-xs text-amber-800">
                  <strong>Keep this safe.</strong> This code can only be used once. Do not share it with anyone.
                </p>
              </div>

              <Button
                className="w-full h-11 text-sm font-semibold"
                onClick={() => navigate(`/admin/reset-password?code=${encodeURIComponent(resetCode)}&username=${encodeURIComponent(username)}`)}
              >
                Use This Code to Reset Password
              </Button>

              <div className="mt-5 text-center">
                <button
                  onClick={() => { setStep("request"); setResetCode(""); setUsername(""); }}
                  className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Generate a new code instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
