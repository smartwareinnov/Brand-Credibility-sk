import { useEffect, useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, Zap } from "lucide-react";
import { markAuthenticated } from "@/hooks/useSession";

const SESSION_KEY = "skorvia_session_id";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ConfirmEmail() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(search).get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("No confirmation token found in the URL.");
      return;
    }

    const confirm = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/confirm?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Confirmation failed");

        localStorage.setItem(SESSION_KEY, data.sessionId);
        markAuthenticated();
        setFullName(data.fullName ?? "");
        setStatus("success");

        // Routing: new user → onboarding → pricing, already onboarded → dashboard
        const dest = !data.onboardingCompleted ? "/onboarding" : "/dashboard";
        setTimeout(() => setLocation(dest), 2500);
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.message);
      }
    };

    confirm();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center">
        {status === "loading" && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Confirming your email...</h1>
            <p className="text-muted-foreground">Just a moment while we verify your account.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Email confirmed! 🎉</h1>
            <p className="text-muted-foreground mb-2">
              {fullName ? `Welcome, ${fullName}!` : "Welcome!"} Your account is now active.
            </p>
            <p className="text-sm text-muted-foreground mb-8">Taking you to set up your profile...</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Taking you there now
            </div>
            <Link href="/dashboard">
              <Button className="gap-2">
                <Zap className="h-4 w-4" /> Go to Dashboard
              </Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-6">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Confirmation failed</h1>
            <p className="text-muted-foreground mb-6">{errorMsg || "The link may be expired or invalid."}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/check-email">
                <Button variant="outline">Resend confirmation</Button>
              </Link>
              <Link href="/register">
                <Button>Create new account</Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
