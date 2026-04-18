import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/lib/useApi";

export type UserBrand = {
  id: number;
  brandName: string;
  websiteUrl: string | null;
  industry: string | null;
  instagramHandle: string | null;
  facebookUrl: string | null;
  xHandle: string | null;
  linkedinUrl: string | null;
  isDefault: boolean;
};

export function useBrandSelector() {
  const { apiFetch } = useApi();
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  const { data: brands = [], isLoading } = useQuery<UserBrand[]>({
    queryKey: ["user-brands"],
    queryFn: () => apiFetch<UserBrand[]>("/user/brands"),
    staleTime: 60_000,
  });

  // Auto-select default brand on load
  useEffect(() => {
    if (brands.length > 0 && selectedBrandId === null) {
      const defaultBrand = brands.find((b) => b.isDefault) ?? brands[0];
      setSelectedBrandId(defaultBrand.id);
    }
  }, [brands, selectedBrandId]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId) ?? null;
  // Only show selector UI when user has more than one brand
  const hasMultipleBrands = brands.length > 1;
  // True when brands are loaded and a selection exists
  const isReady = !isLoading && selectedBrandId !== null;

  return {
    brands,
    selectedBrandId,
    setSelectedBrandId,
    selectedBrand,
    hasMultipleBrands,
    isLoading,
    isReady,
  };
}
