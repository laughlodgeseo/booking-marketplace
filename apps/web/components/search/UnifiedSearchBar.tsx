"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import { useLocale } from "next-intl";
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

const UI_COPY = {
  en: {
    whereTo: "Where to?",
    locationLabel: "Location",
    checkInLabel: "Check-in",
    checkOutLabel: "Check-out",
    guests: "Guests",
    searchStays: "Search stays",
    clearDates: "Clear dates",
  },
  ar: {
    whereTo: "إلى أين؟",
    locationLabel: "الموقع",
    checkInLabel: "تاريخ الوصول",
    checkOutLabel: "تاريخ المغادرة",
    guests: "الضيوف",
    searchStays: "ابحث عن إقامة",
    clearDates: "مسح التواريخ",
  },
} as const;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchPreset(input: string): string | null {
  const n = normalize(input);
  if (!n) return null;

  for (const p of DUBAI_PRESETS) {
    if (normalize(p) === n) {
      return p;
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
  const [draft, setDraft] = useState<SearchDraft>({
    location: props.defaultQ ?? "",
    guests: clampInt(props.defaultGuests ?? 2, 1, 16),
    checkIn: props.defaultCheckIn ?? "",
    checkOut: props.defaultCheckOut ?? "",
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectionPhase, setSelectionPhase] = useState<DateSelectionPhase>("checkin");
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

  function pushSearch() {
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
          <div className="flex h-12 items-center gap-2 rounded-xl bg-neutral-50 px-3 text-neutral-800 md:h-[56px] md:border-r md:border-neutral-200 md:rounded-none md:bg-transparent md:px-4">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <input
              value={draft.location}
              onChange={(e) => setDraft((s) => ({ ...s, location: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") pushSearch();
              }}
              placeholder={copy.whereTo}
              className="w-full bg-transparent text-[16px] font-medium text-neutral-900 outline-none placeholder:text-neutral-400 md:text-sm"
              aria-label={copy.locationLabel}
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
              onClick={pushSearch}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700 md:hidden"
            >
              <Search className="h-4 w-4" />
              {copy.searchStays}
            </button>
            <SearchSquareButton
              ref={searchButtonRef}
              active={hasCompleteRange}
              onClick={pushSearch}
              className="hidden md:inline-flex"
            />
          </div>
        </div>
      </div>

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
