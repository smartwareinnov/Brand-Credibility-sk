import { useEffect, useState } from "react";
import { useSearch, useLocation } from "wouter";
import { Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { markAuthenticated } from "@/hooks/useSession";

const SESSION_KEY = "skorvia_session_id";

export default function GoogleAuthSuccess() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(search);
    const sessionId = params.get("sessionId");
    const errorMsg = params.get("error");
    const onboarding = params.get("onboarding");

    if (errorMsg) {
      setError(decodeURIComponent(errorMsg));
      return;
    }

    if (sessionId) {
      localStorage.setItem(SESSION_KEY, sessionId);
      markAuthenticated();
      if (onboarding === "1") {
        setLocation("/onboarding");
      } else {
        setLocation("/dashboard");
      }
    } else {
      setError("No session received. Please try again.");
    }
  }, [search, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 mb-4">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Google Sign-In Failed</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Link href="/login">
            <Button className="w-full">Try Again</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 animate-pulse">
          <Zap className="h-7 w-7 text-primary" />
        </div>
        <p className="text-muted-foreground text-sm">Signing you in with Google…</p>
      </div>
    </div>
  );
}
