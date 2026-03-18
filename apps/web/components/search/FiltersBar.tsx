"use client";

import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bath,
  BedDouble,
  Check,
  MapPin,
  Minus,
  Plus,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { AMENITY_CATALOG, type AmenityKey } from "@/components/icons/amenities";

type SortValue = "relevance" | "recommended" | "price_asc" | "price_desc" | "newest";

type FiltersState = {
  q: string;
  city: string;
  area: string;
  guests: number | "";
  bedrooms: number | "";
  bathrooms: number | "";
  minPrice: number | "";
  maxPrice: number | "";
  amenities: AmenityKey[];
  sort: SortValue;
};

type FiltersBarProps = {
  label?: string;
  triggerClassName?: string;
};

const DUBAI_CITY = "Dubai";

const EMPTY_STATE: FiltersState = {
  q: "",
  city: DUBAI_CITY,
  area: "",
  guests: "",
  bedrooms: "",
  bathrooms: "",
  minPrice: "",
  maxPrice: "",
  amenities: [],
  sort: "relevance",
};

const CITY_OPTIONS = [
  { value: DUBAI_CITY, label: DUBAI_CITY },
] as const;

const DUBAI_PRESETS = [
  "Dubai Marina",
  "Downtown Dubai",
  "JBR",
  "Business Bay",
  "Palm Jumeirah",
  "DIFC",
  "JLT",
  "Al Barsha",
] as const;

const FEATURED_AMENITIES: AmenityKey[] = [
  "WIFI",
  "POOL",
  "GYM",
  "PARKING_FREE",
  "AIR_CONDITIONING",
  "KITCHEN",
  "WASHER",
  "ELEVATOR",
  "PET_FRIENDLY",
  "NO_SMOKING",
  "FAMILY_FRIENDLY",
  "BALCONY",
  "SEA_VIEW",
  "CITY_VIEW",
  "WORKSPACE",
  "NETFLIX",
  "CONCIERGE",
  "24H_CHECKIN",
  "HOUSEKEEPING",
  "SECURITY",
  "SMOKE_ALARM",
  "FIRST_AID",
  "CCTV",
  "DOORMAN",
];

const SORT_OPTIONS: Array<{ value: SortValue; label: string; hint: string }> = [
  { value: "relevance", label: "Relevance", hint: "Best overall match" },
  { value: "recommended", label: "Recommended", hint: "Balanced quality and value" },
  { value: "price_asc", label: "Price: Low to high", hint: "Lowest nightly rate first" },
  { value: "price_desc", label: "Price: High to low", hint: "Premium stays first" },
  { value: "newest", label: "Newest", hint: "Most recently added listings" },
];

const PRICE_PRESETS: Array<{ id: string; label: string; min: number | ""; max: number | "" }> = [
  { id: "under-500", label: "Up to 500", min: "", max: 500 },
  { id: "500-1000", label: "500 - 1,000", min: 500, max: 1000 },
  { id: "1000-2000", label: "1,000 - 2,000", min: 1000, max: 2000 },
  { id: "2000-plus", label: "2,000+", min: 2000, max: "" },
];

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseNumber(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseSort(v: string | null): SortValue {
  switch (v) {
    case "recommended":
    case "price_asc":
    case "price_desc":
    case "newest":
    case "relevance":
      return v;
    default:
      return "relevance";
  }
}

function parseAmenities(v: string | null): AmenityKey[] {
  if (!v) return [];
  const raw = v
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const out: AmenityKey[] = [];
  for (const r of raw) {
    if (Object.prototype.hasOwnProperty.call(AMENITY_CATALOG, r)) out.push(r as AmenityKey);
  }

  return Array.from(new Set(out));
}

function encodeAmenities(list: AmenityKey[]): string | null {
  const unique = Array.from(new Set(list)).filter(Boolean);
  return unique.length ? unique.join(",") : null;
}

function buildUrl(pathname: string, sp: URLSearchParams) {
  const s = sp.toString();
  return s ? `${pathname}?${s}` : pathname;
}

function setOrDelete(sp: URLSearchParams, key: string, val: string | number | null | undefined) {
  if (val === null || val === undefined) {
    sp.delete(key);
    return;
  }

  const s = String(val).trim();
  if (!s) sp.delete(key);
  else sp.set(key, s);
}

function parseInputNumber(v: string): number | "" {
  const cleaned = v.replace(/[^\d]/g, "").trim();
  if (!cleaned) return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  return Math.max(0, Math.round(n));
}

function normalizeText(v: string) {
  return v.trim().replace(/\s+/g, " ");
}

function normalizeFiltersState(raw: FiltersState): FiltersState {
  const guests = raw.guests === "" ? "" : clampInt(raw.guests, 1, 16);
  const bedrooms = raw.bedrooms === "" ? "" : clampInt(raw.bedrooms, 1, 20);
  const bathrooms = raw.bathrooms === "" ? "" : clampInt(raw.bathrooms, 1, 20);

  let minPrice: number | "" = raw.minPrice === "" ? "" : Math.max(0, Math.round(raw.minPrice));
  let maxPrice: number | "" = raw.maxPrice === "" ? "" : Math.max(0, Math.round(raw.maxPrice));

  if (minPrice !== "" && maxPrice !== "" && minPrice > maxPrice) {
    const swap = minPrice;
    minPrice = maxPrice;
    maxPrice = swap;
  }

  return {
    q: normalizeText(raw.q),
    city: DUBAI_CITY,
    area: normalizeText(raw.area),
    guests,
    bedrooms,
    bathrooms,
    minPrice,
    maxPrice,
    amenities: Array.from(new Set(raw.amenities)).filter((key) => key !== "OTHER"),
    sort: parseSort(raw.sort),
  };
}

function countActiveFilters(s: FiltersState) {
  let count = 0;
  if (s.q) count += 1;
  if (s.area) count += 1;
  if (s.guests !== "") count += 1;
  if (s.bedrooms !== "") count += 1;
  if (s.bathrooms !== "") count += 1;
  if (s.minPrice !== "") count += 1;
  if (s.maxPrice !== "") count += 1;
  if (s.amenities.length > 0) count += 1;
  if (s.sort !== "relevance") count += 1;
  return count;
}

type CounterFieldProps = {
  label: string;
  hint: string;
  Icon: ComponentType<{ className?: string }>;
  min: number;
  max: number;
  value: number | "";
  onChange: (next: number | "") => void;
};

function CounterField(props: CounterFieldProps) {
  function increment() {
    if (props.value === "") {
      props.onChange(props.min);
      return;
    }
    props.onChange(clampInt(props.value + 1, props.min, props.max));
  }

  function decrement() {
    if (props.value === "") return;
    if (props.value <= props.min) {
      props.onChange("");
      return;
    }
    props.onChange(clampInt(props.value - 1, props.min, props.max));
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-neutral-900">{props.label}</div>
          <div className="text-xs text-neutral-500">{props.hint}</div>
        </div>
        <props.Icon className="mt-0.5 h-4 w-4 text-neutral-500" />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-1.5">
        <button
          type="button"
          onClick={decrement}
          disabled={props.value === ""}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${props.label}`}
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="text-sm font-semibold text-neutral-900">{props.value === "" ? "Any" : props.value}</div>

        <button
          type="button"
          onClick={increment}
          disabled={props.value !== "" && props.value >= props.max}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-900 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Increase ${props.label}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function FiltersBar(props: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [open, setOpen] = useState(false);

  const fromUrl = useMemo<FiltersState>(() => {
    const q = normalizeText(sp.get("q") ?? "");
    const area = normalizeText(sp.get("area") ?? "");

    const guestsN = parseNumber(sp.get("guests"));
    const bedroomsN = parseNumber(sp.get("bedrooms"));
    const bathroomsN = parseNumber(sp.get("bathrooms"));

    const minPriceN = parseNumber(sp.get("minPrice"));
    const maxPriceN = parseNumber(sp.get("maxPrice"));

    return normalizeFiltersState({
      q,
      city: DUBAI_CITY,
      area,
      guests: guestsN === null ? "" : guestsN,
      bedrooms: bedroomsN === null ? "" : bedroomsN,
      bathrooms: bathroomsN === null ? "" : bathroomsN,
      minPrice: minPriceN === null ? "" : minPriceN,
      maxPrice: maxPriceN === null ? "" : maxPriceN,
      amenities: parseAmenities(sp.get("amenities")),
      sort: parseSort(sp.get("sort")),
    });
  }, [sp]);

  const [draft, setDraft] = useState<FiltersState>(fromUrl);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const appliedCount = useMemo(() => countActiveFilters(fromUrl), [fromUrl]);
  const draftCount = useMemo(() => countActiveFilters(normalizeFiltersState(draft)), [draft]);

  const amenityKeys = useMemo(() => {
    const fallback = (Object.keys(AMENITY_CATALOG) as AmenityKey[]).filter((key) => key !== "OTHER");
    return Array.from(new Set([...FEATURED_AMENITIES, ...fallback])).filter((key) => key !== "OTHER");
  }, []);

  const pushState = useCallback(
    (nextRaw: FiltersState) => {
      const next = normalizeFiltersState(nextRaw);
      const nextSp = new URLSearchParams(sp.toString());
      nextSp.set("page", "1");

      setOrDelete(nextSp, "q", next.q || null);
      setOrDelete(nextSp, "city", DUBAI_CITY);
      setOrDelete(nextSp, "area", next.area || null);
      setOrDelete(nextSp, "guests", next.guests === "" ? null : next.guests);
      setOrDelete(nextSp, "bedrooms", next.bedrooms === "" ? null : next.bedrooms);
      setOrDelete(nextSp, "bathrooms", next.bathrooms === "" ? null : next.bathrooms);
      setOrDelete(nextSp, "minPrice", next.minPrice === "" ? null : next.minPrice);
      setOrDelete(nextSp, "maxPrice", next.maxPrice === "" ? null : next.maxPrice);
      setOrDelete(nextSp, "amenities", encodeAmenities(next.amenities));
      setOrDelete(nextSp, "sort", next.sort === "relevance" ? null : next.sort);

      router.push(buildUrl(pathname, nextSp));
    },
    [pathname, router, sp],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDraft(fromUrl);
          setOpen(true);
        }}
        className={
          props.triggerClassName ??
          "inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:border-indigo-300 hover:bg-indigo-50"
        }
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>{props.label ?? "Filters"}</span>
        {appliedCount > 0 ? (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">{appliedCount}</span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              aria-label="Close filters"
              className="absolute inset-0 bg-dark-1/46 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="absolute inset-x-0 bottom-0 max-h-[95dvh] w-full overflow-hidden rounded-t-3xl border-t border-neutral-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 text-neutral-900 shadow-2xl sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:max-h-[88vh] sm:w-[min(1040px,calc(100vw-2.5rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:px-6 sm:pb-5 sm:pt-5"
              initial={{ y: 22, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label="Property filters"
            >
              <div className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
                <div>
                  <div className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-xl">Refine your stays</div>
                  <div className="mt-1 text-sm text-neutral-500">Choose filters, apply once, and keep everything URL-safe.</div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white transition hover:bg-neutral-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 max-h-[calc(95dvh-11.5rem)] space-y-4 overflow-y-auto pb-24 sm:max-h-[calc(88vh-10.25rem)] sm:pb-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-semibold text-neutral-900">Location & keyword</div>
                    <div className="mt-1 text-xs text-neutral-500">City, area, and optional keyword.</div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <div className="mb-1 text-xs font-semibold text-neutral-500">City</div>
                        <select
                          value={draft.city}
                          onChange={() => undefined}
                          disabled
                          className="h-11 w-full cursor-not-allowed rounded-xl border border-neutral-200 bg-neutral-100 px-3 text-sm font-semibold text-neutral-700 outline-none"
                        >
                          {CITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <div className="mb-1 text-xs font-semibold text-neutral-500">Area</div>
                        <input
                          value={draft.area}
                          onChange={(event) => setDraft((state) => ({ ...state, area: event.target.value }))}
                          placeholder="e.g. Dubai Marina"
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-indigo-400"
                        />
                      </label>
                    </div>

                    <label className="mt-3 block">
                      <div className="mb-1 text-xs font-semibold text-neutral-500">Keyword</div>
                      <input
                        value={draft.q}
                        onChange={(event) => setDraft((state) => ({ ...state, q: event.target.value }))}
                        placeholder="Community, tower, landmark..."
                        className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-indigo-400"
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {DUBAI_PRESETS.map((area) => {
                        const active = draft.area.toLowerCase() === area.toLowerCase();
                        return (
                          <button
                            key={area}
                            type="button"
                            onClick={() => setDraft((state) => ({ ...state, city: state.city || DUBAI_CITY, area }))}
                            className={[
                              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition",
                              active
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-neutral-200 bg-white text-neutral-800 hover:border-indigo-300 hover:bg-indigo-50",
                            ].join(" ")}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            {area}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-semibold text-neutral-900">Guests & rooms</div>
                    <div className="mt-1 text-xs text-neutral-500">Set flexible minimums. Leave as Any when open.</div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <CounterField
                        label="Guests"
                        hint="How many people"
                        Icon={Users}
                        min={1}
                        max={16}
                        value={draft.guests}
                        onChange={(next) => setDraft((state) => ({ ...state, guests: next }))}
                      />
                      <CounterField
                        label="Bedrooms"
                        hint="Minimum bedrooms"
                        Icon={BedDouble}
                        min={1}
                        max={20}
                        value={draft.bedrooms}
                        onChange={(next) => setDraft((state) => ({ ...state, bedrooms: next }))}
                      />
                      <CounterField
                        label="Bathrooms"
                        hint="Minimum bathrooms"
                        Icon={Bath}
                        min={1}
                        max={20}
                        value={draft.bathrooms}
                        onChange={(next) => setDraft((state) => ({ ...state, bathrooms: next }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-semibold text-neutral-900">Price range</div>
                    <div className="mt-1 text-xs text-neutral-500">Nightly range. Leave blank for open range.</div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label>
                        <div className="mb-1 text-xs font-semibold text-neutral-500">Minimum</div>
                        <input
                          inputMode="numeric"
                          value={draft.minPrice === "" ? "" : String(draft.minPrice)}
                          onChange={(event) =>
                            setDraft((state) => ({
                              ...state,
                              minPrice: parseInputNumber(event.target.value),
                            }))
                          }
                          placeholder="No min"
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-indigo-400"
                        />
                      </label>

                      <label>
                        <div className="mb-1 text-xs font-semibold text-neutral-500">Maximum</div>
                        <input
                          inputMode="numeric"
                          value={draft.maxPrice === "" ? "" : String(draft.maxPrice)}
                          onChange={(event) =>
                            setDraft((state) => ({
                              ...state,
                              maxPrice: parseInputNumber(event.target.value),
                            }))
                          }
                          placeholder="No max"
                          className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-indigo-400"
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {PRICE_PRESETS.map((preset) => {
                        const active = draft.minPrice === preset.min && draft.maxPrice === preset.max;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              setDraft((state) => ({
                                ...state,
                                minPrice: preset.min,
                                maxPrice: preset.max,
                              }))
                            }
                            className={[
                              "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition",
                              active
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-neutral-200 bg-white text-neutral-800 hover:border-indigo-300 hover:bg-indigo-50",
                            ].join(" ")}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="text-sm font-semibold text-neutral-900">Sort results</div>
                    <div className="mt-1 text-xs text-neutral-500">Choose how listings should be ranked.</div>

                    <div className="mt-3 space-y-2">
                      {SORT_OPTIONS.map((option) => {
                        const active = draft.sort === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setDraft((state) => ({ ...state, sort: option.value }))}
                            className={[
                              "flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                              active
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-neutral-200 bg-white hover:border-indigo-300 hover:bg-indigo-50",
                            ].join(" ")}
                          >
                            <div>
                              <div className="text-sm font-semibold text-neutral-900">{option.label}</div>
                              <div className="text-xs text-neutral-500">{option.hint}</div>
                            </div>
                            {active ? <Check className="mt-0.5 h-4 w-4 text-indigo-600" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-neutral-900">Amenities</div>
                      <div className="mt-1 text-xs text-neutral-500">Select multiple amenities for exact property fit.</div>
                    </div>

                    {draft.amenities.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setDraft((state) => ({ ...state, amenities: [] }))}
                        className="inline-flex h-8 items-center rounded-full border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {amenityKeys.map((amenity) => {
                      const meta = AMENITY_CATALOG[amenity];
                      const active = draft.amenities.includes(amenity);

                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() =>
                            setDraft((state) => {
                              const has = state.amenities.includes(amenity);
                              const amenities = has
                                ? state.amenities.filter((item) => item !== amenity)
                                : [...state.amenities, amenity];
                              return { ...state, amenities };
                            })
                          }
                          className={[
                            "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition",
                            active
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-neutral-200 bg-white text-neutral-800 hover:border-indigo-300 hover:bg-indigo-50",
                          ].join(" ")}
                        >
                          <meta.Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 border-t border-neutral-200 bg-white/95 px-4 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 sm:pb-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs font-medium text-neutral-500">
                    {draftCount > 0
                      ? `${draftCount} filter${draftCount > 1 ? "s" : ""} selected`
                      : "No filters selected"}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(EMPTY_STATE);
                      }}
                      className="h-11 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
                    >
                      Reset
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        pushState(draft);
                        setOpen(false);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(79,70,229,0.25)] transition hover:bg-indigo-700"
                    >
                      Apply filters
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
