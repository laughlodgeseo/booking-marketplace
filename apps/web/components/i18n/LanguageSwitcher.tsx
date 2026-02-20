"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { setLocaleCookie } from "@/lib/i18n/client";
import { type AppLocale, normalizeLocale } from "@/lib/i18n/config";

type Props = {
  compact?: boolean;
};

const OPTIONS: ReadonlyArray<AppLocale> = ["en", "ar"];

function buttonLabel(locale: AppLocale): string {
  return locale.toUpperCase();
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const router = useRouter();
  const t = useTranslations("common");
  const locale = normalizeLocale(useLocale());

  function onSwitch(next: AppLocale) {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  }

  return (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-full border border-indigo-200/90 bg-white px-1.5 py-1 shadow-[0_10px_26px_rgba(79,70,229,0.16)] ring-1 ring-indigo-100",
        compact ? "text-xs" : "text-sm",
      ].join(" ")}
      role="group"
      aria-label={t("language")}
    >
      {!compact ? (
        <span className="inline-flex items-center gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
          <Languages className="h-3.5 w-3.5 text-indigo-500" />
          {t("language")}
        </span>
      ) : null}

      <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-50 to-sky-50 p-1">
        {OPTIONS.map((value) => {
          const active = value === locale;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSwitch(value)}
              className={[
                "h-8 min-w-11 rounded-full px-3 font-semibold transition",
                active
                  ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 text-white shadow-[0_8px_18px_rgba(79,70,229,0.28)]"
                  : "bg-transparent text-indigo-900 hover:bg-white hover:shadow-sm",
              ].join(" ")}
              aria-pressed={active}
              title={value === "en" ? t("english") : t("arabic")}
            >
              {buttonLabel(value)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
