import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/lib/useApi";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Sparkles, Copy, Check, Shield, Globe,
  Instagram, Linkedin, Twitter, Facebook, ChevronRight,
} from "lucide-react";
import { useBrandSelector } from "@/hooks/useBrandSelector";
import { BrandSelector, BrandContextBadge } from "@/components/ui/BrandSelector";
import { cn } from "@/lib/utils";

interface SavedCompetitor {
  id: number;
  name: string;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  xHandle: string | null;
  linkedin: string | null;
  estimatedScore: number | null;
}

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

function CompetitorCard({
  competitor,
  selected,
  onSelect,
}: {
  competitor: SavedCompetitor;
  selected: boolean;
  onSelect: () => void;
}) {
  const socials = [
    competitor.instagram && { icon: Instagram, label: `@${competitor.instagram}`, color: "text-pink-500" },
    competitor.linkedin && { icon: Linkedin, label: "LinkedIn", color: "text-blue-600" },
    competitor.xHandle && { icon: Twitter, label: `@${competitor.xHandle}`, color: "text-sky-500" },
    competitor.facebook && { icon: Facebook, label: "Facebook", color: "text-blue-700" },
  ].filter(Boolean) as { icon: React.ElementType; label: string; color: string }[];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-150",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border hover:border-primary/40 hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm",
          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {competitor.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{competitor.name}</p>
            {competitor.estimatedScore != null && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Score: {Math.round(competitor.estimatedScore)}
              </Badge>
            )}
          </div>
          {competitor.website && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <Globe className="h-3 w-3 flex-shrink-0" />
              {competitor.website.replace(/^https?:\/\//, "")}
            </p>
          )}
          {socials.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {socials.map((s, i) => (
                <span key={i} className={cn("flex items-center gap-1 text-[11px]", s.color)}>
                  <s.icon className="h-3 w-3" />
                  {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        {selected && <ChevronRight className="h-4 w-4 text-primary flex-shrink-0 mt-1" />}
      </div>
    </button>
  );
}

export default function CompetitorStrategyDecoder() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const { brands, selectedBrandId, setSelectedBrandId, selectedBrand, hasMultipleBrands } = useBrandSelector();
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<number | null>(null);
  const [additionalContext, setAdditionalContext] = useState("");
  const [result, setResult] = useState<{ content: string; competitorName: string; userBrandName: string } | null>(null);

  // Fetch saved competitors
  const { data: competitors = [], isLoading: competitorsLoading } = useQuery<SavedCompetitor[]>({
    queryKey: ["competitors-list"],
    queryFn: () => apiFetch<SavedCompetitor[]>("/user/competitors"),
    staleTime: 60_000,
  });

  const selectedCompetitor = competitors.find(c => c.id === selectedCompetitorId) ?? null;

  const decodeMutation = useMutation({
    mutationFn: () => {
      if (!selectedCompetitor) throw new Error("No competitor selected");
      // Build social profiles string from saved data
      const socials = [
        selectedCompetitor.instagram && `Instagram: @${selectedCompetitor.instagram}`,
        selectedCompetitor.linkedin && `LinkedIn: ${selectedCompetitor.linkedin}`,
        selectedCompetitor.xHandle && `X/Twitter: @${selectedCompetitor.xHandle}`,
        selectedCompetitor.facebook && `Facebook: ${selectedCompetitor.facebook}`,
      ].filter(Boolean).join(", ");

      return apiFetch<{ content: string; competitorName: string; userBrandName: string }>("/ai/strategy-decode", {
        method: "POST",
        body: JSON.stringify({
          competitorName: selectedCompetitor.name,
          competitorWebsite: selectedCompetitor.website ?? "",
          competitorSocials: socials,
          competitorDescription: additionalContext,
          brandId: selectedBrandId,
        }),
      });
    },
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
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Search className="h-6 w-6 text-primary" />
            Competitor Strategy Decoder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select a saved competitor and get a complete AI breakdown of their marketing strategy
          </p>
        </div>

        {/* Brand selector */}
        {hasMultipleBrands ? (
          <div className="mb-5">
            <BrandSelector
              brands={brands}
              selectedBrandId={selectedBrandId}
              onSelect={(id) => { setSelectedBrandId(id); setResult(null); }}
            />
          </div>
        ) : selectedBrand ? (
          <div className="mb-5">
            <BrandContextBadge brand={selectedBrand} />
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: competitor selector */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Select Competitor</CardTitle>
                <CardDescription className="text-xs">
                  Choose from your saved competitors — all their details are pre-loaded
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {competitorsLoading ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
                ) : competitors.length === 0 ? (
                  <div className="text-center py-6">
                    <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No competitors saved yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add competitors on the Competitors page first
                    </p>
                  </div>
                ) : (
                  competitors.map(c => (
                    <CompetitorCard
                      key={c.id}
                      competitor={c}
                      selected={selectedCompetitorId === c.id}
                      onSelect={() => {
                        setSelectedCompetitorId(c.id);
                        setResult(null);
                      }}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {selectedCompetitor && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Additional Context</CardTitle>
                  <CardDescription className="text-xs">Optional — any specific observations you've made</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="e.g. They recently launched a new pricing page, their ads focus heavily on ROI, I've noticed they're targeting enterprise customers..."
                    value={additionalContext}
                    onChange={e => setAdditionalContext(e.target.value)}
                    rows={4}
                  />
                  <Button
                    className="w-full"
                    onClick={() => decodeMutation.mutate()}
                    disabled={decodeMutation.isPending}
                  >
                    {decodeMutation.isPending
                      ? <><Sparkles className="h-4 w-4 mr-2 animate-spin" />Decoding Strategy...</>
                      : <><Sparkles className="h-4 w-4 mr-2" />Decode {selectedCompetitor.name}</>
                    }
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: results */}
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
                    <CardTitle className="text-base">{result.competitorName} — Strategy Report</CardTitle>
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
                      const isOpportunity = section.includes("Strategic Opportunities");
                      return (
                        <div key={section} className="border rounded-lg overflow-hidden">
                          <div className={cn(
                            "px-4 py-2.5 border-b text-sm font-semibold flex items-center gap-2",
                            isThreat ? "bg-red-50 text-red-800" : isOpportunity ? "bg-green-50 text-green-800" : "bg-muted/50 text-foreground"
                          )}>
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
                  <h3 className="font-semibold text-lg mb-2">
                    {competitors.length === 0
                      ? "Add competitors to get started"
                      : "Select a competitor to decode their strategy"}
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {competitors.length === 0
                      ? "Go to the Competitors page to add your rivals, then come back here for a full strategy breakdown."
                      : "Pick a saved competitor on the left and get a complete breakdown of their brand positioning, content strategy, ad approach, and where you can beat them."}
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
