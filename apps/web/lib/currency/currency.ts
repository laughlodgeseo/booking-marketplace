const ALL_SUPPORTED_CURRENCIES = ["AED", "USD", "SAR", "EUR", "GBP"] as const;
export type SupportedCurrency = (typeof ALL_SUPPORTED_CURRENCIES)[number];

function parseSupportedCurrenciesFromEnv(raw: string | undefined): SupportedCurrency[] {
  const input = (raw ?? "").trim();
  if (!input) return [...ALL_SUPPORTED_CURRENCIES];

  const fromEnv = input
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is SupportedCurrency =>
      (ALL_SUPPORTED_CURRENCIES as readonly string[]).includes(value),
    );

  const unique = Array.from(new Set(fromEnv));
  return unique.length > 0 ? unique : [...ALL_SUPPORTED_CURRENCIES];
}

export const SUPPORTED_CURRENCIES = parseSupportedCurrenciesFromEnv(
  process.env.NEXT_PUBLIC_SUPPORTED_CURRENCIES,
);

export type FxRates = {
  USD: number | null;
  SAR: number | null;
  EUR: number | null;
  GBP: number | null;
};

export const DEFAULT_CURRENCY: SupportedCurrency = "AED";
export const CURRENCY_STORAGE_KEY = "ll_currency_v1";
export const CURRENCY_COOKIE_NAME = "currency";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function parseSupportedCurrency(value: unknown): SupportedCurrency {
  if (typeof value !== "string") return DEFAULT_CURRENCY;
  const normalized = value.trim().toUpperCase();
  return (ALL_SUPPORTED_CURRENCIES as readonly string[]).includes(normalized)
    ? (normalized as SupportedCurrency)
    : DEFAULT_CURRENCY;
}

export function fallbackFxRates(): FxRates {
  return {
    USD: null,
    SAR: null,
    EUR: null,
    GBP: null,
  };
}

export function convertAedTo(
  amountAed: number,
  currency: SupportedCurrency,
  rates: FxRates
): number | null {
  if (!isFiniteNumber(amountAed)) return null;
  if (currency === "AED") return amountAed;
  const rate = rates[currency];
  if (!isFiniteNumber(rate) || rate <= 0) return null;
  return amountAed * rate;
}

export function formatCurrencyAmount(
  amount: number | null,
  currency: SupportedCurrency,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  if (!isFiniteNumber(amount)) return `${currency} --`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: options?.maximumFractionDigits ?? (currency === "AED" ? 0 : 2),
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
