"use client";

import { OptimizedImage } from "@/components/ui/OptimizedImage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { SearchResponse } from "@/lib/types/search";
import { WishlistHeart } from "@/components/property/WishlistHeart";
import { propertyTypeLabel } from "@/lib/types/property-type";

type Item = SearchResponse["items"][number];
type CardOrientation = "vertical" | "horizontal";

type Slide = {
  key: string;
  url: string;
  alt: string;
};

type DragState = {
  pointerId: number | null;
  down: boolean;
  moved: boolean;
  startX: number;
  startLeft: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

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

export default function TourmPropertyCard({
  item,
  orientation = "vertical",
}: {
  item: Item;
  orientation?: CardOrientation;
}) {
  const t = useTranslations("propertyCard");
  const isHorizontal = orientation === "horizontal";
  const router = useRouter();
  const rawTitle = (item.title ?? t("defaultTitle")).trim();
  const propertyType = propertyTypeLabel(item.propertyType);
  const titleParts = rawTitle
    .split("•")
    .map((part) => part.trim())
    .filter(Boolean);
  const title = titleParts[0] || "Stay";
  const titleLocationSuffix = titleParts.length > 1 ? titleParts.slice(1).join(" • ") : null;
  const area = item.location?.area ?? null;
  const city = item.location?.city ?? null;
  const meta = [area, city].filter(Boolean).join(" • ") || titleLocationSuffix;

  const guests = item.capacity?.maxGuests ?? null;
  const beds = item.capacity?.bedrooms ?? null;
  const baths = item.capacity?.bathrooms ?? null;
  const amenityPills = [
    guests ? t("guests", { count: guests }) : null,
    beds ? t("beds", { count: beds }) : null,
    baths ? t("baths", { count: baths }) : null,
  ].filter((value): value is string => Boolean(value));
  const baseNightly = item.pricing?.nightly ?? null;
  const itemCurrency = item.pricing?.currency ?? "AED";
  const price =
    typeof baseNightly === "number" ? formatMoney(baseNightly, itemCurrency) : null;
  const baseNightlyAed = item.pricing?.nightlyAed;
  const basePriceHint =
    itemCurrency !== "AED" && typeof baseNightlyAed === "number"
      ? t("basePrice", { amount: formatMoney(baseNightlyAed, "AED") })
      : null;

  const slides = useMemo<Slide[]>(() => {
    const output: Slide[] = [];
    const seen = new Set<string>();

    for (const media of item.media ?? []) {
      const url = (media.url ?? "").trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      output.push({
        key: `${url}#${media.sortOrder}`,
        url,
        alt: (media.alt ?? title).trim() || title,
      });
    }

    const cover = item.coverImage?.url?.trim();
    if (cover && !seen.has(cover)) {
      output.unshift({
        key: `${cover}#cover`,
        url: cover,
        alt: (item.coverImage?.alt ?? title).trim() || title,
      });
    }

    return output;
  }, [item.coverImage?.alt, item.coverImage?.url, item.media, title]);

  const railRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState>({
    pointerId: null,
    down: false,
    moved: false,
    startX: 0,
    startLeft: 0,
  });

  const suppressClickRef = useRef(false);

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const slideCount = slides.length;
  const hasMultipleSlides = slideCount > 1;

  const scrollToIndex = useCallback(
    (nextIndex: number, behavior: ScrollBehavior = "smooth") => {
      const rail = railRef.current;
      if (!rail || slideCount <= 0) return;

      const clamped = clamp(nextIndex, 0, slideCount - 1);
      rail.scrollTo({ left: clamped * rail.clientWidth, behavior });
    },
    [slideCount],
  );

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let raf = 0;

    const updateActive = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const next = Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1));
        setActiveIndex(clamp(next, 0, Math.max(0, slideCount - 1)));
      });
    };

    rail.addEventListener("scroll", updateActive, { passive: true });
    updateActive();

    return () => {
      rail.removeEventListener("scroll", updateActive);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [slideCount]);

  useEffect(() => {
    if (!hasMultipleSlides || !isHovered || isDragging) return;

    const timer = window.setInterval(() => {
      const next = (activeIndex + 1) % slideCount;
      scrollToIndex(next);
    }, 1650);

    return () => window.clearInterval(timer);
  }, [activeIndex, hasMultipleSlides, isDragging, isHovered, scrollToIndex, slideCount]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const onResize = () => scrollToIndex(activeIndex, "auto");
    window.addEventListener("resize", onResize, { passive: true });

    return () => window.removeEventListener("resize", onResize);
  }, [activeIndex, scrollToIndex]);

  const onRailPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasMultipleSlides) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const rail = railRef.current;
    if (!rail) return;

    dragRef.current.pointerId = e.pointerId;
    dragRef.current.down = true;
    dragRef.current.moved = false;
    dragRef.current.startX = e.clientX;
    dragRef.current.startLeft = rail.scrollLeft;

    setIsDragging(false);
    rail.setPointerCapture(e.pointerId);
  }, [hasMultipleSlides]);

  const onRailPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail || !dragRef.current.down) return;

    const dx = e.clientX - dragRef.current.startX;

    if (!dragRef.current.moved && Math.abs(dx) > 6) {
      dragRef.current.moved = true;
      setIsDragging(true);
    }

    if (dragRef.current.moved) {
      rail.scrollLeft = dragRef.current.startLeft - dx;
    }
  }, []);

  const endDrag = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail || !dragRef.current.down) return;

    if (e && dragRef.current.pointerId !== null && rail.hasPointerCapture(dragRef.current.pointerId)) {
      rail.releasePointerCapture(dragRef.current.pointerId);
    }

    dragRef.current.pointerId = null;
    dragRef.current.down = false;

    if (dragRef.current.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 180);

      window.setTimeout(() => setIsDragging(false), 120);
      window.setTimeout(() => scrollToIndex(Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1))), 80);
      return;
    }

    setIsDragging(false);
  }, [scrollToIndex]);

  return (
    <article
      className={[
        "premium-card premium-card-tinted premium-card-hover group relative flex h-full cursor-pointer overflow-hidden rounded-2xl transition-all duration-300 ease-out hover:-translate-y-3 hover:shadow-[0_34px_80px_rgba(11,15,25,0.24)] hover:ring-1 hover:ring-indigo-300/45 before:!bg-[linear-gradient(180deg,rgb(99_102_241_/_0.12),transparent_68%)]",
        isHorizontal ? "flex-col md:h-[22rem] md:flex-row" : "flex-col",
      ].join(" ")}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("a,button,input,textarea,select,label,summary,details")) return;
        router.push(`/properties/${item.slug}`);
      }}
    >
      <div
        className={
          isHorizontal
            ? "relative h-[17rem] w-full overflow-hidden md:h-full md:w-[54%] lg:w-[56%] xl:w-[58%]"
            : "relative h-[19rem] w-full overflow-hidden md:h-[20rem] lg:h-[22rem] xl:h-[24rem]"
        }
      >
        {slideCount > 0 ? (
          <div
            ref={railRef}
            className={[
              "no-scrollbar flex h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory",
              isDragging ? "cursor-grabbing" : hasMultipleSlides ? "cursor-grab" : "cursor-default",
            ].join(" ")}
            style={{ touchAction: hasMultipleSlides ? "pan-y pinch-zoom" : "auto" }}
            onPointerDown={onRailPointerDown}
            onPointerMove={onRailPointerMove}
            onPointerUp={(e) => endDrag(e)}
            onPointerCancel={(e) => endDrag(e)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {slides.map((slide, idx) => (
              <Link
                key={slide.key}
                href={`/properties/${item.slug}`}
                className="relative h-full w-full shrink-0 snap-start"
                onClick={(e) => {
                  if (!suppressClickRef.current) return;
                  e.preventDefault();
                  e.stopPropagation();
                }}
                aria-label={t("photoAria", { title, index: idx + 1 })}
              >
                <OptimizedImage
                  src={slide.url}
                  alt={slide.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 640px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.1]"
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-warm-alt to-warm-base" />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/28 via-ink/5 to-transparent transition-colors duration-300 group-hover:from-ink/14 group-hover:via-transparent" />

        <div className="absolute right-3 top-3 z-10">
          <WishlistHeart propertyId={item.id} size={20} />
        </div>

        {hasMultipleSlides ? (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
            {slides.map((slide, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={slide.key}
                  type="button"
                  onClick={() => scrollToIndex(idx)}
                  className={[
                    "rounded-full transition",
                    active ? "h-1.5 w-5 bg-surface" : "h-1.5 w-1.5 bg-surface/55 hover:bg-surface/80",
                  ].join(" ")}
                  aria-label={t("showImageAria", { index: idx + 1 })}
                />
              );
            })}
          </div>
        ) : null}
      </div>

        <div className={isHorizontal ? "flex flex-1 flex-col gap-3 p-4 md:p-5 lg:p-6" : "flex flex-1 flex-col gap-3 p-4 md:p-5"}>
        <div className="flex-1 flex flex-col gap-2.5">
          <div className="inline-flex items-center self-start rounded-full bg-indigo-100/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
            {propertyType}
          </div>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-primary md:text-xl">
            <Link href={`/properties/${item.slug}`} className="transition hover:text-secondary">
              {title}
            </Link>
          </h3>

          {meta ? <p className="line-clamp-1 text-sm text-neutral-500">{meta}</p> : null}
        </div>

        {isHorizontal ? (
          <div className="mt-auto space-y-3 pt-3">
            <div className="flex flex-wrap gap-2">
              {amenityPills.map((pill) => (
                <span key={pill} className="rounded-full bg-indigo-100/85 px-3 py-1 text-xs font-medium text-indigo-700">
                  {pill}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {price ? t("perNight", { price }) : t("priceOnRequest")}
                </p>
                {basePriceHint ? <p className="mt-0.5 text-[11px] text-neutral-500">{basePriceHint}</p> : null}
              </div>

              <Link
                href={`/properties/${item.slug}#book`}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                {t("view")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-auto space-y-3 pt-3">
            <div className="flex flex-wrap gap-2">
              {guests ? (
                <span className="rounded-full bg-indigo-100/85 px-3 py-1 text-xs font-medium text-indigo-700">
                  {t("guests", { count: guests })}
                </span>
              ) : null}
              {beds ? (
                <span className="rounded-full bg-indigo-100/85 px-3 py-1 text-xs font-medium text-indigo-700">
                  {t("beds", { count: beds })}
                </span>
              ) : null}
              {baths ? (
                <span className="rounded-full bg-indigo-100/85 px-3 py-1 text-xs font-medium text-indigo-700">
                  {t("baths", { count: baths })}
                </span>
                ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-neutral-200/70 pt-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary">
                  {price ? t("perNight", { price }) : t("priceOnRequest")}
                </p>
                {basePriceHint ? <p className="mt-0.5 text-[11px] text-neutral-500">{basePriceHint}</p> : null}
              </div>

              <Link
                href={`/properties/${item.slug}#book`}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
              >
                {t("view")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
