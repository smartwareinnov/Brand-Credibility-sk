import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Mail, Zap, ArrowLeft, CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      if (data.resetUrl) setDevResetUrl(data.resetUrl);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${submitted ? "bg-green-100" : "bg-primary/10"}`}>
              {submitted
                ? <CheckCircle2 className="h-7 w-7 text-green-600" />
                : <Zap className="h-7 w-7 text-primary" />
              }
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {submitted ? "Check your inbox" : "Forgot your password?"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {submitted
                ? `We've sent a password reset link to ${email}. It expires in 1 hour.`
                : "No worries. Enter your email and we'll send you a reset link."}
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              {devResetUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-amber-700 mb-2">Dev mode — no email service configured</p>
                  <a
                    href={devResetUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline break-all"
                  >
                    <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                    Open reset link
                  </a>
                </div>
              )}

              <div className="bg-card border rounded-2xl shadow-sm p-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Didn't receive it? Check your spam folder, or try again with a different email.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => { setSubmitted(false); setDevResetUrl(null); }}
                >
                  Try a different email
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </Link>
              </p>
            </div>
          ) : (
            <>
              <div className="bg-card border rounded-2xl shadow-sm p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                    <Mail className="h-4 w-4" />
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                <Link href="/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
