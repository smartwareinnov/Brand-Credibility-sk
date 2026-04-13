export interface CurrencyInfo {
  currency: string;
  currencySymbol: string;
  country: string;
  countryCode: string;
}

const COUNTRY_CURRENCY_MAP: Record<string, CurrencyInfo> = {
  NG: { currency: "NGN", currencySymbol: "₦", country: "Nigeria", countryCode: "NG" },
  GH: { currency: "GHS", currencySymbol: "₵", country: "Ghana", countryCode: "GH" },
  GB: { currency: "GBP", currencySymbol: "£", country: "United Kingdom", countryCode: "GB" },
  DE: { currency: "EUR", currencySymbol: "€", country: "Germany", countryCode: "DE" },
  FR: { currency: "EUR", currencySymbol: "€", country: "France", countryCode: "FR" },
  IT: { currency: "EUR", currencySymbol: "€", country: "Italy", countryCode: "IT" },
  ES: { currency: "EUR", currencySymbol: "€", country: "Spain", countryCode: "ES" },
  NL: { currency: "EUR", currencySymbol: "€", country: "Netherlands", countryCode: "NL" },
  BE: { currency: "EUR", currencySymbol: "€", country: "Belgium", countryCode: "BE" },
  PT: { currency: "EUR", currencySymbol: "€", country: "Portugal", countryCode: "PT" },
  AT: { currency: "EUR", currencySymbol: "€", country: "Austria", countryCode: "AT" },
  CH: { currency: "CHF", currencySymbol: "CHF", country: "Switzerland", countryCode: "CH" },
  SE: { currency: "SEK", currencySymbol: "kr", country: "Sweden", countryCode: "SE" },
  NO: { currency: "NOK", currencySymbol: "kr", country: "Norway", countryCode: "NO" },
  DK: { currency: "DKK", currencySymbol: "kr", country: "Denmark", countryCode: "DK" },
  CA: { currency: "CAD", currencySymbol: "CA$", country: "Canada", countryCode: "CA" },
  AU: { currency: "AUD", currencySymbol: "A$", country: "Australia", countryCode: "AU" },
  NZ: { currency: "NZD", currencySymbol: "NZ$", country: "New Zealand", countryCode: "NZ" },
  ZA: { currency: "ZAR", currencySymbol: "R", country: "South Africa", countryCode: "ZA" },
  KE: { currency: "KES", currencySymbol: "KSh", country: "Kenya", countryCode: "KE" },
  TZ: { currency: "TZS", currencySymbol: "TSh", country: "Tanzania", countryCode: "TZ" },
  UG: { currency: "UGX", currencySymbol: "USh", country: "Uganda", countryCode: "UG" },
  RW: { currency: "RWF", currencySymbol: "Fr", country: "Rwanda", countryCode: "RW" },
  SN: { currency: "XOF", currencySymbol: "CFA", country: "Senegal", countryCode: "SN" },
  CI: { currency: "XOF", currencySymbol: "CFA", country: "Ivory Coast", countryCode: "CI" },
  CM: { currency: "XAF", currencySymbol: "FCFA", country: "Cameroon", countryCode: "CM" },
  US: { currency: "USD", currencySymbol: "$", country: "United States", countryCode: "US" },
  MX: { currency: "MXN", currencySymbol: "MX$", country: "Mexico", countryCode: "MX" },
  BR: { currency: "BRL", currencySymbol: "R$", country: "Brazil", countryCode: "BR" },
  AR: { currency: "ARS", currencySymbol: "$", country: "Argentina", countryCode: "AR" },
  CO: { currency: "COP", currencySymbol: "$", country: "Colombia", countryCode: "CO" },
  IN: { currency: "INR", currencySymbol: "₹", country: "India", countryCode: "IN" },
};

export async function detectCurrencyFromIp(ip: string): Promise<CurrencyInfo> {
  try {
    const cleanIp = ip === "::1" || ip === "127.0.0.1" ? "" : ip;
    if (!cleanIp) {
      return COUNTRY_CURRENCY_MAP["US"] ?? { currency: "USD", currencySymbol: "$", country: "United States", countryCode: "US" };
    }
    const resp = await fetch(`https://ipapi.co/${cleanIp}/json/`);
    if (resp.ok) {
      const data = await resp.json() as { country_code?: string };
      const cc = data.country_code?.toUpperCase() ?? "US";
      return COUNTRY_CURRENCY_MAP[cc] ?? COUNTRY_CURRENCY_MAP["US"] ?? {
        currency: "USD",
        currencySymbol: "$",
        country: "United States",
        countryCode: "US",
      };
    }
  } catch {
    // fallback
  }
  return { currency: "USD", currencySymbol: "$", country: "United States", countryCode: "US" };
}

interface PricingConfig {
  USD: { monthly: number; yearly: number };
  EUR: { monthly: number; yearly: number };
  GBP: { monthly: number; yearly: number };
  NGN: { monthly: number; yearly: number };
  GHS: { monthly: number; yearly: number };
  ZAR: { monthly: number; yearly: number };
  KES: { monthly: number; yearly: number };
  default: { monthly: number; yearly: number };
}

export const PRICING: PricingConfig = {
  USD: { monthly: 29, yearly: 249 },
  EUR: { monthly: 27, yearly: 229 },
  GBP: { monthly: 23, yearly: 199 },
  NGN: { monthly: 12000, yearly: 99000 },
  GHS: { monthly: 150, yearly: 1200 },
  ZAR: { monthly: 549, yearly: 4499 },
  KES: { monthly: 3500, yearly: 28000 },
  default: { monthly: 29, yearly: 249 },
};

export function getPricingForCurrency(currency: string): { monthly: number; yearly: number } {
  const key = currency.toUpperCase() as keyof PricingConfig;
  return PRICING[key] ?? PRICING.default;
}
