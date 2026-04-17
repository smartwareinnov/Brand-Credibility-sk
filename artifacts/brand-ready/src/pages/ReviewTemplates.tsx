import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Star, Sparkles, Copy, Check, MessageCircle, Mail, Instagram } from "lucide-react";
import { useBrandSelector } from "@/hooks/useBrandSelector";
import { BrandSelector } from "@/components/ui/BrandSelector";

const REVIEW_SITES = ["Google Business Profile", "Trustpilot", "G2", "Capterra", "Facebook", "Yelp"];

function TemplateSection({ title, icon: Icon, content }: { title: string; icon: React.ElementType; content: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split("\n");
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={copy} className="h-7 text-xs">
          {copied ? <><Check className="h-3 w-3 mr-1" />Copied</> : <><Copy className="h-3 w-3 mr-1" />Copy</>}
        </Button>
      </div>
      <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 font-sans bg-background">
        {content}
      </div>
    </div>
  );
}

function parseTemplates(raw: string): { whatsapp: string; email: string; dm: string } {
  const getSection = (tag: string) => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[(?:WHATSAPP|EMAIL|DM)\\]|$)`, "i");
    const match = raw.match(regex);
    return match ? match[1].trim() : "";
  };
  return {
    whatsapp: getSection("WHATSAPP"),
    email: getSection("EMAIL"),
    dm: getSection("DM"),
  };
}

export default function ReviewTemplates() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const { brands, selectedBrandId, setSelectedBrandId, hasMultipleBrands } = useBrandSelector();
  const [targetSite, setTargetSite] = useState("Google Business Profile");
  const [productService, setProductService] = useState("");
  const [result, setResult] = useState<{ content: string } | null>(null);

  const generateMutation = useMutation({
    mutationFn: () => apiFetch<{ content: string }>("/ai/review-templates", {
      method: "POST",
      body: JSON.stringify({ targetReviewSite: targetSite, productService, brandId: selectedBrandId }),
    }),
    onSuccess: (data) => { setResult(data); toast({ title: "Templates generated!" }); },
    onError: (err) => { toast({ variant: "destructive", title: "Generation failed", description: String(err) }); },
  });

  const templates = result ? parseTemplates(result.content) : null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="h-6 w-6 text-primary" />
            Review Request Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated WhatsApp, email, and DM templates to collect more reviews</p>
        </div>

        {hasMultipleBrands && (
          <div className="mb-5">
            <BrandSelector brands={brands} selectedBrandId={selectedBrandId} onSelect={(id) => { setSelectedBrandId(id); setResult(null); }} />
          </div>
        )}
            Review Request Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated WhatsApp, email, and DM templates to collect reviews that actually convert</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Target Review Platform</Label>
            <Select value={targetSite} onValueChange={setTargetSite}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEW_SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Product/Service (optional)</Label>
            <Input
              placeholder="e.g. brand analysis subscription"
              value={productService}
              onChange={e => setProductService(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending
                ? <><Sparkles className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                : <><Sparkles className="h-4 w-4 mr-2" />Generate Templates</>
              }
            </Button>
          </div>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
          <strong>Pro tip:</strong> Replace <code className="bg-blue-100 px-1 rounded">[REVIEW_LINK]</code> with your actual review link. Send within 48 hours of a positive customer experience for best results.
        </div>

        {generateMutation.isPending ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg overflow-hidden">
                <Skeleton className="h-10 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : templates ? (
          <div className="space-y-4">
            {templates.whatsapp && <TemplateSection title="WhatsApp Message" icon={MessageCircle} content={templates.whatsapp} />}
            {templates.email && <TemplateSection title="Email" icon={Mail} content={templates.email} />}
            {templates.dm && <TemplateSection title="DM / Direct Message" icon={Instagram} content={templates.dm} />}
            {result && !templates.whatsapp && !templates.email && !templates.dm && (
              <div className="border rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans">{result.content}</pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Generate your review templates</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Get ready-to-use WhatsApp, email, and DM scripts personalized for your brand — including follow-up versions
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
