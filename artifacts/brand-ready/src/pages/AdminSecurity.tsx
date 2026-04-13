import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck, ShieldOff, Smartphone, Copy, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { AdminLayout, getAdminHeaders, AdminAuthGate } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getHeaders() {
  const h = getAdminHeaders();
  return { ...h, "Content-Type": "application/json" };
}

export default function AdminSecurity() {
  const { toast } = useToast();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/2fa/status`, { headers: getAdminHeaders() })
      .then(r => r.json())
      .then(data => setTwoFactorEnabled(!!data.twoFactorEnabled))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSetup = async () => {
    setVerifyCode("");
    setVerifyError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/2fa/setup`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupOpen(true);
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleEnable = async () => {
    const code = verifyCode.replace(/\s/g, "");
    if (!code || code.length < 6) {
      setVerifyError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setVerifyError("");
    setVerifyLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/2fa/enable`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Invalid code");
        return;
      }
      setTwoFactorEnabled(true);
      setSetupOpen(false);
      toast({ title: "2FA Enabled", description: "Two-factor authentication is now active on your account." });
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      setDisableError("Password is required");
      return;
    }
    setDisableError("");
    setDisableLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/2fa/disable`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDisableError(data.error || "Failed to disable 2FA");
        return;
      }
      setTwoFactorEnabled(false);
      setDisableOpen(false);
      setDisablePassword("");
      toast({ title: "2FA Disabled", description: "Two-factor authentication has been removed from your account." });
    } catch {
      setDisableError("Something went wrong. Please try again.");
    } finally {
      setDisableLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminAuthGate>
      <AdminLayout title="Security" subtitle="Manage your admin account security settings">
        <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription className="mt-1">
                  Add an extra layer of security to your admin account using an authenticator app.
                </CardDescription>
              </div>
              {!loading && (
                <Badge variant={twoFactorEnabled ? "default" : "secondary"} className={twoFactorEnabled ? "bg-green-100 text-green-700 border-green-200" : ""}>
                  {twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-10 bg-muted animate-pulse rounded" />
            ) : twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Your account is protected</p>
                    <p className="text-xs text-green-600 mt-0.5">You'll be asked for a code from your authenticator app each time you sign in.</p>
                  </div>
                </div>
                <Button variant="destructive" size="sm" onClick={() => { setDisableOpen(true); setDisablePassword(""); setDisableError(""); }}>
                  <ShieldOff className="h-4 w-4 mr-1.5" />
                  Disable 2FA
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">2FA is not enabled</p>
                    <p className="text-xs text-amber-600 mt-0.5">Your account relies on your password alone. We strongly recommend enabling 2FA.</p>
                  </div>
                </div>
                <Button onClick={handleSetup}>
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Set Up 2FA
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={setupOpen} onOpenChange={(open) => !open && setSetupOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to verify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {qrCode && (
              <div className="flex justify-center">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 border rounded-lg" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Manual entry key</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{secret}</code>
                <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={copySecret}>
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Verification Code</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000 000"
                maxLength={7}
                value={verifyCode}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setVerifyCode(raw.length > 3 ? raw.slice(0, 3) + " " + raw.slice(3, 6) : raw);
                  setVerifyError("");
                }}
                className="text-center text-lg tracking-widest font-mono"
                autoFocus
              />
              {verifyError && <p className="text-xs text-destructive">{verifyError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupOpen(false)}>Cancel</Button>
            <Button onClick={handleEnable} disabled={verifyLoading}>
              {verifyLoading ? "Verifying..." : "Enable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={(open) => !open && setDisableOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-red-500" />
              Disable 2FA
            </DialogTitle>
            <DialogDescription>
              Enter your password to confirm disabling two-factor authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={disablePassword}
                onChange={(e) => { setDisablePassword(e.target.value); setDisableError(""); }}
                autoFocus
              />
              {disableError && <p className="text-xs text-destructive">{disableError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disableLoading || !disablePassword}>
              {disableLoading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
    </AdminAuthGate>
  );
}
