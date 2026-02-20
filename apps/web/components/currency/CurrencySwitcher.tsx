"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { SUPPORTED_CURRENCIES, type SupportedCurrency } from "@/lib/currency/currency";

type Props = {
  compact?: boolean;
};

export default function CurrencySwitcher({ compact = false }: Props) {
  const router = useRouter();
  const t = useTranslations("common");
  const { currency, setCurrency, asOfDate, isLoadingRates } = useCurrency();

  return (
    <label
      className={[
        "inline-flex items-center gap-2 rounded-2xl border border-line/80 bg-surface px-3 py-2 shadow-sm",
        compact ? "text-xs" : "text-sm",
      ].join(" ")}
    >
      <span className="font-semibold text-muted">{t("currency")}</span>
      <select
        value={currency}
        onChange={(event) => {
          setCurrency(event.target.value as SupportedCurrency);
          router.refresh();
        }}
        className="bg-transparent font-semibold text-primary outline-none"
        aria-label="Select display currency"
      >
        {SUPPORTED_CURRENCIES.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      {!compact ? (
        <span className="hidden text-[11px] text-muted xl:inline">
          {isLoadingRates ? t("loading") : asOfDate ? `FX ${asOfDate}` : "FX unavailable"}
        </span>
      ) : null}
    </label>
  );
}
