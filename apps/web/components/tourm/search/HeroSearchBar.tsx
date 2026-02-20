"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Search, Users } from "lucide-react";
import DateRangePicker, { type DateRangeValue, type DateSelectionPhase } from "@/components/booking/DateRangePicker";
import { createPortal } from "react-dom";
import { isValidIsoRange } from "@/lib/date-range";

type Draft = {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
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

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchPreset(input: string): string | null {
  const n = normalize(input);
  if (!n) return null;
  for (const p of DUBAI_PRESETS) {
    if (normalize(p) === n) return p;
  }
  return null;
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export default function HeroSearchBar() {
  const router = useRouter();
  const canUsePortal = typeof document !== "undefined";

  const [draft, setDraft] = useState<Draft>({
    location: "",
    checkIn: "",
    checkOut: "",
    guests: 2,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectionPhase, setSelectionPhase] = useState<DateSelectionPhase>("checkin");
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 340,
  });
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const dateRangeValue = useMemo<DateRangeValue>(
    () => ({
      from: draft.checkIn || null,
      to: draft.checkOut || null,
    }),
    [draft.checkIn, draft.checkOut],
  );

  const updatePopoverPosition = useCallback(() => {
    if (!calendarWrapRef.current) return;

    const rect = calendarWrapRef.current.getBoundingClientRect();
    const targetWidth = window.innerWidth >= 640 ? 380 : 340;
    const maxWidth = Math.min(targetWidth, Math.floor(window.innerWidth * 0.92));
    const margin = 12;

    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - maxWidth - margin);
    const top = rect.bottom + 8;

    setPopoverPosition({ top, left, width: maxWidth });
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;

    updatePopoverPosition();

    function onViewportChange() {
      updatePopoverPosition();
    }

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [calendarOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!calendarOpen) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      const insideTrigger = Boolean(calendarWrapRef.current?.contains(target));
      const insidePopover = Boolean(popoverRef.current?.contains(target));
      if (!insideTrigger && !insidePopover) {
        setCalendarOpen(false);
      }
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") setCalendarOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEsc);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [calendarOpen]);

  function go() {
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

  return (
    <motion.div
      className="relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8"
      initial={{ y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
    >
      <div className="rounded-[2rem] bg-white p-3 shadow-md sm:p-4">
        <div className="grid gap-3 md:grid-cols-[1.15fr_1.7fr_0.65fr_auto] md:items-center md:gap-4">
          <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 px-4 py-3 text-neutral-800 shadow-sm">
            <MapPin className="h-4 w-4 text-neutral-500" />
            <input
              value={draft.location}
              onChange={(e) => setDraft((s) => ({ ...s, location: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
              }}
              placeholder="Where to?"
              className="w-full bg-transparent text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400"
              aria-label="Location"
            />
          </div>

          <div ref={calendarWrapRef} className="relative grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectionPhase("checkin");
                setCalendarOpen(true);
              }}
              className="flex h-[48px] items-center gap-2 rounded-3xl bg-neutral-50 px-4 py-3 text-left text-sm font-medium text-neutral-800 shadow-sm"
              aria-label="Check-in"
            >
              <CalendarDays className="h-4 w-4 text-neutral-500" />
              <span className="truncate">{draft.checkIn || "Check-in"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectionPhase("checkout");
                setCalendarOpen(true);
              }}
              className="flex h-[48px] items-center gap-2 rounded-3xl bg-neutral-50 px-4 py-3 text-left text-sm font-medium text-neutral-800 shadow-sm"
              aria-label="Check-out"
            >
              <CalendarDays className="h-4 w-4 text-neutral-500" />
              <span className="truncate">{draft.checkOut || "Check-out"}</span>
            </button>

          </div>

          <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 px-4 py-3 text-neutral-800 shadow-sm">
            <Users className="h-4 w-4 text-neutral-500" />
            <input
              type="number"
              min={1}
              max={16}
              value={draft.guests}
              onChange={(e) => setDraft((s) => ({ ...s, guests: Number(e.target.value) }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") go();
              }}
              placeholder="Guests"
              className="w-full bg-transparent text-sm font-medium text-neutral-900 outline-none placeholder:text-neutral-400"
              aria-label="Guests"
            />
          </div>

          <button
            type="button"
            onClick={go}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 md:w-[140px]"
          >
            <Search className="mr-2 h-4 w-4" />
            Search
          </button>
        </div>
      </div>

      {canUsePortal && calendarOpen
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[9999]">
              <div
                ref={popoverRef}
                className="pointer-events-auto fixed inline-block w-[340px] max-w-[92vw] sm:w-[380px]"
                style={{ top: popoverPosition.top, left: popoverPosition.left, width: popoverPosition.width }}
              >
                <DateRangePicker
                  value={dateRangeValue}
                  mode="sequential"
                  numberOfMonths={1}
                  selectionPhase={selectionPhase}
                  onSelectionPhaseChange={setSelectionPhase}
                  onComplete={() => {
                    setCalendarOpen(false);
                    setSelectionPhase("checkin");
                  }}
                  onChange={(next) =>
                    setDraft((s) => ({
                      ...s,
                      checkIn: next.from ?? "",
                      checkOut: next.to ?? "",
                    }))
                  }
                  minDate={new Date()}
                  className="rounded-2xl bg-white p-3 shadow-2xl"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </motion.div>
  );
}
