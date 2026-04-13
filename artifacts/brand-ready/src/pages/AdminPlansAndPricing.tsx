import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, CreditCard, Plus, Trash2, Edit3, Save, X, Users, BarChart3, Megaphone, Building2, Tag, Calendar, Percent, DollarSign, Wand2 } from "lucide-react";
import { AdminLayout, AdminAuthGate } from "@/components/layout/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type FeatureMeta = { text: string; isQuantifiable: boolean };
const PREDEFINED_FEATURES: FeatureMeta[] = [
  { text: "Brand analyses", isQuantifiable: true },
  { text: "Ad Readiness Score breakdown", isQuantifiable: false },
  { text: "Action plan", isQuantifiable: false },
  { text: "Daily personalized tasks", isQuantifiable: false },
  { text: "Competitor analysis", isQuantifiable: true },
  { text: "SEO & content recommendations", isQuantifiable: false },
  { text: "Google & Trustpilot review tracking", isQuantifiable: false },
  { text: "Competitor Ads Intelligence", isQuantifiable: true },
  { text: "Brand mention monitoring", isQuantifiable: true },
  { text: "AI Brand Coach", isQuantifiable: false },
  { text: "Content Generator", isQuantifiable: true },
  { text: "Press Release Builder", isQuantifiable: true },
  { text: "Review Templates", isQuantifiable: false },
  { text: "Industry Benchmarks", isQuantifiable: false },
  { text: "Score Tracker", isQuantifiable: false },
  { text: "Strategy Decoder", isQuantifiable: true },
  { text: "Audience Trust Score", isQuantifiable: false },
  { text: "Viral Content Detector", isQuantifiable: true },
];
const QUANTIFIABLE_FEATURES = new Set(
  PREDEFINED_FEATURES.filter((f) => f.isQuantifiable).map((f) => f.text)
);

const ADMIN_TOKEN_KEY = "skorvia_admin_token";
const ADMIN_USER_KEY = "skorvia_admin_user";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const adminFetch = async (path: string, opts: RequestInit = {}) => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
  const r = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", "x-admin-token": token, ...(opts.headers ?? {}) },
  });
  if (r.status === 401) {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    window.location.href = `${import.meta.env.BASE_URL}admin/login`;
    throw new Error("Session expired — redirecting to login");
  }
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error((data as any).error || `Request failed (${r.status})`);
  }
  return r.json();
};

type Feature = { text: string; included: boolean; limit?: number | null };
type PlanRow = {
  id?: number;
  planId: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  badge?: string | null;
  popular?: boolean;
  active: boolean;
  description?: string | null;
  features: Feature[];
  isAgency?: boolean;
};

const DEFAULT_FEATURES: Feature[] = PREDEFINED_FEATURES.map((f) => ({ text: f.text, included: false, limit: QUANTIFIABLE_FEATURES.has(f.text) ? null : undefined }));

function mergeFeatures(existing: Feature[]): Feature[] {
  return PREDEFINED_FEATURES.map((f) => {
    const found = existing.find((ef) => ef.text === f.text);
    return {
      text: f.text,
      included: found?.included ?? false,
      ...(QUANTIFIABLE_FEATURES.has(f.text) ? { limit: found?.limit ?? null } : {}),
    };
  });
}

function featureLimitLabel(limit: number | null | undefined): string {
  if (limit === null || limit === undefined) return "";
  if (limit === 0) return "Unlimited";
  return `Up to ${limit}/month`;
}

const BLANK_PLAN: Omit<PlanRow, "id"> = {
  planId: "", name: "", price: 0, currency: "NGN", period: "month",
  badge: "", popular: false, active: true, description: "", features: DEFAULT_FEATURES, isAgency: false,
};

const AGENCY_PLAN_TEMPLATE: Omit<PlanRow, "id"> = {
  planId: "agency-monthly",
  name: "Agency",
  description: "Full-suite access for agencies managing multiple client brands",
  price: 149900,
  currency: "NGN",
  period: "month",
  badge: "Agency Plan",
  popular: false,
  active: true,
  isAgency: true,
  features: PREDEFINED_FEATURES.map((f) => ({
    text: f.text,
    included: true,
    ...(f.isQuantifiable ? { limit: 0 } : {}),
  })),
};

function PlanFormModal({ plan, onClose, onSaved }: { plan: PlanRow | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isNew = !plan;
  const [local, setLocal] = useState<Omit<PlanRow, "id">>(() =>
    plan ? { ...plan, features: mergeFeatures(plan.features) } : { ...BLANK_PLAN }
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      isNew
        ? adminFetch("/admin/plans", { method: "POST", body: JSON.stringify({ ...local }) })
        : adminFetch(`/admin/plans/${local.planId}`, { method: "PATCH", body: JSON.stringify({ ...local }) }),
    onSuccess: () => {
      toast({ title: isNew ? "Plan created" : "Plan updated", description: `${local.name} has been saved.` });
      onSaved();
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save plan.", variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{isNew ? "Create New Plan" : `Edit ${plan.name}`}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isNew && (
            <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3">
              <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5" /> Quick Template
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100"
                  onClick={() => setLocal({ ...AGENCY_PLAN_TEMPLATE })}
                >
                  <Building2 className="h-3 w-3" /> Agency Plan
                </Button>
              </div>
              <p className="text-[10px] text-amber-600 mt-1.5">Clicking a template fills in all fields — you can still edit before saving.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plan ID <span className="text-destructive">*</span></Label>
              <Input value={local.planId} onChange={(e) => setLocal({ ...local, planId: e.target.value })} placeholder="e.g. starter-monthly" disabled={!isNew} />
            </div>
            <div className="space-y-1.5">
              <Label>Plan Name <span className="text-destructive">*</span></Label>
              <Input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} placeholder="e.g. Starter" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={local.description ?? ""} onChange={(e) => setLocal({ ...local, description: e.target.value })} placeholder="Short plan description" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input type="number" value={local.price} onChange={(e) => setLocal({ ...local, price: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={local.currency} onChange={(e) => setLocal({ ...local, currency: e.target.value })} placeholder="NGN" />
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Input value={local.period} onChange={(e) => setLocal({ ...local, period: e.target.value })} placeholder="month" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Badge Label</Label>
            <Input value={local.badge ?? ""} onChange={(e) => setLocal({ ...local, badge: e.target.value })} placeholder="e.g. Most Popular, Best Value" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 border rounded-lg col-span-1">
              <span className="text-sm font-medium">Active</span>
              <Switch checked={local.active} onCheckedChange={(v) => setLocal({ ...local, active: v })} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg col-span-1">
              <span className="text-sm font-medium">Popular</span>
              <Switch checked={local.popular ?? false} onCheckedChange={(v) => setLocal({ ...local, popular: v })} />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg col-span-1">
              <span className="text-sm font-medium">Agency</span>
              <Switch checked={local.isAgency ?? false} onCheckedChange={(v) => setLocal({ ...local, isAgency: v })} />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Features Included</Label>
              <span className="text-xs text-muted-foreground">{local.features.filter((f) => f.included).length} / {local.features.length} enabled</span>
            </div>
            <div className="border rounded-lg divide-y overflow-y-auto max-h-80">
              {local.features.map((f, i) => {
                const isQuantifiable = QUANTIFIABLE_FEATURES.has(f.text);
                return (
                  <div key={f.text} className="px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${f.included ? "text-foreground" : "text-muted-foreground"}`}>{f.text}</span>
                      <Switch
                        checked={f.included}
                        onCheckedChange={(v) => {
                          const features = local.features.map((ff, ii) => ii === i ? { ...ff, included: v } : ff);
                          setLocal({ ...local, features });
                        }}
                      />
                    </div>
                    {isQuantifiable && f.included && (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          className="h-7 w-28 text-xs"
                          placeholder="0 = Unlimited"
                          value={f.limit ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : Number(e.target.value);
                            const features = local.features.map((ff, ii) => ii === i ? { ...ff, limit: val } : ff);
                            setLocal({ ...local, features });
                          }}
                        />
                        <span className="text-[11px] text-muted-foreground">
                          {f.limit === null || f.limit === undefined ? "Set limit (0 = unlimited)" : f.limit === 0 ? "∞ Unlimited" : `Max ${f.limit}/month`}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!local.planId || !local.name || saveMutation.isPending} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving..." : "Save Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PlanCard({ plan, onEdit, onDelete }: { plan: PlanRow; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className={`relative ${plan.popular ? "border-primary ring-1 ring-primary/30" : ""} ${plan.isAgency ? "border-amber-400/50 bg-amber-50/30" : ""}`}>
      {(plan.popular || plan.badge) && (
        <div className="absolute -top-2.5 left-4">
          <Badge className="text-xs">{plan.badge ?? "Popular"}</Badge>
        </div>
      )}
      {plan.isAgency && (
        <div className="absolute -top-2.5 right-4">
          <Badge className="text-xs bg-amber-500 text-white">Agency</Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{plan.name}</CardTitle>
            {plan.description && <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={plan.active ? "default" : "secondary"} className="text-xs">{plan.active ? "Active" : "Off"}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Edit3 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        <div>
          {plan.price === 0 ? (
            <span className="text-2xl font-bold">Free</span>
          ) : (
            <span className="text-2xl font-bold">
              ₦{plan.price.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/{plan.period}</span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className={`flex items-start gap-2 text-xs ${!f.included ? "text-muted-foreground/50" : ""}`}>
              <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${f.included ? "text-green-600" : "text-muted-foreground/30"}`} />
              <span>
                {f.text}
                {f.included && QUANTIFIABLE_FEATURES.has(f.text) && f.limit !== undefined && f.limit !== null && (
                  <span className="ml-1 text-[10px] font-semibold text-primary">
                    ({f.limit === 0 ? "Unlimited" : `${f.limit}/mo`})
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted-foreground mt-3 font-mono">ID: {plan.planId}</p>
      </CardContent>
    </Card>
  );
}

type CouponRow = {
  id: number;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
};

const BLANK_COUPON = { code: "", description: "", discountType: "percentage", discountValue: 10, maxUses: "", expiresAt: "", active: true };

function CouponManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponRow | null>(null);
  const [form, setForm] = useState<typeof BLANK_COUPON>({ ...BLANK_COUPON });

  const { data: coupons = [], isLoading } = useQuery<CouponRow[]>({
    queryKey: ["admin-coupons"],
    queryFn: () => adminFetch("/admin/coupons"),
  });

  const openNew = () => { setForm({ ...BLANK_COUPON }); setEditingCoupon(null); setShowForm(true); };
  const openEdit = (c: CouponRow) => {
    setForm({
      code: c.code, description: c.description ?? "", discountType: c.discountType,
      discountValue: c.discountValue, maxUses: c.maxUses ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "", active: c.active,
    });
    setEditingCoupon(c);
    setShowForm(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      };
      return editingCoupon
        ? adminFetch(`/admin/coupons/${editingCoupon.id}`, { method: "PATCH", body: JSON.stringify(payload) })
        : adminFetch("/admin/coupons", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editingCoupon ? "Coupon updated" : "Coupon created" });
      setShowForm(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to save coupon.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminFetch(`/admin/coupons/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); toast({ title: "Coupon deleted" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      adminFetch(`/admin/coupons/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" /> Coupon Codes
            </CardTitle>
            <CardDescription>Create discount codes for promotional campaigns.</CardDescription>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openNew}><Plus className="h-3.5 w-3.5" /> Add Coupon</Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="border rounded-xl p-4 mb-4 bg-muted/30 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold">{editingCoupon ? "Edit Coupon" : "New Coupon"}</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Code <span className="text-destructive">*</span></Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" disabled={!!editingCoupon} className="h-8 text-sm uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="20% launch discount" className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage %</SelectItem>
                    <SelectItem value="flat">Flat Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Value {form.discountType === "percentage" ? "(%)" : "(NGN)"}</Label>
                <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} className="h-8 text-sm" min={0} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Uses</Label>
                <Input value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="∞ Unlimited" className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Expires On</Label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={() => saveMutation.mutate()} disabled={!form.code || saveMutation.isPending}>
                <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving..." : "Save Coupon"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Tag className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No coupons yet. Create one to offer discounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Code", "Discount", "Usage", "Expires", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 font-mono font-semibold text-xs">{c.code}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {c.discountType === "percentage" ? <Percent className="h-3 w-3 text-muted-foreground" /> : <DollarSign className="h-3 w-3 text-muted-foreground" />}
                        <span className="text-xs">{c.discountValue}{c.discountType === "percentage" ? "%" : " NGN"}</span>
                      </div>
                      {c.description && <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : " / ∞"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Switch checked={c.active} onCheckedChange={(v) => toggleMutation.mutate({ id: c.id, active: v })} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { if (confirm(`Delete coupon "${c.code}"?`)) deleteMutation.mutate(c.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPlansAndPricing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<PlanRow | null | "new">(null);

  const { data: rawPlans = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin-plans"],
    queryFn: () => adminFetch("/admin/plans"),
  });

  const plans: PlanRow[] = (Array.isArray(rawPlans) ? rawPlans : []).map((p: any) => ({
    ...p,
    features: typeof p.features === "string"
      ? (() => { try { return JSON.parse(p.features); } catch { return []; } })()
      : (Array.isArray(p.features) ? p.features : []),
  }));

  const deleteMutation = useMutation({
    mutationFn: (planId: string) => adminFetch(`/admin/plans/${planId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plan deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete plan.", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: () => adminFetch("/admin/plans/seed", { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      toast({ title: "Plans seeded", description: data?.message ?? "Default plans added successfully." });
    },
    onError: () => toast({ title: "Error", description: "Failed to seed plans.", variant: "destructive" }),
  });

  const regularPlans = plans.filter((p) => !p.isAgency);
  const agencyPlans = plans.filter((p) => p.isAgency);

  return (
    <AdminAuthGate>
      <AdminLayout
        title="Plans & Pricing"
        subtitle="Configure subscription tiers, features, and usage limits"
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setEditingPlan("new")}>
            <Plus className="h-3.5 w-3.5" /> Add Plan
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Regular Plans */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Subscription Plans
              </CardTitle>
              <CardDescription>Click edit to modify plan details, pricing, and features. Changes save to the database instantly.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}</div>
              ) : regularPlans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium mb-1">No plans yet</p>
                  <p className="text-xs mb-4">Seed the 4 default plans (Free, Starter, Growth Monthly & Annual) or create your own.</p>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                    >
                      {seedMutation.isPending ? "Seeding..." : "Seed Default Plans"}
                    </Button>
                    <Button size="sm" onClick={() => setEditingPlan("new")}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Plan
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {regularPlans.map((plan) => (
                    <PlanCard
                      key={plan.planId}
                      plan={plan}
                      onEdit={() => setEditingPlan(plan)}
                      onDelete={() => { if (confirm(`Delete plan "${plan.name}"?`)) deleteMutation.mutate(plan.planId); }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agency Plans */}
          <Card className="border-amber-400/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" /> Agency Plans
                <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Enterprise</Badge>
              </CardTitle>
              <CardDescription>High-volume plans for agencies and large teams. Mark any plan as "Agency" to include it here.</CardDescription>
            </CardHeader>
            <CardContent>
              {agencyPlans.length === 0 ? (
                <div className="border-2 border-dashed border-amber-200 rounded-xl p-8 text-center">
                  <Building2 className="h-8 w-8 mx-auto mb-3 text-amber-400" />
                  <p className="text-sm font-semibold text-amber-700">No Agency Plans Yet</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-4">Create a custom plan for agencies and enterprise clients with white-glove support.</p>
                  <Button size="sm" variant="outline" className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50" onClick={() => setEditingPlan("new")}>
                    <Plus className="h-3.5 w-3.5" /> Create Agency Plan
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {agencyPlans.map((plan) => (
                    <PlanCard
                      key={plan.planId}
                      plan={plan}
                      onEdit={() => setEditingPlan(plan)}
                      onDelete={() => { if (confirm(`Delete plan "${plan.name}"?`)) deleteMutation.mutate(plan.planId); }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coupon Management */}
          <CouponManagement />

          {/* Summary Table */}
          {plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        {["Plan ID", "Name", "Price", "Period", "Status", "Type"].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {plans.map((plan) => (
                        <tr key={plan.planId} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{plan.planId}</td>
                          <td className="px-4 py-3 font-medium">{plan.name}</td>
                          <td className="px-4 py-3">{plan.price === 0 ? "Free" : `₦${plan.price.toLocaleString()}`}</td>
                          <td className="px-4 py-3 text-muted-foreground capitalize">{plan.period}</td>
                          <td className="px-4 py-3">
                            <Badge variant={plan.active ? "default" : "secondary"} className="text-xs">{plan.active ? "Active" : "Disabled"}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {plan.isAgency ? <Badge className="text-xs bg-amber-100 text-amber-700 border-0">Agency</Badge> : <span className="text-muted-foreground text-xs">Standard</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>

      {editingPlan !== null && (
        <PlanFormModal
          plan={editingPlan === "new" ? null : editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["admin-plans"] })}
        />
      )}
    </AdminAuthGate>
  );
}
