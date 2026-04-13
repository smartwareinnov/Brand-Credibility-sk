import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ResendConfirmation() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialEmail = params.get("email") ?? "";

  const { toast } = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState("");
  const [error, setError] = useState("");

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resend");

      if (data.confirmationUrl) {
        setDevUrl(data.confirmationUrl);
      }
      setSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Failed to resend", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight mb-3">Confirmation email sent!</h1>
              <p className="text-muted-foreground mb-2">
                We've sent a new confirmation link to
              </p>
              <p className="font-semibold text-foreground mb-6">{email}</p>
              <p className="text-sm text-muted-foreground mb-8">
                Click the link in the email to verify your account. The link expires in 24 hours. Check your spam folder if you don't see it.
              </p>

              {devUrl && (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left">
                  <p className="text-xs font-semibold text-amber-700 mb-2">🛠 Dev Mode — SMTP not configured</p>
                  <p className="text-xs text-amber-600 mb-3">Use this link to confirm your email:</p>
                  <a
                    href={devUrl}
                    className="inline-block w-full text-center bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
                  >
                    Confirm Email →
                  </a>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => { setSent(false); setDevUrl(""); }}
                >
                  <RefreshCw className="h-4 w-4" />
                  Resend again
                </Button>
                <Link href="/login">
                  <Button variant="ghost" className="gap-2 w-full text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 mb-4">
                  <Mail className="h-8 w-8 text-orange-500" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Your email hasn't been confirmed yet. Enter your email below and we'll send you a new confirmation link.
                </p>
              </div>

              {initialEmail && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">
                    Your previous confirmation link may have expired. Request a new one below.
                  </p>
                </div>
              )}

              <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8">
                <form onSubmit={handleResend} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </div>
                  <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                    {loading ? (
                      <><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Mail className="h-4 w-4" /> Send Confirmation Email</>
                    )}
                  </Button>
                </form>
              </div>

              <div className="mt-6 flex flex-col gap-2 items-center">
                <Link href="/login">
                  <Button variant="ghost" className="gap-2 text-muted-foreground">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href="/register" className="underline hover:text-foreground">Sign up</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
