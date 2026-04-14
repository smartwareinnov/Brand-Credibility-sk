import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, BarChart3, CheckCircle2, Target, Zap,
  Star, Globe, Instagram, Search, TrendingUp, Shield,
  Users, Award, Rocket, Brain, LineChart, MessageSquare,
  ChevronDown, ChevronUp, Twitter, Linkedin, Youtube,
  Eye, Lock, RefreshCw, Layers
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const SESSION_KEY = "skorvia_session_id";

/* ─── FAQ data ─────────────────────────────────────────────────────────────── */
const faqs = [
  {
    q: "How does BrandReady calculate my Ad Readiness Score?",
    a: "We scan 8 data sources — your website, social profiles, review platforms, SEO signals, brand mentions, and competitor benchmarks — then weight each dimension to produce a 0–100 score. The higher your score, the more likely your ads will convert profitably.",
  },
  {
    q: "Do I need a paid plan to get my score?",
    a: "No. You can run a full brand analysis and see your score on the free plan. Paid plans unlock deeper competitor intelligence, AI coaching, unlimited analyses, and priority support.",
  },
  {
    q: "How long does an analysis take?",
    a: "Most analyses complete in under 3 minutes. Complex brands with many social channels may take up to 5 minutes.",
  },
  {
    q: "Can I track multiple brands?",
    a: "Yes. Pro and Agency plans support multiple brand profiles so you can monitor all your clients or product lines from one dashboard.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. We use industry-standard encryption in transit and at rest. We never sell your data to third parties.",
  },
];

/* ─── FAQ Item ──────────────────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-sm hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {q}
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t bg-muted/20">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

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

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-0 lg:pt-28">
          {/* subtle grid bg */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* gradient fade */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />

          <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-4xl mx-auto">
              <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1 text-xs font-semibold">
                <Zap className="w-3 h-3 text-primary" />
                BrandReady 2.0 — Now Live
              </Badge>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.06] text-balance">
                Know exactly when your brand is{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">
                  ready to scale
                </span>
                .
              </h1>

              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                An AI-powered Ad Readiness Score that scans 8 data sources, benchmarks your competitors, and gives you a step-by-step action plan — so you never waste budget on ads again.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 text-base shadow-lg gap-2">
                    Get Your Free Score
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base">
                    See All Features
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground mb-14">
                No credit card required · Results in under 3 minutes
              </p>
            </div>

            {/* Dashboard hero image */}
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-blue-500/10 to-primary/20 rounded-3xl blur-2xl opacity-60" />
              <div className="relative rounded-2xl border shadow-2xl overflow-hidden bg-card">
                <img
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80&auto=format&fit=crop"
                  alt="BrandReady analytics dashboard"
                  className="w-full object-cover object-top"
                  style={{ maxHeight: 480 }}
                />
                {/* overlay score card */}
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 bg-card/95 backdrop-blur border rounded-xl shadow-lg p-4 w-56">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 flex items-center justify-center bg-primary/5">
                      <span className="text-lg font-extrabold text-primary">74</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold">Ad Readiness</p>
                      <p className="text-[10px] text-muted-foreground">Almost ready to scale</p>
                    </div>
                  </div>
                  {[
                    { label: "Website", score: 82, color: "bg-green-500" },
                    { label: "Social Proof", score: 61, color: "bg-yellow-500" },
                    { label: "SEO", score: 74, color: "bg-blue-500" },
                  ].map((d) => (
                    <div key={d.label} className="mb-1.5">
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">{d.label}</span>
                        <span className="font-semibold">{d.score}</span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${d.color} rounded-full`} style={{ width: `${d.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* overlay insight pill */}
                <div className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-card/95 backdrop-blur border rounded-full shadow px-3 py-1.5 flex items-center gap-2 text-xs font-medium">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Live analysis running
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF BAR ─────────────────────────────────────────────── */}
        <section className="py-12 border-y bg-muted/20 mt-16">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
              Trusted by 2,000+ founders and marketing teams
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 opacity-60">
              {[
                { icon: Instagram, label: "Instagram" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Twitter, label: "X / Twitter" },
                { icon: Youtube, label: "YouTube" },
                { icon: Star, label: "Google Reviews" },
                { icon: Shield, label: "Trustpilot" },
                { icon: Globe, label: "Web Mentions" },
                { icon: TrendingUp, label: "SEO Signals" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm font-medium text-foreground/70">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {[
                { value: "2,000+", label: "Brands Analyzed", icon: BarChart3 },
                { value: "8", label: "Data Sources Scanned", icon: Search },
                { value: "3 min", label: "Average Analysis Time", icon: Zap },
                { value: "40%", label: "Avg. CPM Drop After Fix", icon: TrendingUp },
              ].map((s) => (
                <div key={s.label} className="text-center p-6 rounded-2xl bg-card border hover:border-primary/30 transition-colors">
                  <s.icon className="h-6 w-6 text-primary mx-auto mb-3" />
                  <p className="text-3xl font-extrabold mb-1">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────────── */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">Platform Features</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                Everything you need to build a brand that converts
              </h2>
              <p className="text-muted-foreground text-lg">
                Stop guessing why your ads aren't working. BrandReady gives you the full picture.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  icon: BarChart3,
                  title: "Ad Readiness Score",
                  desc: "A single 0–100 score that tells you exactly how ready your brand is to run profitable ads — with a breakdown across 8 dimensions.",
                  color: "text-blue-500 bg-blue-500/10",
                },
                {
                  icon: Target,
                  title: "Competitor Benchmarking",
                  desc: "See how your brand stacks up against up to 3 competitors across every trust signal, so you know exactly where to close the gap.",
                  color: "text-purple-500 bg-purple-500/10",
                },
                {
                  icon: Brain,
                  title: "AI Brand Coach",
                  desc: "Get personalized, AI-generated recommendations tailored to your industry, audience, and current score — not generic advice.",
                  color: "text-pink-500 bg-pink-500/10",
                },
                {
                  icon: LineChart,
                  title: "Score Tracker",
                  desc: "Track your brand health over time. See how each action you take moves the needle and celebrate your progress.",
                  color: "text-green-500 bg-green-500/10",
                },
                {
                  icon: MessageSquare,
                  title: "Brand Mentions Monitor",
                  desc: "Stay on top of what people are saying about your brand across the web — and respond before it affects your reputation.",
                  color: "text-amber-500 bg-amber-500/10",
                },
                {
                  icon: Rocket,
                  title: "Prioritized Action Plan",
                  desc: "A step-by-step roadmap filtered by Content, Social, PR, and SEO — so your team always knows what to work on next.",
                  color: "text-red-500 bg-red-500/10",
                },
              ].map((f) => (
                <div key={f.title} className="bg-card border rounded-2xl p-6 hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                From sign-up to action plan in minutes
              </h2>
              <p className="text-muted-foreground text-lg">No setup. No integrations. Just results.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
              {/* connector line */}
              <div className="hidden md:block absolute top-10 left-1/3 right-1/3 h-px bg-border" />

              {[
                {
                  step: "01",
                  icon: Users,
                  title: "Create Your Account",
                  desc: "Sign up free in 30 seconds. No credit card, no setup fees. Just your email and you're in.",
                  img: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80&auto=format&fit=crop",
                },
                {
                  step: "02",
                  icon: Search,
                  title: "Run Your Analysis",
                  desc: "Enter your brand URL and social handles. We scan 8 sources and benchmark against your top competitors.",
                  img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80&auto=format&fit=crop",
                },
                {
                  step: "03",
                  icon: CheckCircle2,
                  title: "Execute the Plan",
                  desc: "Get your score, see exactly what's holding you back, and follow a prioritized roadmap to fix it.",
                  img: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80&auto=format&fit=crop",
                },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border shadow-sm">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE SPOTLIGHT ────────────────────────────────────────────── */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4 max-w-6xl">
            {/* Row 1 */}
            <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
              <div>
                <Badge variant="secondary" className="mb-4">Competitor Intelligence</Badge>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  See exactly where rivals are beating you
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  BrandReady pulls live data on up to 3 competitors and overlays their trust signals against yours. Spot the gaps, prioritize the fixes, and close the distance — before you spend a dollar on ads.
                </p>
                <ul className="space-y-3">
                  {[
                    "Side-by-side score comparison",
                    "Review volume & rating benchmarks",
                    "Social following & engagement gaps",
                    "SEO authority comparison",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl overflow-hidden border shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&q=80&auto=format&fit=crop"
                  alt="Competitor analysis charts"
                  className="w-full object-cover"
                  style={{ maxHeight: 340 }}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 rounded-2xl overflow-hidden border shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80&auto=format&fit=crop"
                  alt="AI brand coaching interface"
                  className="w-full object-cover"
                  style={{ maxHeight: 340 }}
                />
              </div>
              <div className="order-1 md:order-2">
                <Badge variant="secondary" className="mb-4">AI Brand Coach</Badge>
                <h2 className="text-3xl font-bold tracking-tight mb-4">
                  Your personal growth strategist, on demand
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Ask anything about your brand strategy and get instant, context-aware answers powered by your actual score data. No generic advice — every recommendation is tailored to your brand, industry, and goals.
                </p>
                <ul className="space-y-3">
                  {[
                    "Trained on your brand's real data",
                    "Industry-specific recommendations",
                    "Content, PR, SEO & social guidance",
                    "Available 24/7, no waiting",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14 max-w-2xl mx-auto">
              <Badge variant="secondary" className="mb-4">Customer Stories</Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                Founders who fixed their brand before burning budget
              </h2>
              <p className="text-muted-foreground">Real results from real teams.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[
                {
                  quote: "BrandReady caught that our checkout flow was killing trust before we burned our $10k ad budget. Fixing it doubled our conversion rate.",
                  author: "Sarah J.",
                  role: "Founder, Bloom & Co",
                  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&auto=format&fit=crop&crop=face",
                  stars: 5,
                },
                {
                  quote: "It's like having a senior growth marketer review your whole setup in 3 minutes. The prioritized action plan is exactly what I needed.",
                  author: "David M.",
                  role: "CEO, TechStack",
                  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&auto=format&fit=crop&crop=face",
                  stars: 5,
                },
                {
                  quote: "We went from a score of 48 to 79 in 6 weeks by just following the roadmap. Our CPM dropped 40% once the brand was stronger.",
                  author: "Jake T.",
                  role: "DTC Brand Owner",
                  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80&auto=format&fit=crop&crop=face",
                  stars: 5,
                },
                {
                  quote: "The competitor benchmarking alone is worth it. We could see exactly where our rivals were beating us on trust signals.",
                  author: "Amara O.",
                  role: "Co-founder, GrowAfrika",
                  avatar: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&q=80&auto=format&fit=crop&crop=face",
                  stars: 5,
                },
                {
                  quote: "I used to spend hours manually checking competitors. Now I get a full report in minutes. It's become a core part of our monthly review.",
                  author: "Priya K.",
                  role: "Head of Growth, Nexus",
                  avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&q=80&auto=format&fit=crop&crop=face",
                  stars: 5,
                },
                {
                  quote: "The AI coach gave us a content strategy that actually aligned with our score gaps. We saw a 3x increase in organic reach within a month.",
                  author: "Marcus L.",
                  role: "Marketing Director",
                  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&q=80&auto=format&fit=crop&crop=face",
                  stars: 5,
                },
              ].map((t, i) => (
                <div key={i} className="p-6 rounded-2xl bg-card border flex flex-col">
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.stars)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-5 text-foreground/90 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar}
                      alt={t.author}
                      className="w-10 h-10 rounded-full object-cover border"
                    />
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

        {/* ── TRUST / WHY US ───────────────────────────────────────────────── */}
        <section className="py-20 bg-muted/20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Why BrandReady</Badge>
              <h2 className="text-3xl font-bold tracking-tight">Built for brands that take growth seriously</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Eye, title: "Full Transparency", desc: "See exactly how every sub-score is calculated. No black boxes." },
                { icon: Lock, title: "Privacy First", desc: "Your data is encrypted and never sold. You own it, always." },
                { icon: RefreshCw, title: "Always Up-to-Date", desc: "Re-run your analysis anytime. Track progress week over week." },
                { icon: Layers, title: "All-in-One Platform", desc: "Score, coach, competitor intel, and action plan — one dashboard." },
              ].map((item) => (
                <div key={item.title} className="bg-card border rounded-2xl p-5 text-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────────── */}
        <section className="py-24">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">FAQ</Badge>
              <h2 className="text-3xl font-bold tracking-tight mb-3">Frequently asked questions</h2>
              <p className="text-muted-foreground">Everything you need to know before getting started.</p>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-blue-600 to-primary/80" />
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="container relative z-10 mx-auto px-4 text-center text-white">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
              Free to start
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-5 max-w-2xl mx-auto">
              Stop guessing. Start scaling.
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-xl mx-auto leading-relaxed">
              Get your Ad Readiness Score in minutes — and a clear roadmap to fix what's holding your brand back.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="h-13 px-10 text-base font-bold gap-2">
                  Create Free Account <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-13 px-10 text-base border-white/30 text-white hover:bg-white/10">
                  View Pricing
                </Button>
              </Link>
            </div>
            <p className="text-xs text-white/60 mt-5">No credit card required · Cancel anytime</p>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
