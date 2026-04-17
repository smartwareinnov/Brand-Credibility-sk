import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase } from "lucide-react";
import type { UserBrand } from "@/hooks/useBrandSelector";

interface BrandSelectorProps {
  brands: UserBrand[];
  selectedBrandId: number | null;
  onSelect: (id: number) => void;
  label?: string;
}

export function BrandSelector({ brands, selectedBrandId, onSelect, label = "Analyzing for" }: BrandSelectorProps) {
  if (brands.length <= 1) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-shrink-0">
        <Briefcase className="h-4 w-4" />
        <span className="font-medium">{label}:</span>
      </div>
      <Select
        value={selectedBrandId?.toString() ?? ""}
        onValueChange={(v) => onSelect(parseInt(v))}
      >
        <SelectTrigger className="h-8 text-sm border-0 bg-transparent p-0 focus:ring-0 w-auto gap-2">
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
