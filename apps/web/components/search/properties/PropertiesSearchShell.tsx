"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SearchResponse, MapPoint } from "@/lib/types/search";
import type { PropertiesQuery } from "@/lib/search/params";
import { buildPropertiesSearchParams, stableStringifyQuery, withPage, withResetPage } from "@/lib/search/params";
import { searchMapViewport } from "@/lib/api/search";
import TourmPropertyCard from "@/components/tourm/property/TourmPropertyCard";
import FiltersPanel from "@/components/search/properties/PropertiesFiltersPanel";
import CurrencySwitcher from "@/components/currency/CurrencySwitcher";

const GoogleMap = dynamic(() => import("@/components/maps/GoogleMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[58vh] min-h-[360px] w-full place-items-center bg-warm-alt/65 sm:h-[64vh] lg:h-[calc(100vh-7.5rem)]" />
  ),
});

type Props = {
  query: PropertiesQuery;
  items: SearchResponse["items"];
  meta: SearchResponse["meta"] | null;
  showFiltersPanel?: boolean;
};

type Bounds = { north: number; south: number; east: number; west: number };
type CardOrientation = "vertical" | "horizontal";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function defaultCenterFromItems(items: SearchResponse["items"]) {
  const first = items.find((x) => typeof x.location?.lat === "number" && typeof x.location?.lng === "number");
  if (typeof first?.location?.lat === "number" && typeof first?.location?.lng === "number") {
    return { lat: first.location.lat, lng: first.location.lng };
  }
  // Dubai-ish default (safe fallback)
  return { lat: 25.2048, lng: 55.2708 };
}

function defaultZoom(items: SearchResponse["items"]) {
  const withCoords = items.filter((x) => typeof x.location?.lat === "number" && typeof x.location?.lng === "number");
  return withCoords.length > 0 ? 11 : 10;
}

export default function PropertiesSearchShell(props: Props) {
  const router = useRouter();
  const t = useTranslations("propertiesShell");
  const showFiltersPanel = props.showFiltersPanel ?? true;

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "map">("cards");

  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // keep a ref to current query to avoid stale closures in viewport fetch
  const queryRef = useRef<PropertiesQuery>(props.query);
  const lastBoundsRef = useRef<Bounds | null>(null);
  useEffect(() => {
    queryRef.current = props.query;
  }, [props.query]);

  const qKey = useMemo(() => stableStringifyQuery(props.query), [props.query]);

  const center = useMemo(() => defaultCenterFromItems(props.items), [props.items]);
  const zoom = useMemo(() => defaultZoom(props.items), [props.items]);
  const itemById = useMemo(() => {
    const map = new Map<string, SearchResponse["items"][number]>();
    for (const item of props.items) map.set(item.id, item);
    return map;
  }, [props.items]);
  const mapRenderPoints = useMemo(
    () =>
      mapPoints.map((point) => {
        const fromCard = itemById.get(point.propertyId);
        if (!fromCard) return point;
        return {
          ...point,
          slug: point.slug ?? fromCard.slug,
          title: point.title ?? fromCard.title,
          propertyType: point.propertyType ?? fromCard.propertyType,
          area: point.area ?? fromCard.location?.area ?? null,
          city: point.city ?? fromCard.location?.city ?? null,
          bedrooms: point.bedrooms ?? fromCard.capacity?.bedrooms ?? null,
          bathrooms: point.bathrooms ?? fromCard.capacity?.bathrooms ?? null,
          coverImage: point.coverImage ?? fromCard.coverImage ?? null,
        };
      }),
    [itemById, mapPoints],
  );

  const pushQuery = useCallback(
    (next: PropertiesQuery) => {
      const sp = buildPropertiesSearchParams(next);
      router.push(`/properties?${sp.toString()}`);
    },
    [router],
  );

  const onChangeFilters = useCallback(
    (partial: Partial<PropertiesQuery>) => {
      const next: PropertiesQuery = withResetPage({
        ...props.query,
        ...partial,
        pageSize: props.query.pageSize,
      });
      pushQuery(next);
    },
    [props.query, pushQuery],
  );

  const onGoToPage = useCallback(
    (page: number) => {
      pushQuery(withPage(props.query, page));
    },
    [props.query, pushQuery],
  );

  const fetchViewport = useCallback(async (b: Bounds) => {
    const q = queryRef.current;

    // backend has viewport safety limits; we also clamp absurd values
    const north = clamp(b.north, -85, 85);
    const south = clamp(b.south, -85, 85);
    const east = clamp(b.east, -180, 180);
    const west = clamp(b.west, -180, 180);
    lastBoundsRef.current = { north, south, east, west };

    setMapLoading(true);
    setMapError(null);

    const res = await searchMapViewport({
      north,
      south,
      east,
      west,
      checkIn: q.checkIn,
      checkOut: q.checkOut,
      guests: q.guests,
      city: q.city,
      area: q.area,
      minPrice: q.minPrice,
      maxPrice: q.maxPrice,
    });

    if (!res.ok) {
      setMapError(res.message || "Failed to load map pins");
      setMapPoints([]);
      setMapLoading(false);
      return;
    }

    setMapPoints(res.data.points);
    setMapLoading(false);
  }, []);

  const retryMapPins = useCallback(() => {
    if (!lastBoundsRef.current) return;
    void fetchViewport(lastBoundsRef.current);
  }, [fetchViewport]);

  const onMarkerClick = useCallback((slug: string) => {
    setActiveSlug(slug);
    const el = document.querySelector(`[data-slug="${slug}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const onMarkerOpen = useCallback((slug: string) => {
    router.push(`/properties/${slug}`);
  }, [router]);

  const totalPages = props.meta ? Math.max(1, Math.ceil(props.meta.total / props.meta.limit)) : 1;
  const page = props.meta?.page ?? props.query.page;

  const renderResultsSection = (gridClassName: string, cardOrientation: CardOrientation = "vertical") => (
    <div className="space-y-5">
      {showFiltersPanel ? (
        <FiltersPanel query={props.query} resultsCount={props.meta?.total ?? null} onChange={onChangeFilters} busyKey={qKey} />
      ) : null}

      <div className={gridClassName}>
        {props.items.map((it) => (
          <div
            key={it.id}
            data-slug={it.slug}
            onMouseEnter={() => setHoveredSlug(it.slug)}
            onMouseLeave={() => setHoveredSlug((s) => (s === it.slug ? null : s))}
          >
            <TourmPropertyCard item={it} orientation={cardOrientation} />
          </div>
        ))}
      </div>

      {props.meta && totalPages > 1 ? (
        <>
          <div className="mt-2 sm:hidden">
            {page < totalPages ? (
              <button
                type="button"
                onClick={() => onGoToPage(page + 1)}
                className="h-11 w-full rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                {t("loadMore")}
              </button>
            ) : (
              <p className="text-center text-xs text-secondary/75">{t("endResults")}</p>
            )}
          </div>

          <div className="mt-2 hidden flex-wrap items-center justify-center gap-2 sm:flex">
            {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
              const p = i + 1;
              const active = p === page;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onGoToPage(p)}
                  className={[
                    "h-11 rounded-xl px-4 text-sm transition",
                    active
                      ? "bg-brand text-text-invert shadow-sm"
                      : "bg-surface text-secondary shadow-sm hover:bg-brand-soft-2",
                  ].join(" ")}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="mt-6 w-full max-w-full overflow-x-hidden space-y-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-secondary">
          {props.meta ? (
            <>
              {t("showing")} <span className="font-semibold text-primary">{props.items.length}</span> {t("of")}{" "}
              <span className="font-semibold text-primary">{props.meta.total}</span>
            </>
          ) : (
            t("browse")
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <CurrencySwitcher compact />

          <div className="inline-flex w-full items-center rounded-full bg-warm-alt p-1 shadow-sm sm:w-auto">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={[
                "h-11 flex-1 rounded-full px-4 text-sm font-medium transition sm:flex-none",
                viewMode === "cards" ? "bg-indigo-600 text-white shadow-sm" : "bg-transparent text-primary hover:bg-surface/70",
              ].join(" ")}
            >
              {t("cardView")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={[
                "h-11 flex-1 rounded-full px-4 text-sm font-medium transition sm:flex-none",
                viewMode === "map" ? "bg-indigo-600 text-white shadow-sm" : "bg-transparent text-primary hover:bg-surface/70",
              ].join(" ")}
            >
              {t("mapCardsView")}
            </button>
          </div>
        </div>
      </div>

      {viewMode === "cards" ? (
        renderResultsSection("grid w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-7")
      ) : (
        <div className="grid w-full max-w-full gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:gap-6">
          <div className="order-2 min-w-0 lg:order-1 lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto lg:scroll-smooth lg:pr-2">
            {renderResultsSection("grid w-full max-w-full grid-cols-1 gap-5 sm:gap-6", "horizontal")}
          </div>

          <div className="order-1 min-w-0 lg:order-2 lg:sticky lg:top-24">
            <div className="relative overflow-hidden rounded-2xl bg-surface shadow-sm">
              <div className="flex items-center justify-between gap-3 bg-bg-2/70 px-4 py-3">
                <div className="text-sm font-semibold text-primary">{t("mapTitle")}</div>
                <div className="text-xs text-secondary">
                  {mapLoading
                    ? t("mapUpdating")
                    : mapError
                      ? t("mapUnavailable")
                      : t("mapPins", { count: mapPoints.length })}
                </div>
              </div>

              <div className="relative">
                <GoogleMap
                  center={center}
                  zoom={zoom}
                  points={mapRenderPoints}
                  hoveredSlug={hoveredSlug}
                  activeSlug={activeSlug}
                  onMarkerClick={onMarkerClick}
                  onMarkerOpen={onMarkerOpen}
                  onViewportChanged={fetchViewport}
                  viewportDebounceMs={520}
                  className="h-[58vh] min-h-[360px] w-full sm:h-[64vh] lg:h-[calc(100vh-7.5rem)]"
                />

                {mapError ? (
                  <div className="absolute inset-x-3 top-3 rounded-xl bg-ink/72 px-3 py-2 text-xs text-inverted backdrop-blur">
                    <div>{mapError}</div>
                    <button
                      type="button"
                      onClick={retryMapPins}
                      className="mt-2 rounded-lg bg-surface/15 px-2 py-1 font-semibold text-inverted hover:bg-surface/25"
                    >
                      {t("retryPins")}
                    </button>
                  </div>
                ) : null}

                {!mapError && !mapLoading && mapPoints.length === 0 ? (
                  <div className="pointer-events-none absolute inset-x-3 top-3 rounded-xl bg-ink/65 px-3 py-2 text-xs text-inverted backdrop-blur">
                    {t("noPins")}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="mt-3 text-xs text-muted">
              {t("pinsFootnote")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
