import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  BarChart3, CheckCircle2, Globe, Instagram, Linkedin, Search,
  Star, Target, TrendingUp, Zap, Shield, Clock, ArrowRight, MessageSquare
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Ad Readiness Score",
    description: "A single 0–100 score that tells you exactly how ready your brand is to run paid ads profitably. No guesswork.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Globe,
    title: "Website Analysis",
    description: "We scan your site for trust signals, page speed, SSL, checkout flow, and UX signals that affect ad conversion rates.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Instagram,
    title: "Instagram & Social Audit",
    description: "Evaluate follower count, engagement rate, content consistency, and posting frequency across your social channels.",
    color: "text-pink-500",
    bg: "bg-pink-500/10",
  },
  {
    icon: Linkedin,
    title: "LinkedIn Company Profile",
    description: "Analyze your LinkedIn presence — employee count, page completeness, post frequency, and B2B trust signals.",
    color: "text-sky-500",
    bg: "bg-sky-500/10",
  },
  {
    icon: Star,
    title: "Review & Trust Score",
    description: "Aggregates your Trustpilot and Google Reviews scores to show how real customers perceive your brand online.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  {
    icon: Search,
    title: "SEO & Brand Mentions",
    description: "Tracks your Google Alerts mentions and SEMrush SEO health — because organic authority directly lifts ad quality scores.",
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    icon: Target,
    title: "Competitor Benchmarking",
    description: "Ranked side-by-side comparison of your brand vs. up to 3 competitors across all credibility dimensions.",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: CheckCircle2,
    title: "Prioritized Action Roadmap",
    description: "AI-generated task list filtered by Content, Social, PR, and SEO — ordered by impact so you fix what matters most first.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Clock,
    title: "Daily Action Plan",
    description: "Pro subscribers get a fresh daily micro-task every morning — building brand credibility one step at a time.",
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    icon: TrendingUp,
    title: "Score Trend Tracking",
    description: "Watch your Ad Readiness Score improve over time with sparkline history and month-over-month trend analysis.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: MessageSquare,
    title: "Insight Explanations",
    description: "Every finding comes with a plain-English explanation of why it matters and what it means for your ad performance.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your brand data is never sold or shared. Analyses run in isolated environments and results are only visible to you.",
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
];

export default function Features() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="pt-24 pb-16 text-center">
          <div className="container mx-auto px-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold bg-secondary text-secondary-foreground mb-6">
              <Zap className="h-3 w-3 text-primary" />
              Full Feature List
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-3xl mx-auto">
              Everything you need to build a brand that converts
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              BrandReady combines 8 data sources and AI analysis into one clear score and action plan — so you know exactly what to fix before spending on ads.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="h-12 px-8">
                  Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="h-12 px-8">View Pricing</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <div key={i} className="bg-card border rounded-xl p-6 hover:border-primary/40 transition-colors">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                    <f.icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to see it in action?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Create a free account and run your first brand analysis in under 3 minutes.</p>
            <Link href="/register">
              <Button size="lg" className="h-12 px-10">
                Start Free Analysis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
