import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { FileText, Share2, Megaphone, Mail, ImageIcon, Sparkles, Copy, Check, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandSelector } from "@/hooks/useBrandSelector";
import { BrandSelector, BrandContextBadge } from "@/components/ui/BrandSelector";

type ContentType = "blog" | "social" | "ad" | "email";

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ElementType; description: string }[] = [
  { value: "blog", label: "Blog Post", icon: FileText, description: "SEO-optimized outline + 300-word draft" },
  { value: "social", label: "Social Media", icon: Share2, description: "3 platform variations (LinkedIn, Twitter, Instagram)" },
  { value: "ad", label: "Ad Copy", icon: Megaphone, description: "3 direct-response ad variations" },
  { value: "email", label: "Email", icon: Mail, description: "Full marketing email with subject line" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy</>}
    </Button>
  );
}

export default function ContentGenerator() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const { brands, selectedBrandId, setSelectedBrandId, selectedBrand, hasMultipleBrands } = useBrandSelector();
  const [activeTab, setActiveTab] = useState<ContentType>("blog");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [includeImage, setIncludeImage] = useState(false);
  const [result, setResult] = useState<{ content: string; imageUrl?: string | null; type: string } | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => apiFetch<{ content: string; imageUrl?: string | null; type: string }>("/ai/content/generate", {
      method: "POST",
      body: JSON.stringify({ type: activeTab, topic, tone, includeImage, brandId: selectedBrandId }),
    }),
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Content generated!" });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Generation failed", description: String(err) });
    },
  });

  const currentType = CONTENT_TYPES.find(t => t.value === activeTab);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" />
            AI Content Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Generate brand-specific content using AI — blog posts, social media, ads, and emails</p>
        </div>

        {hasMultipleBrands && (
          <div className="mb-5">
            <BrandSelector brands={brands} selectedBrandId={selectedBrandId} onSelect={(id) => { setSelectedBrandId(id); setResult(null); }} />
          </div>
        )}
        {!hasMultipleBrands && selectedBrand && (
          <div className="mb-5">
            <BrandContextBadge brand={selectedBrand} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Content Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {CONTENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => { setActiveTab(t.value); setResult(null); }}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left",
                      activeTab === t.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    )}
                  >
                    <t.icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", activeTab === t.value ? "text-primary" : "text-muted-foreground")} />
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Topic / Angle</Label>
                  <Input
                    placeholder={`e.g. ${activeTab === "blog" ? "how to validate your brand before running ads" : activeTab === "social" ? "our brand story and mission" : activeTab === "ad" ? "our core product benefits" : "our latest feature launch"}`}
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="bold">Bold & Direct</SelectItem>
                      <SelectItem value="friendly">Friendly & Warm</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="inspiring">Inspiring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(activeTab === "blog" || activeTab === "social") && (
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium">Generate Image</Label>
                      <p className="text-xs text-muted-foreground">AI-generated visual for this content</p>
                    </div>
                    <Switch checked={includeImage} onCheckedChange={setIncludeImage} />
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  {generateMutation.isPending ? (
                    <><Sparkles className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Generate {currentType?.label}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {generateMutation.isPending ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ) : result ? (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{currentType?.label} Content</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Generated based on your brand profile</CardDescription>
                  </div>
                  <CopyButton text={result.content} />
                </CardHeader>
                <CardContent>
                  {result.imageUrl && (
                    <div className="mb-4">
                      <img
                        src={result.imageUrl.startsWith("data:") ? result.imageUrl : result.imageUrl}
                        alt="AI-generated content image"
                        className="w-full rounded-lg border object-cover max-h-64"
                      />
                    </div>
                  )}
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                    {result.content}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Wand2 className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">Ready to generate</h3>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Select a content type, add a topic, and let AI create brand-specific content for you
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
