import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import {
  Users, Plus, Globe, Trash2, ExternalLink, RefreshCw,
  Instagram, Linkedin, Lock, TrendingUp, TrendingDown, Minus,
  ChevronDown, ChevronUp, Crown, Zap, Pencil, Check, X,
} from "lucide-react";

type Competitor = {
  id: number;
  sessionId: string | null;
  name: string;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  xHandle: string | null;
  linkedin: string | null;
  estimatedScore: number | null;
  websiteScore: number | null;
  socialScore: number | null;
  contentScore: number | null;
  reviewsScore: number | null;
  competitorScore: number | null;
  messagingScore: number | null;
  lastScannedAt: string | null;
  createdAt: string;
};

type PlanLimit = {
  limit: number;
  planId: string;
  current: number;
  canAdd: boolean;
};

const SCORE_COLOR = (score: number | null) => {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-green-600";
  if (score >= 55) return "text-amber-600";
  if (score >= 35) return "text-orange-600";
  return "text-red-600";
};
const SCORE_BG = (score: number | null) => {
  if (score === null) return "bg-muted";
  if (score >= 75) return "bg-green-500";
  if (score >= 55) return "bg-amber-500";
  if (score >= 35) return "bg-orange-500";
  return "bg-red-500";
};
const SCORE_LABEL = (score: number | null) => {
  if (score === null) return "Not scanned";
  if (score >= 75) return "Ad-Ready";
  if (score >= 55) return "Almost There";
  if (score >= 35) return "Getting There";
  return "Needs Work";
};

const DIMENSIONS = [
  { key: "websiteScore", label: "Website" },
  { key: "socialScore", label: "Social Media" },
  { key: "contentScore", label: "Content" },
  { key: "reviewsScore", label: "Reviews" },
  { key: "competitorScore", label: "Positioning" },
  { key: "messagingScore", label: "Messaging" },
] as const;

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

const emptyForm = {
  name: "", website: "", instagram: "", facebook: "", xHandle: "", linkedin: "",
};

export default function Competitors() {
  const sessionId = useSession();
  const { toast } = useToast();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();

  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [editForm, setEditForm] = useState({ ...emptyForm });

  const { data: planLimit } = useQuery<PlanLimit>({
    queryKey: ["competitor-limit", sessionId],
    queryFn: () => apiFetch<PlanLimit>("/user/competitors/limit"),
    enabled: !!sessionId,
  });

  const { data: competitors = [], isLoading } = useQuery<Competitor[]>({
    queryKey: ["competitors", sessionId],
    queryFn: () => apiFetch<Competitor[]>("/user/competitors"),
    enabled: !!sessionId,
  });

  const isFreePlan = planLimit?.planId === "free";
  const limitReached = planLimit ? !planLimit.canAdd : false;
  const canDelete = true;
  const canEdit = true;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["competitors"] });
    queryClient.invalidateQueries({ queryKey: ["competitors-for-ads"] });
    queryClient.invalidateQueries({ queryKey: ["competitor-limit"] });
  };

  const addMutation = useMutation({
    mutationFn: (data: typeof addForm) =>
      apiFetch<Competitor>("/user/competitors", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (created) => {
      invalidateAll();
      setAddForm({ ...emptyForm });
      setShowAdd(false);
      toast({ title: "Competitor added", description: `${created.name} has been added.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/user/competitors/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      const c = competitors.find((c) => c.id === id);
      invalidateAll();
      toast({ title: "Removed", description: `${c?.name ?? "Competitor"} removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof editForm }) =>
      apiFetch<Competitor>(`/user/competitors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Competitor[]>(
        ["competitors", sessionId],
        (old = []) => old.map((x) => x.id === updated.id ? updated : x)
      );
      queryClient.invalidateQueries({ queryKey: ["competitors-for-ads"] });
      setEditingId(null);
      toast({ title: "Updated", description: `${updated.name} has been updated.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const scanMutation = useMutation({
    mutationFn: (id: number) => apiFetch<Competitor>(`/user/competitors/${id}/scan`, { method: "POST" }),
    onSuccess: (updated) => {
      queryClient.setQueryData<Competitor[]>(
        ["competitors", sessionId],
        (old = []) => old.map((x) => x.id === updated.id ? updated : x)
      );
    },
    onError: (err: Error) => {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    },
  });

  const scoredCompetitors = competitors.filter(c => c.estimatedScore !== null);
  const avgScore = scoredCompetitors.length
    ? Math.round(scoredCompetitors.reduce((s, c) => s + (c.estimatedScore ?? 0), 0) / scoredCompetitors.length)
    : null;

  const yourPosition = scoredCompetitors.filter(c => (c.estimatedScore ?? 0) > (avgScore ?? 0)).length + 1;

  const CompetitorForm = ({ form, onChange }: { form: typeof emptyForm; onChange: (f: typeof emptyForm) => void }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Competitor Name <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={e => onChange({ ...form, name: e.target.value })} placeholder="e.g. Acme Corp" />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</Label>
        <Input value={form.website} onChange={e => onChange({ ...form, website: e.target.value })} placeholder="https://acme.com" />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5 text-pink-500" />Instagram</Label>
        <Input value={form.instagram} onChange={e => onChange({ ...form, instagram: e.target.value })} placeholder="@handle" />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><XIcon />X (Twitter)</Label>
        <Input value={form.xHandle} onChange={e => onChange({ ...form, xHandle: e.target.value })} placeholder="@handle" />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5 text-blue-600" />LinkedIn</Label>
        <Input value={form.linkedin} onChange={e => onChange({ ...form, linkedin: e.target.value })} placeholder="company URL or handle" />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><FacebookIcon />Facebook</Label>
        <Input value={form.facebook} onChange={e => onChange({ ...form, facebook: e.target.value })} placeholder="page name or URL" />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Competitors
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Track competitors to compare and benchmark against your brands
            </p>
          </div>
          <div className="flex gap-2 items-center">
            {planLimit && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {planLimit.current}/{planLimit.limit === 999 ? "∞" : planLimit.limit} used
              </span>
            )}
            {limitReached ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button size="sm" disabled className="gap-1.5">
                      <Lock className="h-3.5 w-3.5" /> Add Competitor
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to add more competitors</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button size="sm" className="gap-1.5" onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}>
                <Plus className="h-3.5 w-3.5" /> Add Competitor
              </Button>
            )}
          </div>
        </div>

        {/* Plan limit banner */}
        {isFreePlan && competitors.length >= 1 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Crown className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Free plan — 1 competitor maximum</p>
              <p className="text-xs text-amber-700 mt-0.5">Upgrade to track more competitors and run detailed comparisons.</p>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 gap-1.5 flex-shrink-0">
                <Zap className="h-3.5 w-3.5" /> Upgrade
              </Button>
            </Link>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> New Competitor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompetitorForm form={addForm} onChange={setAddForm} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!addForm.name.trim() || addMutation.isPending}
                  onClick={() => addMutation.mutate(addForm)}
                >
                  <Check className="h-3.5 w-3.5" /> {addMutation.isPending ? "Adding..." : "Add Competitor"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setAddForm({ ...emptyForm }); }}>
                  <X className="h-3.5 w-3.5" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary bar */}
        {competitors.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <p className="text-2xl font-extrabold tabular-nums">{competitors.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tracked</p>
            </Card>
            <Card className="p-3 text-center">
              <p className={`text-2xl font-extrabold tabular-nums ${SCORE_COLOR(avgScore)}`}>
                {avgScore ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Avg Score</p>
            </Card>
            <Card className="p-3 text-center">
              <p className="text-2xl font-extrabold tabular-nums">
                {scoredCompetitors.length > 0 ? `#${yourPosition}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">of {competitors.length + 1} tracked</p>
            </Card>
          </div>
        )}

        {/* Competitor list */}
        <div className="space-y-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          ) : competitors.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Users className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="font-medium">No competitors tracked yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Add competitors to track and benchmark them. Once added, select them in Competitor Analysis to compare.
                </p>
                <Button size="sm" className="mt-1 gap-1.5" onClick={() => setShowAdd(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add Your First Competitor
                </Button>
              </CardContent>
            </Card>
          ) : (
            competitors.map((c) => {
              const isExpanded = expandedId === c.id;
              const isEditing = editingId === c.id;
              const isScanning = scanMutation.isPending && scanMutation.variables === c.id;

              return (
                <Card key={c.id} className="overflow-hidden transition-shadow hover:shadow-md">
                  <CardContent className="p-0">
                    {/* Main row */}
                    {isEditing ? (
                      <div className="p-4 space-y-4">
                        <CompetitorForm form={editForm} onChange={setEditForm} />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            disabled={!editForm.name.trim() || editMutation.isPending}
                            onClick={() => editMutation.mutate({ id: c.id, data: editForm })}
                          >
                            <Check className="h-3.5 w-3.5" /> {editMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="h-3.5 w-3.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Score badge */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 text-white ${SCORE_BG(c.estimatedScore)}`}>
                            {c.estimatedScore ?? "?"}
                          </div>

                          {/* Name + details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold truncate">{c.name}</p>
                              <Badge variant="outline" className={`text-xs ${SCORE_COLOR(c.estimatedScore)}`}>
                                {SCORE_LABEL(c.estimatedScore)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                              {c.website && (
                                <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-0.5 hover:text-primary">
                                  <Globe className="h-3 w-3" /> {c.website.replace(/^https?:\/\//, "")}
                                </a>
                              )}
                              {c.instagram && <span className="flex items-center gap-0.5"><Instagram className="h-3 w-3" /> {c.instagram}</span>}
                              {c.xHandle && <span className="flex items-center gap-0.5"><XIcon /> {c.xHandle}</span>}
                              {c.linkedin && <span className="flex items-center gap-0.5"><Linkedin className="h-3 w-3" /> LinkedIn</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost" size="icon" className="h-8 w-8"
                                  onClick={() => scanMutation.mutate(c.id)}
                                  disabled={isScanning}
                                >
                                  <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Re-scan scores</TooltipContent>
                            </Tooltip>

                            {c.website && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>Open website</TooltipContent>
                              </Tooltip>
                            )}

                            {canEdit && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => {
                                      setEditingId(c.id);
                                      setExpandedId(null);
                                      setEditForm({
                                        name: c.name,
                                        website: c.website ?? "",
                                        instagram: c.instagram ?? "",
                                        facebook: c.facebook ?? "",
                                        xHandle: c.xHandle ?? "",
                                        linkedin: c.linkedin ?? "",
                                      });
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                            )}

                            {canDelete && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                    onClick={() => removeMutation.mutate(c.id)}
                                    disabled={removeMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Remove</TooltipContent>
                              </Tooltip>
                            )}

                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded scores */}
                    {isExpanded && !isEditing && (
                      <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score Breakdown</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {DIMENSIONS.map(({ key, label }) => {
                            const score = c[key as keyof Competitor] as number | null;
                            const prev = null;
                            const delta = prev !== null && score !== null ? score - prev : null;
                            return (
                              <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-background border">
                                <span className="text-xs text-muted-foreground">{label}</span>
                                <div className="flex items-center gap-1">
                                  {delta !== null && (
                                    delta > 0 ? <TrendingUp className="h-3 w-3 text-green-500" />
                                    : delta < 0 ? <TrendingDown className="h-3 w-3 text-red-500" />
                                    : <Minus className="h-3 w-3 text-muted-foreground" />
                                  )}
                                  <span className={`text-sm font-bold tabular-nums ${SCORE_COLOR(score)}`}>
                                    {score ?? "—"}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {c.lastScannedAt && (
                          <p className="text-xs text-muted-foreground">Last scanned: {new Date(c.lastScannedAt).toLocaleDateString()}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Link href="/competitor-analysis">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                              <TrendingUp className="h-3.5 w-3.5" /> Compare in Analysis
                            </Button>
                          </Link>
                          <Link href="/competitor-ads">
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                              <ExternalLink className="h-3.5 w-3.5" /> Check Ads
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Footer CTA */}
        {competitors.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <Link href="/competitor-analysis">
              <Button variant="outline" size="sm" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Run Competitor Analysis
              </Button>
            </Link>
            <Link href="/competitor-ads">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Competitor Ads Intelligence
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
