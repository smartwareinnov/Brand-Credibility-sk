import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Globe, Instagram } from "lucide-react";
import type { UserBrand } from "@/hooks/useBrandSelector";

interface BrandSelectorProps {
  brands: UserBrand[];
  selectedBrandId: number | null;
  onSelect: (id: number) => void;
  label?: string;
}

/** Shown when user has multiple brands — lets them pick which one to use */
export function BrandSelector({ brands, selectedBrandId, onSelect, label = "Generating for" }: BrandSelectorProps) {
  if (brands.length <= 1) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 text-sm font-medium flex-shrink-0">
        <Briefcase className="h-4 w-4 text-primary" />
        <span>{label}:</span>
      </div>
      <Select
        value={selectedBrandId?.toString() ?? ""}
        onValueChange={(v) => onSelect(parseInt(v))}
      >
        <SelectTrigger className="h-8 text-sm border-primary/30 bg-background w-auto min-w-[160px] focus:ring-primary/30">
          <SelectValue placeholder="Select brand" />
        </SelectTrigger>
        <SelectContent>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id.toString()}>
              <div className="flex items-center gap-2">
                {brand.brandName}
                {brand.isDefault && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Default</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Shown when user has only one brand — confirms which brand is being used */
export function BrandContextBadge({ brand }: { brand: UserBrand | null }) {
  if (!brand) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Briefcase className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground">{brand.brandName}</p>
        <div className="flex items-center gap-3 mt-0.5">
          {brand.industry && (
            <span className="text-[11px] text-muted-foreground">{brand.industry}</span>
          )}
          {brand.websiteUrl && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />{brand.websiteUrl.replace(/^https?:\/\//, "")}
            </span>
          )}
          {brand.instagramHandle && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Instagram className="h-3 w-3" />@{brand.instagramHandle}
            </span>
          )}
        </div>
      </div>
      <Badge variant="secondary" className="text-[10px] flex-shrink-0">Active Brand</Badge>
    </div>
  );
}
