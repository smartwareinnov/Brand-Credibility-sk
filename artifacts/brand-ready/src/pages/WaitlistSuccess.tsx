import { Link } from "wouter";
import { CheckCircle2, Mail, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";

export default function WaitlistSuccess() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">

          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-3">
            You're on the list! 🎉
          </h1>

          <p className="text-muted-foreground text-base leading-relaxed mb-2">
            Thank you for joining our waitlist.
          </p>
          <p className="text-muted-foreground text-base leading-relaxed mb-8">
            You'll be among the <span className="font-semibold text-foreground">first to be notified</span> when we launch — keep an eye on your inbox.
          </p>

          <div className="bg-card border rounded-2xl p-6 mb-8 text-left space-y-4">
            <p className="text-sm font-semibold text-foreground">What happens next?</p>
            <div className="space-y-3">
              {[
                {
                  icon: Mail,
                  title: "Check your email",
                  desc: "We've noted your details and will reach out directly.",
                },
                {
                  icon: Bell,
                  title: "Early access invitation",
                  desc: "Waitlist members get first access before public launch.",
                },
                {
                  icon: ArrowRight,
                  title: "Hit the ground running",
                  desc: "Your brand readiness journey starts the moment we open up.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button asChild variant="outline" className="w-full h-11">
            <Link href="/">Back to Homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
