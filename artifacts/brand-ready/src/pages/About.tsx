import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Target, Zap, Users } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="pt-24 pb-16 text-center">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold bg-secondary text-secondary-foreground mb-6">
              <Users className="h-3 w-3 text-primary" />
              About Skorvia
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Built by founders, for founders
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              We've watched too many ambitious founders burn their ad budgets on campaigns that were doomed from the start — not because the product was bad, but because the brand wasn't ready.
            </p>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">The problem we're solving</h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>Running paid ads without a credible brand is like pouring water into a leaky bucket. The traffic arrives but doesn't convert — because visitors don't trust what they see.</p>
                  <p>Most founders only discover this after spending thousands of dollars. Skorvia was built to catch those problems <em>before</em> you spend.</p>
                  <p>We scan your brand across 8 data sources — website, social channels, reviews, SEO, and competitors — and give you a single score with a clear action plan.</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { icon: Target, title: "Our Mission", text: "Make brand credibility auditing accessible to every founder, not just those who can afford a $10k agency retainer." },
                  { icon: Zap, title: "Our Approach", text: "Automate what used to take days of manual research into a 2-minute AI-powered scan with instant, actionable results." },
                  { icon: Users, title: "Our Users", text: "Startup founders, e-commerce store owners, coaches, consultants, and agency owners across Africa, Europe, and North America." },
                ].map((item, i) => (
                  <div key={i} className="bg-card border rounded-xl p-5 flex gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold mb-10 text-center">Our values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: "Transparency", desc: "We explain every score and every recommendation in plain English. No black boxes." },
                { title: "Actionability", desc: "Insights without action steps are useless. Every finding comes with a concrete next step." },
                { title: "Accessibility", desc: "We price for founders at every stage — from bootstrap to scale-up — with plans in local currencies." },
              ].map((v, i) => (
                <div key={i} className="text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-primary font-bold text-lg">{i + 1}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                  <p className="text-muted-foreground text-sm">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to know your score?</h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">Join thousands of founders who've used Skorvia to stop guessing and start growing.</p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-12 px-10">
                Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
