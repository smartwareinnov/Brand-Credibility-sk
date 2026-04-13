import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Search, Sparkles, Copy, Check, Shield, Globe, Instagram, Linkedin } from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy Report</>}
    </Button>
  );
}

function parseSection(content: string, heading: string): string {
  const regex = new RegExp(`##\\s*\\d*\\.?\\s*${heading}[\\s\\S]*?\\n([\\s\\S]*?)(?=##|$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

export default function CompetitorStrategyDecoder() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [form, setForm] = useState({
    competitorName: "",
    competitorWebsite: "",
    competitorSocials: "",
    competitorDescription: "",
  });
  const [result, setResult] = useState<{ content: string; competitorName: string; userBrandName: string } | null>(null);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const decodeMutation = useMutation({
    mutationFn: () => apiFetch<{ content: string; competitorName: string; userBrandName: string }>("/ai/strategy-decode", {
      method: "POST",
      body: JSON.stringify(form),
    }),
    onSuccess: (data) => { setResult(data); toast({ title: "Strategy decoded!" }); },
    onError: (err) => { toast({ variant: "destructive", title: "Analysis failed", description: String(err) }); },
  });

  const SECTIONS = [
    "Brand Positioning Analysis",
    "Content Strategy",
    "Advertising Approach",
    "Target Audience Profile",
    "Strengths & Gaps",
    "Strategic Opportunities",
    "Competitive Threat Level",
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Competitor Strategy Decoder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Feed a competitor's profile into AI and get a plain-English breakdown of their entire marketing strategy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Competitor Details</CardTitle>
                <CardDescription className="text-xs">The more context you give, the sharper the analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Competitor Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Competitor Inc."
                    value={form.competitorName}
                    onChange={e => set("competitorName", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    <Globe className="h-3.5 w-3.5 inline mr-1" />Website URL
                  </Label>
                  <Input
                    placeholder="https://competitor.com"
                    value={form.competitorWebsite}
                    onChange={e => set("competitorWebsite", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    <Instagram className="h-3.5 w-3.5 inline mr-1" />Social Profiles
                  </Label>
                  <Input
                    placeholder="@handle, linkedin.com/company/xyz"
                    value={form.competitorSocials}
                    onChange={e => set("competitorSocials", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Additional Context (optional)</Label>
                  <Textarea
                    placeholder="Any specific observations about their ads, content, messaging, or positioning that you've noticed..."
                    value={form.competitorDescription}
                    onChange={e => set("competitorDescription", e.target.value)}
                    rows={4}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => decodeMutation.mutate()}
                  disabled={!form.competitorName.trim() || decodeMutation.isPending}
                >
                  {decodeMutation.isPending
                    ? <><Sparkles className="h-4 w-4 mr-2 animate-spin" />Decoding Strategy...</>
                    : <><Sparkles className="h-4 w-4 mr-2" />Decode Strategy</>
                  }
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {decodeMutation.isPending ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-64" />
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : result ? (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{result.competitorName} — Strategy Intelligence Report</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Competitive insights for {result.userBrandName}</CardDescription>
                  </div>
                  <CopyButton text={result.content} />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {SECTIONS.map(section => {
                      const sectionContent = parseSection(result.content, section);
                      if (!sectionContent) return null;
                      const isThreat = section.includes("Threat");
                      const isOpportunity = section.includes("Strategic Opportunities") || section.includes("Opportunities");
                      return (
                        <div key={section} className="border rounded-lg overflow-hidden">
                          <div className={`px-4 py-2.5 border-b text-sm font-semibold flex items-center gap-2 ${isThreat ? "bg-red-50 text-red-800" : isOpportunity ? "bg-green-50 text-green-800" : "bg-muted/50 text-foreground"}`}>
                            <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                            {section}
                          </div>
                          <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {sectionContent}
                          </div>
                        </div>
                      );
                    })}
                    {!SECTIONS.some(s => parseSection(result.content, s)) && (
                      <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans">{result.content}</pre>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Competitive intelligence on demand</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    Enter any competitor's details and get a complete breakdown of their brand positioning, content strategy, ad approach, and where you can beat them
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
