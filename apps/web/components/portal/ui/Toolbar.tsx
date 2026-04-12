"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PortalCard } from "@/components/portal/ui/PortalCard";
import { SectionHeader } from "@/components/portal/ui/SectionHeader";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Toolbar(props: {
  title: string;
  subtitle?: string;
  searchPlaceholder?: string;
  onSearch?: (q: string) => void;
  right?: React.ReactNode;
  mobileFiltersLabel?: string;
}) {
  const tPortal = useTranslations("portal");
  const [q, setQ] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const placeholder = useMemo(
    () => props.searchPlaceholder ?? tPortal("toolbar.searchPlaceholder"),
    [props.searchPlaceholder, tPortal],
  );
  const filtersLabel = props.mobileFiltersLabel ?? tPortal("toolbar.filters");

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileFiltersOpen]);

  return (
    <PortalCard as="section" padding="lg" className="overflow-hidden">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader title={props.title} subtitle={props.subtitle} divider={false} />

          {props.right ? (
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-warm-base/95 px-4 text-sm font-semibold text-primary ring-1 ring-line/35 shadow-sm hover:bg-accent-soft/22 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filtersLabel}
            </button>
          ) : null}
        </div>

        <div className="portal-divider" />

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-[420px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => {
                const v = e.target.value;
                setQ(v);
                props.onSearch?.(v);
              }}
              placeholder={placeholder}
              className={cn(
                "h-11 w-full min-w-0 rounded-2xl bg-surface/92 pl-10 pr-3 text-base text-primary lg:text-sm",
                "outline-none placeholder:text-muted ring-1 ring-line/28",
                "focus-visible:ring-4 focus-visible:ring-brand/16"
              )}
            />
          </div>

          {props.right ? (
            <div className="hidden min-w-0 flex-wrap items-center justify-start gap-2.5 lg:flex lg:justify-end [&_button]:h-11 [&_button]:px-4 [&_button]:text-sm [&_input]:h-11 [&_input]:text-sm [&_select]:h-11 [&_select]:w-full [&_select]:min-w-[180px] [&_select]:px-4 [&_select]:text-sm xl:[&_select]:w-auto">
              {props.right}
            </div>
          ) : null}
        </div>
      </div>

      {props.right ? (
        <div className={cn("fixed inset-0 z-[80] lg:hidden", mobileFiltersOpen ? "" : "pointer-events-none")}>
          <button
            type="button"
            aria-label={tPortal("toolbar.closeFilters")}
            onClick={() => setMobileFiltersOpen(false)}
            className={cn(
              "absolute inset-0 bg-dark-1/44 backdrop-blur-sm transition-opacity",
              mobileFiltersOpen ? "opacity-100" : "opacity-0",
            )}
          />

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 max-h-[92vh] overflow-hidden rounded-t-[30px] border-t border-line/35 bg-warm-base/98 shadow-[0_-20px_50px_rgba(33,39,53,0.22)]",
              "transition-transform duration-300 ease-out",
              mobileFiltersOpen ? "translate-y-0" : "translate-y-full",
            )}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line/30 bg-warm-base/98 px-4 pb-3 pt-[calc(0.9rem+env(safe-area-inset-top))]">
              <div className="text-sm font-semibold text-primary">{filtersLabel}</div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-warm-base/95 text-primary ring-1 ring-line/35"
                aria-label={tPortal("toolbar.closeFilters")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <div className="grid gap-3 [&_button]:h-11 [&_button]:px-4 [&_button]:text-sm [&_input]:h-11 [&_input]:rounded-2xl [&_input]:bg-warm-base/95 [&_input]:px-4 [&_input]:text-base [&_select]:h-11 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border-line/60 [&_select]:bg-warm-base/95 [&_select]:px-4 [&_select]:text-base">
                {props.right}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PortalCard>
  );
}
