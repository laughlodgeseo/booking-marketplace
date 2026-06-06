"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";
import { AMENITY_CATALOG, type AmenityKey } from "@/components/icons/amenities";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

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

const CITY_OPTIONS = [{ value: DUBAI_CITY, label: DUBAI_CITY }] as const;

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
  "WIFI_BACKUP",
  "AIR_CONDITIONING",
  "HEATING",
  "KITCHEN",
  "MICROWAVE",
  "OVEN",
  "KETTLE",
  "REFRIGERATOR",
  "WASHER",
  "DRYER",
  "HOT_WATER",
  "POOL",
  "GYM",
  "PARKING_FREE",
  "ELEVATOR",
  "SECURITY",
  "DOORMAN",
  "CCTV",
  "SMOKE_ALARM",
  "FIRE_EXTINGUISHER",
  "FIRST_AID",
  "PET_FRIENDLY",
  "NO_SMOKING",
  "FAMILY_FRIENDLY",
  "BALCONY",
  "SEA_VIEW",
  "CITY_VIEW",
  "WORKSPACE",
  "NETFLIX",
  "CONCIERGE",
  "COFFEE",
  "SOUND_SYSTEM",
  "SOFA",
  "DESK",
  "24H_CHECKIN",
  "HOUSEKEEPING",
];

const SORT_OPTIONS: Array<{ value: SortValue; label: string; hint: string }> = [
  { value: "relevance", label: "Relevance", hint: "Best overall match" },
  { value: "recommended", label: "Recommended", hint: "Balanced quality and value" },
  { value: "price_asc", label: "Price: Low to high", hint: "Lowest nightly rate first" },
  { value: "price_desc", label: "Price: High to low", hint: "Premium stays first" },
  { value: "newest", label: "Newest", hint: "Most recently listed" },
];

const PRICE_PRESETS: Array<{ id: string; label: string; min: number | ""; max: number | "" }> = [
  { id: "under-500", label: "Up to 500", min: "", max: 500 },
  { id: "500-1000", label: "500 – 1,000", min: 500, max: 1000 },
  { id: "1000-2000", label: "1,000 – 2,000", min: 1000, max: 2000 },
  { id: "2000-plus", label: "2,000+", min: 2000, max: "" },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

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
  const raw = v.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
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
  if (val === null || val === undefined) { sp.delete(key); return; }
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
    const swap = minPrice; minPrice = maxPrice; maxPrice = swap;
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

// ─── CounterRow — compact inline counter ──────────────────────────────────────

type CounterRowProps = {
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number | "";
  onChange: (next: number | "") => void;
};

function CounterRow(props: CounterRowProps) {
  function increment() {
    if (props.value === "") { props.onChange(props.min); return; }
    props.onChange(clampInt(props.value + 1, props.min, props.max));
  }
  function decrement() {
    if (props.value === "") return;
    if (props.value <= props.min) { props.onChange(""); return; }
    props.onChange(clampInt(props.value - 1, props.min, props.max));
  }
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <span className="text-sm font-medium text-slate-800">{props.label}</span>
        {props.hint ? (
          <span className="ml-2 text-xs text-slate-400">{props.hint}</span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={props.value === ""}
          aria-label={`Decrease ${props.label}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e0d6c8] bg-white text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums text-slate-900">
          {props.value === "" ? "Any" : props.value}
        </span>
        <button
          type="button"
          onClick={increment}
          disabled={props.value !== "" && props.value >= props.max}
          aria-label={`Increase ${props.label}`}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e0d6c8] bg-white text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ─── Shared card / input styles ───────────────────────────────────────────────

const CARD = "rounded-[20px] border border-[#eadfce] bg-white/72 p-5 shadow-[0_8px_24px_rgba(41,32,18,0.05)]";
const CARD_TITLE = "text-sm font-semibold text-slate-800";
const CARD_HINT = "mt-0.5 text-xs text-slate-400";
const INPUT = [
  "h-11 w-full rounded-xl border border-[#e7dccb] bg-white px-3.5 text-sm",
  "text-slate-900 placeholder:text-slate-400 outline-none",
  "transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20",
].join(" ");
const LABEL_TEXT = "mb-1.5 block text-xs font-semibold text-slate-500";
const PRESET_BASE = "inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";
const PRESET_ACTIVE = "border-indigo-600 bg-indigo-600 text-white";
const PRESET_IDLE = "border-[#e7dccb] bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50";

// ─── Main component ────────────────────────────────────────────────────────────

export default function FiltersBar(props: FiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  const [open, setOpen] = useState(false);

  // ── Parse current URL state ──────────────────────────────────────────────
  const fromUrl = useMemo<FiltersState>(() => {
    return normalizeFiltersState({
      q: normalizeText(sp.get("q") ?? ""),
      city: DUBAI_CITY,
      area: normalizeText(sp.get("area") ?? ""),
      guests: (() => { const n = parseNumber(sp.get("guests")); return n === null ? "" : n; })(),
      bedrooms: (() => { const n = parseNumber(sp.get("bedrooms")); return n === null ? "" : n; })(),
      bathrooms: (() => { const n = parseNumber(sp.get("bathrooms")); return n === null ? "" : n; })(),
      minPrice: (() => { const n = parseNumber(sp.get("minPrice")); return n === null ? "" : n; })(),
      maxPrice: (() => { const n = parseNumber(sp.get("maxPrice")); return n === null ? "" : n; })(),
      amenities: parseAmenities(sp.get("amenities")),
      sort: parseSort(sp.get("sort")),
    });
  }, [sp]);

  const [draft, setDraft] = useState<FiltersState>(fromUrl);

  // ── Open / close ─────────────────────────────────────────────────────────
  function openDialog() {
    setDraft(fromUrl);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    requestAnimationFrame(() => { triggerRef.current?.focus(); });
  }

  // Focus close button when dialog opens
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => { closeButtonRef.current?.focus(); }, 80);
    return () => clearTimeout(id);
  }, [open]);

  // Scroll lock + Escape + focus trap
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function getFocusable(): HTMLElement[] {
      if (!dialogRef.current) return [];
      return Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { closeDialog(); return; }
      if (e.key === "Tab") {
        const els = getFocusable();
        if (els.length === 0) { e.preventDefault(); return; }
        const first = els[0];
        const last = els[els.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !dialogRef.current?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !dialogRef.current?.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Counts ───────────────────────────────────────────────────────────────
  const appliedCount = useMemo(() => countActiveFilters(fromUrl), [fromUrl]);
  const draftCount = useMemo(() => countActiveFilters(normalizeFiltersState(draft)), [draft]);

  // ── Amenity keys ─────────────────────────────────────────────────────────
  const amenityKeys = useMemo(() => {
    const fallback = (Object.keys(AMENITY_CATALOG) as AmenityKey[]).filter((k) => k !== "OTHER");
    return Array.from(new Set([...FEATURED_AMENITIES, ...fallback])).filter((k) => k !== "OTHER");
  }, []);

  // ── Apply filters ─────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openDialog}
        className={
          props.triggerClassName ??
          "inline-flex h-11 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 transition hover:border-indigo-300 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
        }
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        <span>{props.label ?? "Filters"}</span>
        {appliedCount > 0 ? (
          <span
            className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white"
            aria-label={`${appliedCount} active filter${appliedCount > 1 ? "s" : ""}`}
          >
            {appliedCount}
          </span>
        ) : null}
      </button>

      {/* ── Portal overlay ─────────────────────────────────────────────── */}
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="filters-overlay"
                  className="fixed inset-0 z-[999]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {/* Backdrop */}
                  <button
                    type="button"
                    aria-label="Close filters"
                    tabIndex={-1}
                    className="absolute inset-0 cursor-default bg-slate-950/48 backdrop-blur-[2.5px]"
                    onClick={closeDialog}
                  />

                  {/* Positioning wrapper
                      – mobile: sheet from bottom
                      – sm+: centered dialog clearing the header (~104px)
                  */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-start sm:justify-center sm:px-6 sm:pt-[108px] sm:pb-8">
                    <motion.section
                      ref={dialogRef}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="ll-filters-title"
                      className="pointer-events-auto relative flex w-full max-h-[87dvh] flex-col overflow-hidden rounded-t-[28px] border border-[#e4d9c8] bg-[#fffaf3] shadow-[0_-6px_56px_rgba(14,11,40,0.18)] sm:max-h-[calc(100dvh-148px)] sm:w-[min(1120px,calc(100vw-48px))] sm:rounded-[28px] sm:shadow-[0_36px_110px_rgba(12,10,38,0.40)]"
                      initial={{ y: 44, opacity: 0.7 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 44, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {/* Mobile drag handle */}
                      <div
                        aria-hidden="true"
                        className="mx-auto mb-0.5 mt-3 h-1.5 w-12 shrink-0 rounded-full bg-[#d8cfbf] sm:hidden"
                      />

                      {/* ── Dialog header ──────────────────────────────── */}
                      <div className="shrink-0 border-b border-[#eadfce] px-5 pb-4 pt-4 sm:px-8 sm:pb-5 sm:pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2
                              id="ll-filters-title"
                              className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
                            >
                              Refine your stays
                            </h2>
                            <p className="mt-0.5 text-sm text-slate-500">
                              Choose the details that match your Dubai stay.
                            </p>
                          </div>
                          <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={closeDialog}
                            aria-label="Close filters"
                            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e7dccb] bg-white text-slate-600 transition hover:bg-[#f0e8db] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                          >
                            <X className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {/* ── Scrollable body ────────────────────────────── */}
                      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
                        <div className="grid gap-4 sm:grid-cols-2">

                          {/* Location & keyword */}
                          <div className={CARD}>
                            <p className={CARD_TITLE}>Location</p>
                            <p className={CARD_HINT}>City, area, or keyword.</p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className={LABEL_TEXT}>City</span>
                                <select
                                  value={draft.city}
                                  onChange={() => undefined}
                                  disabled
                                  className="h-11 w-full cursor-not-allowed rounded-xl border border-[#e7dccb] bg-[#f7f2eb] px-3.5 text-sm font-semibold text-slate-500 outline-none"
                                >
                                  {CITY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="block">
                                <span className={LABEL_TEXT}>Area</span>
                                <input
                                  value={draft.area}
                                  onChange={(e) => setDraft((s) => ({ ...s, area: e.target.value }))}
                                  placeholder="e.g. Dubai Marina"
                                  className={INPUT}
                                />
                              </label>
                            </div>

                            <label className="mt-3 block">
                              <span className={LABEL_TEXT}>Keyword</span>
                              <input
                                value={draft.q}
                                onChange={(e) => setDraft((s) => ({ ...s, q: e.target.value }))}
                                placeholder="Tower, community, landmark…"
                                className={INPUT}
                              />
                            </label>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {DUBAI_PRESETS.map((area) => {
                                const active = draft.area.toLowerCase() === area.toLowerCase();
                                return (
                                  <button
                                    key={area}
                                    type="button"
                                    onClick={() => setDraft((s) => ({ ...s, city: DUBAI_CITY, area }))}
                                    className={[PRESET_BASE, active ? PRESET_ACTIVE : PRESET_IDLE].join(" ")}
                                  >
                                    <MapPin className="mr-1 h-3 w-3" aria-hidden="true" />
                                    {area}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Guests & rooms */}
                          <div className={CARD}>
                            <p className={CARD_TITLE}>Guests & rooms</p>
                            <p className={CARD_HINT}>Set flexible minimums — leave as Any when open.</p>

                            <div className="mt-3 divide-y divide-[#f0e8db]">
                              <CounterRow
                                label="Guests"
                                hint="people"
                                min={1}
                                max={16}
                                value={draft.guests}
                                onChange={(v) => setDraft((s) => ({ ...s, guests: v }))}
                              />
                              <CounterRow
                                label="Bedrooms"
                                hint="min."
                                min={1}
                                max={20}
                                value={draft.bedrooms}
                                onChange={(v) => setDraft((s) => ({ ...s, bedrooms: v }))}
                              />
                              <CounterRow
                                label="Bathrooms"
                                hint="min."
                                min={1}
                                max={20}
                                value={draft.bathrooms}
                                onChange={(v) => setDraft((s) => ({ ...s, bathrooms: v }))}
                              />
                            </div>
                          </div>

                          {/* Price range */}
                          <div className={CARD}>
                            <p className={CARD_TITLE}>Price range</p>
                            <p className={CARD_HINT}>Nightly rate in AED. Leave blank for any price.</p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className={LABEL_TEXT}>Minimum</span>
                                <input
                                  inputMode="numeric"
                                  value={draft.minPrice === "" ? "" : String(draft.minPrice)}
                                  onChange={(e) =>
                                    setDraft((s) => ({ ...s, minPrice: parseInputNumber(e.target.value) }))
                                  }
                                  placeholder="No min"
                                  className={INPUT}
                                />
                              </label>
                              <label className="block">
                                <span className={LABEL_TEXT}>Maximum</span>
                                <input
                                  inputMode="numeric"
                                  value={draft.maxPrice === "" ? "" : String(draft.maxPrice)}
                                  onChange={(e) =>
                                    setDraft((s) => ({ ...s, maxPrice: parseInputNumber(e.target.value) }))
                                  }
                                  placeholder="No max"
                                  className={INPUT}
                                />
                              </label>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {PRICE_PRESETS.map((preset) => {
                                const active =
                                  draft.minPrice === preset.min && draft.maxPrice === preset.max;
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() =>
                                      setDraft((s) => ({ ...s, minPrice: preset.min, maxPrice: preset.max }))
                                    }
                                    className={[PRESET_BASE, active ? PRESET_ACTIVE : PRESET_IDLE].join(" ")}
                                  >
                                    {preset.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Sort */}
                          <div className={CARD}>
                            <p className={CARD_TITLE}>Sort results</p>
                            <p className={CARD_HINT}>Choose how listings are ranked.</p>

                            <div className="mt-4 space-y-2">
                              {SORT_OPTIONS.map((opt) => {
                                const active = draft.sort === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setDraft((s) => ({ ...s, sort: opt.value }))}
                                    className={[
                                      "flex w-full items-start justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
                                      active
                                        ? "border-indigo-400 bg-indigo-50 text-slate-900"
                                        : "border-[#e7dccb] bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50",
                                    ].join(" ")}
                                  >
                                    <div>
                                      <div className="text-sm font-semibold">{opt.label}</div>
                                      <div className="text-xs text-slate-400">{opt.hint}</div>
                                    </div>
                                    {active ? (
                                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Amenities — full-width */}
                        <div className={`mt-4 ${CARD}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className={CARD_TITLE}>Amenities</p>
                              <p className={CARD_HINT}>Select any that must be included.</p>
                            </div>
                            {draft.amenities.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => setDraft((s) => ({ ...s, amenities: [] }))}
                                className="shrink-0 inline-flex h-8 items-center rounded-full border border-[#e7dccb] bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-[#f0e8db] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                              >
                                Clear all
                              </button>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {amenityKeys.map((amenity) => {
                              const meta = AMENITY_CATALOG[amenity];
                              const active = draft.amenities.includes(amenity);
                              return (
                                <button
                                  key={amenity}
                                  type="button"
                                  onClick={() =>
                                    setDraft((s) => {
                                      const amenities = s.amenities.includes(amenity)
                                        ? s.amenities.filter((a) => a !== amenity)
                                        : [...s.amenities, amenity];
                                      return { ...s, amenities };
                                    })
                                  }
                                  className={[
                                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500",
                                    active ? PRESET_ACTIVE : PRESET_IDLE,
                                  ].join(" ")}
                                >
                                  <meta.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                                  {meta.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* ── Dialog footer ──────────────────────────────── */}
                      <div className="shrink-0 border-t border-[#eadfce] px-5 py-4 sm:px-8 sm:py-5">
                        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs font-medium text-slate-500">
                            {draftCount > 0
                              ? `${draftCount} filter${draftCount > 1 ? "s" : ""} selected`
                              : "No filters selected"}
                          </p>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setDraft(EMPTY_STATE)}
                              className="h-11 rounded-full border border-[#e7dccb] bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-[#f0e8db] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                            >
                              Reset all
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                pushState(draft);
                                closeDialog();
                              }}
                              className="inline-flex h-11 items-center justify-center rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(79,70,229,0.30)] transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                            >
                              Show stays
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
