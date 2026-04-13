import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useVerifyPayment } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markPlanSelected } from "@/hooks/useSession";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const verifyPayment = useVerifyPayment();
  
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const verify = async () => {
      const params = new URLSearchParams(searchString);
      const statusParam = params.get("status");
      const txRef = params.get("tx_ref");
      const transactionId = params.get("transaction_id");

      if (statusParam === "successful" && txRef && transactionId) {
        try {
          const res = await verifyPayment.mutateAsync({
            data: {
              transactionId,
              txRef
            }
          });
          
          const result = (res as any).data || res;
          
          if (result.success) {
            markPlanSelected();
            setStatus("success");
            setMessage("Payment verified successfully. Welcome to Premium!");
            setTimeout(() => {
              setLocation("/dashboard");
            }, 3000);
          } else {
            setStatus("error");
            setMessage(result.message || "Payment verification failed.");
          }
        } catch (err: any) {
          setStatus("error");
          setMessage(err.message || "An error occurred during verification.");
        }
      } else if (statusParam === "cancelled") {
        setStatus("error");
        setMessage("Payment was cancelled.");
      } else {
        setStatus("error");
        setMessage("Invalid payment callback parameters.");
      }
    };

    verify();
  }, [searchString, verifyPayment, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="max-w-md w-full bg-card border rounded-2xl shadow-sm p-8 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-8">{message}</p>
            <Button onClick={() => setLocation("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
            <p className="text-muted-foreground mb-8">{message}</p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setLocation("/pricing")} className="flex-1">
                Try Again
              </Button>
              <Button onClick={() => setLocation("/dashboard")} className="flex-1">
                Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}