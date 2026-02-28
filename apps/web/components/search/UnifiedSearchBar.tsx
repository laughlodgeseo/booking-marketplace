"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { useLocale } from "next-intl";
import { createPortal } from "react-dom";
import DateRangePicker, { type DateRangeValue, type DateSelectionPhase } from "@/components/booking/DateRangePicker";
import DateRangePopover from "@/components/search/DateRangePopover";
import SearchSquareButton from "@/components/search/SearchSquareButton";
import { isValidIsoRange } from "@/lib/date-range";
import { normalizeLocale } from "@/lib/i18n/config";

type Variant = "home" | "properties";

type UnifiedSearchBarProps = {
  variant: Variant;
  defaultQ?: string;
  defaultGuests?: number;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
};

type SearchDraft = {
  location: string;
  guests: number;
  checkIn: string;
  checkOut: string;
};

type LocationSuggestion = {
  id: string;
  value: string;
  title: {
    en: string;
    ar: string;
  };
  subtitle: {
    en: string;
    ar: string;
  };
  keywords: readonly string[];
};

type LocationPanelRect = {
  top: number;
  left: number;
  width: number;
};

const DUBAI_PRESETS = [
  { area: "Dubai Marina", aliases: ["Dubai Marina"] },
  { area: "Downtown Dubai", aliases: ["Downtown Dubai"] },
  { area: "JBR", aliases: ["JBR", "Jumeirah Beach Residence"] },
  { area: "Business Bay", aliases: ["Business Bay"] },
  { area: "Palm Jumeirah", aliases: ["Palm Jumeirah"] },
  { area: "DIFC", aliases: ["DIFC", "Dubai International Financial Centre"] },
  { area: "JLT", aliases: ["JLT", "Jumeirah Lake Towers"] },
  { area: "Al Barsha", aliases: ["Al Barsha"] },
] as const;

const LOCATION_SUGGESTIONS: ReadonlyArray<LocationSuggestion> = [
  {
    id: "dubai-marina",
    value: "Dubai Marina",
    title: { en: "Dubai Marina", ar: "دبي مارينا" },
    subtitle: { en: "Waterfront towers and nightlife", ar: "أبراج على الواجهة البحرية وحياة ليلية" },
    keywords: ["marina", "waterfront", "beach"],
  },
  {
    id: "downtown-dubai",
    value: "Downtown Dubai",
    title: { en: "Downtown Dubai", ar: "داون تاون دبي" },
    subtitle: { en: "Burj Khalifa and Dubai Mall", ar: "برج خليفة ودبي مول" },
    keywords: ["downtown", "burj khalifa", "dubai mall"],
  },
  {
    id: "palm-jumeirah",
    value: "Palm Jumeirah",
    title: { en: "Palm Jumeirah", ar: "نخلة جميرا" },
    subtitle: { en: "Beach resorts and sea views", ar: "منتجعات شاطئية وإطلالات بحرية" },
    keywords: ["palm", "jumeirah", "resort"],
  },
  {
    id: "jbr",
    value: "JBR",
    title: { en: "JBR", ar: "جي بي آر" },
    subtitle: { en: "The Walk, beach, and dining", ar: "ممشى جي بي آر والشاطئ والمطاعم" },
    keywords: ["jbr", "beach", "the walk"],
  },
  {
    id: "business-bay",
    value: "Business Bay",
    title: { en: "Business Bay", ar: "بزنس باي" },
    subtitle: { en: "Central district near Downtown", ar: "منطقة مركزية قريبة من داون تاون" },
    keywords: ["business bay", "canal", "central"],
  },
  {
    id: "difc",
    value: "DIFC",
    title: { en: "DIFC", ar: "مركز دبي المالي" },
    subtitle: { en: "Financial core and fine dining", ar: "قلب الأعمال ومطاعم راقية" },
    keywords: ["difc", "financial centre", "restaurants"],
  },
  {
    id: "jlt",
    value: "JLT",
    title: { en: "JLT", ar: "جي إل تي" },
    subtitle: { en: "Lakeside community with quick metro access", ar: "مجتمع حول البحيرات مع وصول سريع للمترو" },
    keywords: ["jlt", "jumeirah lake towers", "metro"],
  },
  {
    id: "al-barsha",
    value: "Al Barsha",
    title: { en: "Al Barsha", ar: "البرشاء" },
    subtitle: { en: "Family-friendly and close to Mall of the Emirates", ar: "مناسبة للعائلات وقريبة من مول الإمارات" },
    keywords: ["al barsha", "mall of the emirates", "family"],
  },
  {
    id: "bluewaters-island",
    value: "Bluewaters Island",
    title: { en: "Bluewaters Island", ar: "جزيرة بلوواترز" },
    subtitle: { en: "Ain Dubai and premium sea-front stays", ar: "عين دبي وإقامات فاخرة مطلة على البحر" },
    keywords: ["bluewaters", "ain dubai", "island"],
  },
  {
    id: "dubai-creek-harbour",
    value: "Dubai Creek Harbour",
    title: { en: "Dubai Creek Harbour", ar: "دبي كريك هاربور" },
    subtitle: { en: "Creek views and modern skyline", ar: "إطلالات على الخور وأفق حديث" },
    keywords: ["creek harbour", "creek", "skyline"],
  },
];

const UI_COPY = {
  en: {
    whereTo: "Where to?",
    locationLabel: "Location",
    checkInLabel: "Check-in",
    checkOutLabel: "Check-out",
    guests: "Guests",
    searchStays: "Search stays",
    clearDates: "Clear dates",
    popularLocations: "Popular locations in Dubai",
    suggestedLocations: "Suggested locations",
    searchFor: "Search for",
  },
  ar: {
    whereTo: "إلى أين؟",
    locationLabel: "الموقع",
    checkInLabel: "تاريخ الوصول",
    checkOutLabel: "تاريخ المغادرة",
    guests: "الضيوف",
    searchStays: "ابحث عن إقامة",
    clearDates: "مسح التواريخ",
    popularLocations: "أماكن شائعة في دبي",
    suggestedLocations: "أماكن مقترحة",
    searchFor: "ابحث عن",
  },
} as const;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchPreset(input: string): string | null {
  const n = normalize(input);
  if (!n) return null;

  for (const preset of DUBAI_PRESETS) {
    if (normalize(preset.area) === n) {
      return preset.area;
    }

    for (const alias of preset.aliases) {
      if (normalize(alias) === n) {
        return preset.area;
      }
    }
  }

  return null;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export default function UnifiedSearchBar(props: UnifiedSearchBarProps) {
  const router = useRouter();
  const locale = normalizeLocale(useLocale());
  const copy = UI_COPY[locale];
  const locationListId = useId();
  const canUsePortal = typeof document !== "undefined";
  const [draft, setDraft] = useState<SearchDraft>({
    location: props.defaultQ ?? "",
    guests: clampInt(props.defaultGuests ?? 2, 1, 16),
    checkIn: props.defaultCheckIn ?? "",
    checkOut: props.defaultCheckOut ?? "",
  });
  const [locationOpen, setLocationOpen] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [locationPanelRect, setLocationPanelRect] = useState<LocationPanelRect>({
    top: 0,
    left: 0,
    width: 360,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectionPhase, setSelectionPhase] = useState<DateSelectionPhase>("checkin");
  const locationRef = useRef<HTMLDivElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const locationPopoverRef = useRef<HTMLDivElement | null>(null);
  const calendarTriggerRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);

  const dateRangeValue = useMemo<DateRangeValue>(
    () => ({
      from: draft.checkIn || null,
      to: draft.checkOut || null,
    }),
    [draft.checkIn, draft.checkOut],
  );

  const hasCompleteRange = isValidIsoRange(draft.checkIn, draft.checkOut);
  const hasAnyDate = Boolean(draft.checkIn || draft.checkOut);
  const normalizedLocation = normalize(draft.location);

  const filteredLocations = useMemo(() => {
    if (!normalizedLocation) return LOCATION_SUGGESTIONS;

    return LOCATION_SUGGESTIONS.filter((item) => {
      const fields = [item.value, item.title.en, item.title.ar, ...item.keywords];
      return fields.some((field) => normalize(field).includes(normalizedLocation));
    });
  }, [normalizedLocation]);

  const updateLocationPanelRect = useCallback(() => {
    if (typeof window === "undefined" || !locationRef.current) return;

    const rect = locationRef.current.getBoundingClientRect();
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportMaxWidth = Math.max(0, viewportWidth - margin * 2);
    const minWidth = Math.min(320, viewportMaxWidth);
    const preferredWidth = rect.width + (viewportWidth >= 768 ? 120 : 12);
    const maxWidth = Math.min(520, viewportMaxWidth);
    const width = Math.max(minWidth, Math.min(preferredWidth, maxWidth));
    const left = Math.min(Math.max(rect.left, margin), Math.max(margin, viewportWidth - width - margin));
    const top = rect.bottom + 10;

    setLocationPanelRect({ top, left, width });
  }, []);

  useEffect(() => {
    if (!locationOpen) return;

    updateLocationPanelRect();

    function onViewportChange() {
      updateLocationPanelRect();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [locationOpen, updateLocationPanelRect]);

  useEffect(() => {
    if (!locationOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const insideTrigger = Boolean(locationRef.current?.contains(target));
      const insidePopover = Boolean(locationPopoverRef.current?.contains(target));

      if (!insideTrigger && !insidePopover) {
        setLocationOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLocationOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [locationOpen]);

  function selectLocation(item: LocationSuggestion) {
    setDraft((s) => ({ ...s, location: item.value }));
    setLocationOpen(false);
    setActiveLocationIndex(0);
    requestAnimationFrame(() => {
      locationInputRef.current?.focus();
    });
  }

  function pushSearch() {
    setLocationOpen(false);
    const p = new URLSearchParams();

    const loc = draft.location.trim();
    const preset = matchPreset(loc);

    if (preset) {
      p.set("city", "Dubai");
      p.set("area", preset);
    } else if (loc.length > 0) {
      p.set("q", loc);
    }

    p.set("guests", String(clampInt(draft.guests, 1, 16)));

    if (isValidIsoRange(draft.checkIn, draft.checkOut)) {
      p.set("checkIn", draft.checkIn);
      p.set("checkOut", draft.checkOut);
    } else if (draft.checkIn) {
      p.set("checkIn", draft.checkIn);
    }

    router.push(`/properties?${p.toString()}`);
  }

  function clearDates() {
    setDraft((s) => ({ ...s, checkIn: "", checkOut: "" }));
    setSelectionPhase("checkin");
  }

  const highlightedLocationIndex =
    activeLocationIndex >= filteredLocations.length ? 0 : activeLocationIndex;
  const highlightedLocationOptionId =
    filteredLocations.length > 0 ? `location-option-${filteredLocations[highlightedLocationIndex]?.id}` : undefined;

  const surfaceClass =
    props.variant === "home"
      ? "mx-auto w-full max-w-5xl rounded-2xl border border-indigo-100/80 bg-[linear-gradient(180deg,rgba(248,242,232,0.96),rgba(240,233,220,0.76))] px-3 py-3 shadow-[0_16px_34px_rgba(33,39,53,0.12)] backdrop-blur-sm md:h-[72px] md:px-4 md:py-2"
      : "mx-auto w-full max-w-5xl rounded-2xl bg-white px-3 py-3 shadow-md md:h-[72px] md:px-4 md:py-2";

  return (
    <motion.div
      className="relative z-50 mx-auto w-full px-4 sm:px-6 lg:px-8"
      initial={props.variant === "home" ? { y: 14, opacity: 0 } : false}
      animate={props.variant === "home" ? { y: 0, opacity: 1 } : false}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
    >
      <div className={surfaceClass}>
        <div className="grid h-full gap-2 md:grid-cols-[1.2fr_0.95fr_0.95fr_0.6fr_auto] md:items-center md:gap-3">
          <div
            ref={locationRef}
            className={[
              "relative flex h-12 items-center gap-2 px-3 text-neutral-800 transition-all duration-200",
              locationOpen
                ? "rounded-2xl bg-white ring-1 ring-indigo-200/85 shadow-[0_14px_30px_rgba(15,23,42,0.12)] md:rounded-2xl md:border-transparent md:bg-white"
                : "rounded-xl bg-neutral-50 md:rounded-none md:border-r md:border-neutral-200 md:bg-transparent",
              "md:h-[56px] md:px-4",
            ].join(" ")}
          >
            <MapPin className="h-4 w-4 text-neutral-500" />
            <input
              ref={locationInputRef}
              value={draft.location}
              onChange={(e) => {
                setDraft((s) => ({ ...s, location: e.target.value }));
                updateLocationPanelRect();
                setLocationOpen(true);
                setActiveLocationIndex(0);
              }}
              onFocus={() => {
                updateLocationPanelRect();
                setLocationOpen(true);
                setCalendarOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (!locationOpen) {
                    updateLocationPanelRect();
                    setLocationOpen(true);
                    setActiveLocationIndex(0);
                    return;
                  }

                  if (filteredLocations.length > 0) {
                    setActiveLocationIndex((prev) => (prev + 1) % filteredLocations.length);
                  }
                  return;
                }

                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (!locationOpen) {
                    updateLocationPanelRect();
                    setLocationOpen(true);
                    setActiveLocationIndex(Math.max(0, filteredLocations.length - 1));
                    return;
                  }

                  if (filteredLocations.length > 0) {
                    setActiveLocationIndex((prev) => (prev - 1 + filteredLocations.length) % filteredLocations.length);
                  }
                  return;
                }

                if (e.key === "Enter") {
                  if (locationOpen && filteredLocations.length > 0) {
                    e.preventDefault();
                    const nextIndex = Math.min(highlightedLocationIndex, filteredLocations.length - 1);
                    selectLocation(filteredLocations[nextIndex]);
                    return;
                  }

                  pushSearch();
                  return;
                }

                if (e.key === "Escape") {
                  setLocationOpen(false);
                }
              }}
              placeholder={copy.whereTo}
              className="w-full bg-transparent text-[16px] font-medium text-neutral-900 outline-none placeholder:text-neutral-400 md:text-sm"
              aria-label={copy.locationLabel}
              role="combobox"
              aria-expanded={locationOpen}
              aria-controls={locationListId}
              aria-autocomplete="list"
              aria-activedescendant={locationOpen ? highlightedLocationOptionId : undefined}
            />
          </div>

          <div
            ref={calendarTriggerRef}
            className="flex h-12 items-center gap-2 rounded-xl bg-neutral-50 px-3 text-neutral-800 md:h-[56px] md:border-r md:border-neutral-200 md:rounded-none md:bg-transparent md:px-4"
          >
            <button
              type="button"
              onClick={() => {
                setSelectionPhase("checkin");
                setCalendarOpen(true);
                setLocationOpen(false);
              }}
              className="inline-flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-neutral-800"
              aria-label={copy.checkInLabel}
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-neutral-500" />
              <span className="truncate">{draft.checkIn || copy.checkInLabel}</span>
            </button>
          </div>

          <div className="flex h-12 items-center gap-2 rounded-xl bg-neutral-50 px-3 text-neutral-800 md:h-[56px] md:border-r md:border-neutral-200 md:rounded-none md:bg-transparent md:px-4">
            <button
              type="button"
              onClick={() => {
                setSelectionPhase("checkout");
                setCalendarOpen(true);
                setLocationOpen(false);
              }}
              className="inline-flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-neutral-800"
              aria-label={copy.checkOutLabel}
            >
              <CalendarDays className="h-4 w-4 shrink-0 text-neutral-500" />
              <span className="truncate">{draft.checkOut || copy.checkOutLabel}</span>
            </button>
          </div>

          <div className="flex h-12 items-center gap-2 rounded-xl bg-neutral-50 px-3 text-neutral-800 md:h-[56px] md:border-r md:border-neutral-200 md:rounded-none md:bg-transparent md:px-4">
            <Users className="h-4 w-4 text-neutral-500" />
            <input
              type="number"
              min={1}
              max={16}
              value={draft.guests}
              onChange={(e) => setDraft((s) => ({ ...s, guests: Number(e.target.value) }))}
              onFocus={() => setLocationOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") pushSearch();
              }}
              placeholder={copy.guests}
              className="w-full bg-transparent text-[16px] font-medium text-neutral-900 outline-none placeholder:text-neutral-400 md:text-sm"
              aria-label={copy.guests}
            />
          </div>

          <div className="flex h-12 items-center md:h-[56px] md:justify-end md:pl-1">
            <button
              type="button"
              onClick={() => {
                setLocationOpen(false);
                pushSearch();
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 md:hidden"
            >
              <Search className="h-4 w-4" />
              {copy.searchStays}
            </button>
            <SearchSquareButton
              ref={searchButtonRef}
              active={hasCompleteRange}
              onClick={() => {
                setLocationOpen(false);
                pushSearch();
              }}
              className="hidden md:inline-flex"
            />
          </div>
        </div>
      </div>

      {canUsePortal
        ? createPortal(
            <AnimatePresence>
              {locationOpen ? (
                <motion.div
                  ref={locationPopoverRef}
                  className="fixed z-[10020] overflow-hidden rounded-[1.4rem] border border-neutral-200/90 bg-white p-2 shadow-[0_28px_68px_rgba(15,23,42,0.2)] ring-1 ring-indigo-100/70"
                  style={{
                    top: locationPanelRect.top,
                    left: locationPanelRect.left,
                    width: locationPanelRect.width,
                  }}
                  initial={{ opacity: 0, y: -8, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.985 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                    {normalizedLocation ? copy.suggestedLocations : copy.popularLocations}
                  </p>

                  {filteredLocations.length > 0 ? (
                    <ul id={locationListId} role="listbox" className="max-h-[320px] overflow-y-auto pb-1">
                      {filteredLocations.map((item, index) => {
                        const selected = index === highlightedLocationIndex;
                        const title = locale === "ar" ? item.title.ar : item.title.en;
                        const subtitle = locale === "ar" ? item.subtitle.ar : item.subtitle.en;

                        return (
                          <li key={item.id} role="presentation">
                            <button
                              id={`location-option-${item.id}`}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onMouseEnter={() => setActiveLocationIndex(index)}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selectLocation(item)}
                              className={[
                                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition duration-150",
                                selected
                                  ? "bg-neutral-100 text-neutral-900"
                                  : "text-neutral-800 hover:bg-neutral-50",
                              ].join(" ")}
                            >
                              <span
                                aria-hidden
                                className={[
                                  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition",
                                  selected
                                    ? "border-neutral-300 bg-white text-neutral-700"
                                    : "border-neutral-200 bg-neutral-50 text-neutral-600",
                                ].join(" ")}
                              >
                                <MapPin className="h-4 w-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">{title}</span>
                                <span className="block truncate text-xs text-neutral-500">{subtitle}</span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <button
                      type="button"
                      onClick={pushSearch}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-neutral-900 transition hover:bg-neutral-50"
                    >
                      <span
                        aria-hidden
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-600"
                      >
                        <Search className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 text-sm font-semibold">
                        {copy.searchFor} <span className="font-bold">{`"${draft.location.trim()}"`}</span>
                      </span>
                    </button>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <DateRangePopover
        open={calendarOpen}
        anchorRef={calendarTriggerRef}
        variant="double"
        monthsCount={2}
        onClose={() => {
          setCalendarOpen(false);
          setSelectionPhase("checkin");
        }}
      >
        <DateRangePicker
          value={dateRangeValue}
          mode="sequential"
          numberOfMonths={2}
          selectionPhase={selectionPhase}
          onSelectionPhaseChange={setSelectionPhase}
          onComplete={() => {
            setCalendarOpen(false);
            setSelectionPhase("checkin");
            requestAnimationFrame(() => {
              searchButtonRef.current?.focus();
            });
          }}
          onChange={(next) => {
            setDraft((s) => ({
              ...s,
              checkIn: next.from ?? "",
              checkOut: next.to ?? "",
            }));
          }}
          minDate={new Date()}
          className="rounded-xl border-none bg-white p-0 shadow-none"
        />
      </DateRangePopover>

      {hasAnyDate ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clearDates}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
          >
            {copy.clearDates}
          </button>
        </div>
      ) : null}
    </motion.div>
  );
}
