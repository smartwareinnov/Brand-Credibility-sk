import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/lib/useApi";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, Sparkles, Copy, Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  "Nigeria", "Kenya", "Ghana", "South Africa", "United States", "United Kingdom",
  "Canada", "Australia", "India", "UAE", "Global",
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
      {copied ? <><Check className="h-3.5 w-3.5 mr-1.5" />Copied</> : <><Copy className="h-3.5 w-3.5 mr-1.5" />Copy All</>}
    </Button>
  );
}

export default function PressReleaseBuilder() {
  const { apiFetch } = useApi();
  const { toast } = useToast();
  const [form, setForm] = useState({ what: "", who: "", why: "", quote: "", contact: "", country: "Global" });
  const [result, setResult] = useState<{ content: string; brandName: string } | null>(null);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const generateMutation = useMutation({
    mutationFn: () => apiFetch<{ content: string; brandName: string }>("/ai/press-release", {
      method: "POST",
      body: JSON.stringify(form),
    }),
    onSuccess: (data) => { setResult(data); toast({ title: "Press release generated!" }); },
    onError: (err) => { toast({ variant: "destructive", title: "Generation failed", description: String(err) }); },
  });

  const isComplete = form.what.trim() && form.who.trim() && form.why.trim();

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-primary" />
            Press Release Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Fill in 5 fields and get a publication-ready press release + 15 journalist targets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Story</CardTitle>
                <CardDescription className="text-xs">5 fields is all it takes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    What did you build / announce? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="e.g. We launched a new AI-powered brand scoring platform that tells founders if their brand is ready for paid ads"
                    value={form.what}
                    onChange={e => set("what", e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Who is it for? <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. African e-commerce founders and bootstrapped SaaS startups"
                    value={form.who}
                    onChange={e => set("who", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">
                    Why does it matter? <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    placeholder="e.g. 80% of founders waste their first ad budget because their brand isn't credible enough to convert traffic"
                    value={form.why}
                    onChange={e => set("why", e.target.value)}
                    rows={3}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Quote (optional)</Label>
                  <Textarea
                    placeholder={`e.g. "We built BrandReady because we've seen too many founders burn cash on ads before their brand was ready." — Founder Name, CEO`}
                    value={form.quote}
                    onChange={e => set("quote", e.target.value)}
                    rows={2}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Press Contact Email</Label>
                  <Input
                    type="email"
                    placeholder="press@yourbrand.com"
                    value={form.contact}
                    onChange={e => set("contact", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold mb-1.5 block">Target Country/Region</Label>
                  <Select value={form.country} onValueChange={v => set("country", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || !isComplete}
                >
                  {generateMutation.isPending
                    ? <><Sparkles className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                    : <><Sparkles className="h-4 w-4 mr-2" />Generate Press Release</>
                  }
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {generateMutation.isPending ? (
              <Card>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-48 w-full mt-4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ) : result ? (
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Press Release + Journalist Targets</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{result.brandName} — ready to send</CardDescription>
                  </div>
                  <CopyButton text={result.content} />
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap leading-relaxed font-sans bg-muted/30 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                    {result.content}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Newspaper className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Publication-ready in minutes</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    Fill in the form and get a complete press release plus 15 targeted journalist contacts filtered by your industry and country
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
