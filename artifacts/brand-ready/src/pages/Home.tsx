import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, BarChart3, CheckCircle2, Target, Zap,
  Star, Globe, Instagram, Search, TrendingUp, Shield
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const SESSION_KEY = "skorvia_session_id";

export default function Home() {
  const [, navigate] = useLocation();

  useEffect(() => {
    if (localStorage.getItem(SESSION_KEY)) {
      navigate("/dashboard");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-36">
          <div className="absolute inset-0 bg-grid-slate-900/[0.03] bg-[bottom_1px_center]" style={{ maskImage: "linear-gradient(to bottom, transparent, black)" }} />
          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold bg-secondary text-secondary-foreground mb-8 gap-1.5">
              <Zap className="w-3 h-3 text-primary" />
              BrandReady 2.0 — Now Live
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto leading-[1.08] text-balance">
              Know exactly when your brand is{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">ready to scale</span>.
            </h1>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              An AI-powered Ad Readiness Score that scans 8 data sources, benchmarks your competitors, and gives you a step-by-step action plan — so you never waste budget on ads again.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="h-13 px-8 text-base shadow-lg gap-2">
                  Get Your Free Score
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="h-13 px-8 text-base">
                  See All Features
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-5">
              No credit card required · Results in under 3 minutes
            </p>

            {/* Score preview card */}
            <div className="mt-16 max-w-2xl mx-auto">
              <div className="bg-card border rounded-2xl shadow-xl p-6 sm:p-8 text-left">
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex-shrink-0 text-center">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center bg-primary/5">
                      <span className="text-3xl font-extrabold text-primary">74</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">Ad Readiness Score</p>
                  </div>
                  <div className="flex-1 space-y-3 w-full">
                    {[
                      { label: "Website Experience", score: 82, color: "bg-green-500" },
                      { label: "Social Proof", score: 61, color: "bg-yellow-500" },
                      { label: "SEO & Mentions", score: 74, color: "bg-blue-500" },
                      { label: "Customer Reviews", score: 55, color: "bg-orange-500" },
                    ].map((dim) => (
                      <div key={dim.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{dim.label}</span>
                          <span className="font-semibold">{dim.score}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${dim.color} rounded-full`} style={{ width: `${dim.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Top fix:</strong> Add 15+ Google Reviews and your score jumps to 83 — moving you into "Ready for Ads" tier.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="py-14 border-y bg-muted/20">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
              We scan data from 8 sources so you don't have to
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {[
                { icon: Search, label: "SEMrush" },
                { icon: Instagram, label: "Instagram" },
                { icon: Target, label: "LinkedIn" },
                { icon: Star, label: "Google Reviews" },
                { icon: Shield, label: "Trustpilot" },
                { icon: Globe, label: "Google Alerts" },
                { icon: BarChart3, label: "Competitors" },
                { icon: TrendingUp, label: "SEO signals" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 text-sm font-medium">
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">How BrandReady Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Stop guessing. Get a data-driven action plan in 3 minutes.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 relative">
              {[
                { step: "01", title: "Create Your Account", desc: "Sign up free, confirm your email, and log in. No credit card needed.", icon: Zap },
                { step: "02", title: "Run Your Analysis", desc: "Enter your brand details and we scan 8 sources across website, social, reviews, and SEO.", icon: BarChart3 },
                { step: "03", title: "Execute the Plan", desc: "Get your score, competitor benchmarks, and a prioritized roadmap filtered by Content, Social, PR, and SEO.", icon: CheckCircle2 },
              ].map((item, i) => (
                <div key={i} className="relative bg-card p-8 rounded-2xl border shadow-sm flex flex-col items-center text-center hover:border-primary/40 transition-colors">
                  <div className="absolute -top-4 -right-4 w-10 h-10 bg-background border rounded-full flex items-center justify-center font-bold text-muted-foreground text-sm shadow-sm">
                    {item.step}
                  </div>
                  <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <item.icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl font-bold tracking-tight mb-3">Trusted by Ambitious Founders</h2>
              <p className="text-muted-foreground">Real results from founders who fixed their brand before burning ad budget.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {[
                {
                  quote: "BrandReady caught that our checkout flow was killing trust before we burned our $10k ad budget. Fixing it doubled our conversion rate.",
                  author: "Sarah J.", role: "Founder, Bloom & Co"
                },
                {
                  quote: "It's like having a senior growth marketer review your whole setup in 3 minutes. The prioritized action plan is exactly what I needed.",
                  author: "David M.", role: "CEO, TechStack"
                },
                {
                  quote: "The competitor benchmarking alone is worth it. We could see exactly where our rivals were beating us on trust signals.",
                  author: "Amara O.", role: "Co-founder, GrowAfrika"
                },
                {
                  quote: "We went from a score of 48 to 79 in 6 weeks by just following the roadmap. Our CPM dropped 40% once the brand was stronger.",
                  author: "Jake T.", role: "DTC Brand Owner"
                },
              ].map((t, i) => (
                <div key={i} className="p-6 rounded-2xl bg-card border">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm leading-relaxed mb-5 text-foreground/90">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                      {t.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-5">Ready to stop guessing?</h2>
            <p className="text-xl text-primary-foreground/80 mb-10 max-w-xl mx-auto">
              Get your Ad Readiness Score in minutes — and a clear roadmap to fix what's holding you back.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="h-14 px-10 text-lg font-bold gap-2">
                  Create Free Account <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-14 px-10 text-lg border-white/30 text-white hover:bg-white/10">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
