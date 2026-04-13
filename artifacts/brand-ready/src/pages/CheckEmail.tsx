import { useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Mail, RefreshCw, ArrowLeft } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function CheckEmail() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const email = params.get("email") ?? "";
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await fetch(`${API_BASE}/api/auth/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      toast({ title: "Email sent!", description: "Check your inbox for the confirmation link." });
    } catch {
      toast({ title: "Failed to resend", description: "Please try again.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/10 mb-6">
            <Mail className="h-10 w-10 text-blue-500" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-3">Check your inbox</h1>
          <p className="text-muted-foreground mb-2">
            We've sent a confirmation link to
          </p>
          {email && (
            <p className="font-semibold text-foreground mb-6">{email}</p>
          )}
          <p className="text-sm text-muted-foreground mb-8">
            Click the link in the email to confirm your account and gain access to your dashboard. The link expires in 24 hours.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleResend}
              disabled={resending}
            >
              <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resent ? "Resent! Check inbox" : "Resend confirmation email"}
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="gap-2 w-full text-muted-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-8">
            Wrong email?{" "}
            <Link href="/register" className="underline hover:text-foreground">Register again</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
