import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import { useApi } from "@/lib/useApi";
import {
  Briefcase, Plus, Globe, Instagram, Linkedin, Trash2,
  Crown, Zap, Pencil, X, Check, Lock,
} from "lucide-react";

type UserBrand = {
  id: number;
  brandName: string;
  websiteUrl: string | null;
  industry: string | null;
  instagramHandle: string | null;
  facebookUrl: string | null;
  xHandle: string | null;
  linkedinUrl: string | null;
  isDefault: boolean;
  createdAt: string;
};

type PlanLimit = {
  planId: string;
  canAdd: boolean;
};

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const GROWTH_PLANS = ["growth-monthly", "growth-yearly"];

const emptyForm = {
  brandName: "", websiteUrl: "", industry: "",
  instagramHandle: "", facebookUrl: "", xHandle: "", linkedinUrl: "",
};

type BrandForm = typeof emptyForm;

function BrandFormFields({ form, onChange }: { form: BrandForm; onChange: (f: BrandForm) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Brand Name <span className="text-destructive">*</span></Label>
        <Input
          value={form.brandName}
          onChange={(e) => onChange({ ...form, brandName: e.target.value })}
          placeholder="e.g. Acme Corp"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />Website</Label>
        <Input
          value={form.websiteUrl}
          onChange={(e) => onChange({ ...form, websiteUrl: e.target.value })}
          placeholder="https://acme.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Industry</Label>
        <Input
          value={form.industry}
          onChange={(e) => onChange({ ...form, industry: e.target.value })}
          placeholder="e.g. Fintech"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5 text-pink-500" />Instagram</Label>
        <Input
          value={form.instagramHandle}
          onChange={(e) => onChange({ ...form, instagramHandle: e.target.value })}
          placeholder="@handle"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><XIcon />X (Twitter)</Label>
        <Input
          value={form.xHandle}
          onChange={(e) => onChange({ ...form, xHandle: e.target.value })}
          placeholder="@handle"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Linkedin className="h-3.5 w-3.5 text-blue-600" />LinkedIn</Label>
        <Input
          value={form.linkedinUrl}
          onChange={(e) => onChange({ ...form, linkedinUrl: e.target.value })}
          placeholder="company URL or handle"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Facebook</Label>
        <Input
          value={form.facebookUrl}
          onChange={(e) => onChange({ ...form, facebookUrl: e.target.value })}
          placeholder="page name or URL"
        />
      </div>
    </div>
  );
}

export default function MyBrands() {
  const sessionId = useSession();
  const { toast } = useToast();
  const { apiFetch } = useApi();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addForm, setAddForm] = useState<BrandForm>({ ...emptyForm });
  const [editForm, setEditForm] = useState<BrandForm>({ ...emptyForm });

  const { data: planLimit } = useQuery<PlanLimit>({
    queryKey: ["competitor-limit", sessionId],
    queryFn: () => apiFetch<PlanLimit>("/user/competitors/limit"),
    enabled: !!sessionId,
  });

  const isGrowth = GROWTH_PLANS.includes(planLimit?.planId ?? "free");
  const isFreePlan = !isGrowth && (planLimit?.planId === "free" || !planLimit);

  const { data: brands = [], isLoading } = useQuery<UserBrand[]>({
    queryKey: ["user-brands", sessionId],
    queryFn: () => apiFetch<UserBrand[]>("/user/brands"),
    enabled: !!sessionId,
  });

  const canAddMore = isGrowth || brands.length === 0;

  const addMutation = useMutation({
    mutationFn: (data: BrandForm) =>
      apiFetch<UserBrand>("/user/brands", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-brands"] });
      setAddForm({ ...emptyForm });
      setShowAdd(false);
      toast({ title: "Brand added", description: "Your new brand has been created." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BrandForm }) =>
      apiFetch<UserBrand>(`/user/brands/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-brands"] });
      setEditingId(null);
      toast({ title: "Brand updated", description: "Your brand details have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/user/brands/${id}`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      const b = brands.find(b => b.id === id);
      queryClient.invalidateQueries({ queryKey: ["user-brands"] });
      toast({ title: "Brand removed", description: `${b?.brandName ?? "Brand"} has been removed.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const startEdit = (b: UserBrand) => {
    setEditingId(b.id);
    setEditForm({
      brandName: b.brandName,
      websiteUrl: b.websiteUrl ?? "",
      industry: b.industry ?? "",
      instagramHandle: b.instagramHandle ?? "",
      facebookUrl: b.facebookUrl ?? "",
      xHandle: b.xHandle ?? "",
      linkedinUrl: b.linkedinUrl ?? "",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> My Brands
              {isGrowth && (
                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Growth</Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage your brands and run analyses to improve your ad readiness
            </p>
          </div>
          {canAddMore && (
            <Button size="sm" className="gap-1.5" onClick={() => { setShowAdd(!showAdd); setEditingId(null); }}>
              <Plus className="h-3.5 w-3.5" /> Add Brand
            </Button>
          )}
        </div>

        {!isGrowth && brands.length >= 1 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Crown className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-800">Free plan — 1 brand maximum</p>
              <p className="text-xs text-amber-700 mt-0.5">Upgrade to Growth to manage multiple brands.</p>
            </div>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 gap-1.5 flex-shrink-0">
                <Zap className="h-3.5 w-3.5" /> Upgrade
              </Button>
            </Link>
          </div>
        )}

        {showAdd && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" /> New Brand
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <BrandFormFields form={addForm} onChange={setAddForm} />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addMutation.mutate(addForm)}
                  disabled={!addForm.brandName.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? "Adding..." : "Add Brand"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : brands.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">No brands added yet</p>
              <p className="text-sm text-muted-foreground mb-4">
                Add your first brand to start running analyses and tracking your ad readiness.
              </p>
              <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Your First Brand
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {brands.map((b) => {
              const isEditing = editingId === b.id;

              return (
                <Card key={b.id} className="overflow-hidden hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">Edit Brand</p>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <BrandFormFields form={editForm} onChange={setEditForm} />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => editMutation.mutate({ id: b.id, data: editForm })}
                            disabled={!editForm.brandName.trim() || editMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {editMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-bold text-lg">{b.brandName[0]?.toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{b.brandName}</span>
                            {b.isDefault && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {b.websiteUrl && (
                              <a
                                href={b.websiteUrl.startsWith("http") ? b.websiteUrl : `https://${b.websiteUrl}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 hover:text-primary"
                              >
                                <Globe className="h-3 w-3" />{b.websiteUrl.replace(/^https?:\/\//, "")}
                              </a>
                            )}
                            {b.industry && <span>{b.industry}</span>}
                            {b.instagramHandle && (
                              <span className="flex items-center gap-0.5">
                                <Instagram className="h-3 w-3 text-pink-500" />{b.instagramHandle}
                              </span>
                            )}
                            {b.xHandle && (
                              <span className="flex items-center gap-0.5">
                                <XIcon />{b.xHandle}
                              </span>
                            )}
                            {b.linkedinUrl && (
                              <span className="flex items-center gap-0.5">
                                <Linkedin className="h-3 w-3 text-blue-600" />LinkedIn
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isFreePlan ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button variant="ghost" size="icon" disabled className="h-8 w-8 opacity-40 cursor-not-allowed">
                                    <Lock className="h-3.5 w-3.5" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[200px] text-center">
                                <p className="font-semibold mb-1">Upgrade to edit</p>
                                <p className="text-xs text-muted-foreground">Paid plan required to edit brands.</p>
                                <Link href="/pricing">
                                  <span className="text-xs text-primary underline cursor-pointer mt-1 inline-block">View plans →</span>
                                </Link>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"
                              onClick={() => startEdit(b)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {!b.isDefault && (
                            isFreePlan ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button variant="ghost" size="icon" disabled className="h-8 w-8 opacity-40 cursor-not-allowed">
                                      <Lock className="h-3.5 w-3.5" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[200px] text-center">
                                  <p className="font-semibold mb-1">Upgrade to delete</p>
                                  <p className="text-xs text-muted-foreground">Paid plan required to delete brands.</p>
                                  <Link href="/pricing">
                                    <span className="text-xs text-primary underline cursor-pointer mt-1 inline-block">View plans →</span>
                                  </Link>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => removeMutation.mutate(b.id)}
                                disabled={removeMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
