"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/http";
import {
  CURRENCY_COOKIE_NAME,
  CURRENCY_STORAGE_KEY,
  DEFAULT_CURRENCY,
  convertAedTo,
  fallbackFxRates,
  formatCurrencyAmount,
  parseSupportedCurrency,
  type FxRates,
  type SupportedCurrency,
} from "@/lib/currency/currency";

type FxApiResponse = {
  baseCurrency: "AED";
  asOfDate: string | null;
  rates: FxRates;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

type CurrencyContextValue = {
  currency: SupportedCurrency;
  setCurrency: (next: SupportedCurrency) => void;
  rates: FxRates;
  asOfDate: string | null;
  isLoadingRates: boolean;
  convertFromAed: (amountAed: number, target?: SupportedCurrency) => number | null;
  formatFromAed: (
    amountAed: number,
    options?: { target?: SupportedCurrency; maximumFractionDigits?: number; minimumFractionDigits?: number }
  ) => string;
  formatBaseAed: (amountAed: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    if (typeof window === "undefined") return DEFAULT_CURRENCY;
    const cookieValue = readCookie(CURRENCY_COOKIE_NAME);
    if (cookieValue) return parseSupportedCurrency(cookieValue);
    return parseSupportedCurrency(window.localStorage.getItem(CURRENCY_STORAGE_KEY));
  });
  const [rates, setRates] = useState<FxRates>(fallbackFxRates());
  const [asOfDate, setAsOfDate] = useState<string | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadRates() {
      setIsLoadingRates(true);
      const res = await apiFetch<FxApiResponse>("/public/fx-rates", {
        method: "GET",
        cache: "force-cache",
        auth: "none",
      });

      if (!alive) return;
      if (!res.ok) {
        setRates(fallbackFxRates());
        setAsOfDate(null);
        setIsLoadingRates(false);
        return;
      }

      const data = res.data;
      setRates({
        USD: typeof data.rates?.USD === "number" ? data.rates.USD : null,
        SAR: typeof data.rates?.SAR === "number" ? data.rates.SAR : null,
        EUR: typeof data.rates?.EUR === "number" ? data.rates.EUR : null,
        GBP: typeof data.rates?.GBP === "number" ? data.rates.GBP : null,
      });
      setAsOfDate(data.asOfDate ?? null);
      setIsLoadingRates(false);
    }

    void loadRates();
    return () => {
      alive = false;
    };
  }, []);

  const setCurrency = useCallback((next: SupportedCurrency) => {
    setCurrencyState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next);
      document.cookie = `${CURRENCY_COOKIE_NAME}=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
  }, []);

  const convertFromAed = useCallback(
    (amountAed: number, target?: SupportedCurrency) => {
      return convertAedTo(amountAed, target ?? currency, rates);
    },
    [currency, rates]
  );

  const formatFromAed = useCallback(
    (
      amountAed: number,
      options?: {
        target?: SupportedCurrency;
        maximumFractionDigits?: number;
        minimumFractionDigits?: number;
      }
    ) => {
      const target = options?.target ?? currency;
      const converted = convertAedTo(amountAed, target, rates);
      if (converted === null) {
        return formatCurrencyAmount(amountAed, "AED", {
          maximumFractionDigits: options?.maximumFractionDigits,
          minimumFractionDigits: options?.minimumFractionDigits,
        });
      }
      return formatCurrencyAmount(converted, target, {
        maximumFractionDigits: options?.maximumFractionDigits,
        minimumFractionDigits: options?.minimumFractionDigits,
      });
    },
    [currency, rates]
  );

  const formatBaseAed = useCallback((amountAed: number) => {
    return formatCurrencyAmount(amountAed, "AED", { maximumFractionDigits: 0 });
  }, []);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      rates,
      asOfDate,
      isLoadingRates,
      convertFromAed,
      formatFromAed,
      formatBaseAed,
    }),
    [asOfDate, convertFromAed, currency, formatBaseAed, formatFromAed, isLoadingRates, rates, setCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within CurrencyProvider.");
  }
  return ctx;
}
