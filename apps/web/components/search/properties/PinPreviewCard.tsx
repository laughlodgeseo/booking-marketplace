"use client";

import type { SearchResponse } from "@/lib/types/search";
import Image from "next/image";
import { X, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

type Item = SearchResponse["items"][number];

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function PinPreviewCard(props: {
  item: Item;
  onClose: () => void;
  onOpen: () => void;
}) {
  const t = useTranslations("pinPreview");
  const img = props.item.coverImage?.url ?? null;
  const title = props.item.title ?? t("defaultTitle");
  const area = props.item.location?.area ?? null;
  const city = props.item.location?.city ?? null;
  const meta = [area, city].filter(Boolean).join(" • ");

  const baseNightly = props.item.pricing?.nightly ?? null;
  const itemCurrency = props.item.pricing?.currency ?? "AED";
  const price =
    typeof baseNightly === "number" ? formatMoney(baseNightly, itemCurrency) : null;

  return (
    <div className="rounded-2xl border border-inverted/10 bg-dark-1/55 p-3 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-1 text-sm font-semibold text-inverted">{title}</div>
          <div className="mt-0.5 line-clamp-1 text-xs text-inverted/70">{meta || t("defaultLocation")}</div>
          {price ? (
            <div className="mt-1 text-xs font-semibold text-inverted/90">
              {price} <span className="font-normal text-inverted/70">{t("perNight")}</span>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={props.onClose}
          className="rounded-lg border border-inverted/10 bg-surface/[0.06] p-2 text-inverted/80 hover:bg-surface/[0.10]"
          aria-label={t("closePreview")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-3">
        <div className="relative h-16 w-24 flex-none overflow-hidden rounded-xl border border-inverted/10 bg-surface/[0.04]">
          {img ? (
            <Image
              src={img}
              alt={props.item.coverImage?.alt ?? title}
              width={96}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={props.onOpen}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-inverted/10 bg-surface/[0.06] px-3 py-2 text-xs font-semibold text-inverted hover:bg-surface/[0.10]"
        >
          {t("openListing")} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
