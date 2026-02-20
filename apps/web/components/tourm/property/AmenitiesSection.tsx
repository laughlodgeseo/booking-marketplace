"use client";

import { useEffect, useMemo, useState } from "react";
import { Grid3X3, Sparkles, X } from "lucide-react";
import { useLocale } from "next-intl";
import AmenitiesGrid from "@/components/tourm/property/AmenitiesGrid";
import PropertySectionCard from "@/components/property/PropertySectionCard";
import { normalizeLocale } from "@/lib/i18n/config";

export type AmenitiesSectionItem = {
  key: string;
  label?: string;
};

export type AmenitiesSectionProps = {
  title?: string;
  items: AmenitiesSectionItem[];
  previewCount?: number;
};

export default function AmenitiesSection({
  title = "Amenities",
  items,
  previewCount = 12,
}: AmenitiesSectionProps) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const resolvedTitle = title === "Amenities" && isAr ? "المرافق" : title;
  const [open, setOpen] = useState(false);

  const cleaned = useMemo(() => {
    const out: AmenitiesSectionItem[] = [];
    for (const it of items) {
      const k = it.key.trim();
      const l = (it.label ?? "").trim();
      if (!k && !l) continue;
      out.push({ key: k || l, label: l || undefined });
    }
    return out;
  }, [items]);

  const previewLimit = Math.min(12, Math.max(1, previewCount));
  const preview = cleaned.slice(0, previewLimit);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  return (
    <>
      <PropertySectionCard>
        <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/82 shadow-[0_6px_14px_rgba(11,15,25,0.08)] ring-1 ring-white/75">
          <Grid3X3 className="h-[19px] w-[19px] stroke-[1.9] text-indigo-600/90" />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-tight text-primary">{resolvedTitle}</div>
          <p className="text-xs text-secondary">
            {isAr
              ? "مرافق أساسية منسقة مع عرض مرئي واضح."
              : "Curated essentials with consistent icon styling."}
          </p>
        </div>
      </div>

        <div className="mt-4">
          <AmenitiesGrid title="" items={preview} columns={3} variant="section" minItems={12} />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs text-secondary">
            {isAr ? `${cleaned.length} مرفقاً` : `${cleaned.length} amenities listed`}
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 transition hover:underline"
          >
            <Sparkles className="h-4 w-4 text-indigo-600/90" />
            {isAr ? "عرض جميع المرافق" : "Show all amenities"}
          </button>
        </div>
      </PropertySectionCard>

      {open ? (
        <div className="fixed inset-0 z-[95]">
          <button
            type="button"
            aria-label={isAr ? "إغلاق نافذة المرافق" : "Close amenities modal"}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-dark-1/50"
          />

          <div className="premium-card premium-card-tinted relative mx-auto mt-4 max-h-[calc(100vh-2rem)] w-[min(92vw,72rem)] overflow-hidden rounded-3xl border border-white/72 shadow-2xl sm:mt-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/75 px-5 py-4 sm:px-6">
              <div>
                <div className="text-xl font-semibold tracking-tight text-primary">
                  {isAr ? "جميع المرافق" : "All amenities"}
                </div>
                <div className="mt-1 text-xs text-secondary">
                  {isAr ? "كل ما يتضمنه هذا السكن." : "Everything included in this stay."}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/82 text-primary ring-1 ring-white/75 transition hover:bg-white"
                aria-label={isAr ? "إغلاق نافذة المرافق" : "Close amenities modal"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[calc(100vh-10.5rem)] overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <AmenitiesGrid title="" items={cleaned} columns={4} variant="section" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
