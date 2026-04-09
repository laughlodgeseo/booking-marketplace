"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isEqual,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "next-intl";
import "react-day-picker/dist/style.css";
import { normalizeLocale } from "@/lib/i18n/config";

export type DateRangeValue = {
  from: string | null; // YYYY-MM-DD
  to: string | null; // YYYY-MM-DD
};

export type DateSelectionPhase = "checkin" | "checkout";

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function DateRangePicker(props: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: string[];
  isDateDisabled?: (isoDate: string) => boolean;
  mode?: "range" | "sequential";
  selectionPhase?: DateSelectionPhase;
  onSelectionPhaseChange?: (phase: DateSelectionPhase) => void;
  onComplete?: () => void;
  onVisibleMonthChange?: (month: Date) => void;
  numberOfMonths?: number;
  maxMonthsAhead?: number;
  allowClear?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const locale = normalizeLocale(useLocale());
  const isAr = locale === "ar";
  const today = useMemo(() => startOfDay(new Date()), []);
  const minDate = useMemo(() => startOfDay(props.minDate ?? today), [props.minDate, today]);
  const maxDate = useMemo(
    () => (props.maxDate ? startOfDay(props.maxDate) : null),
    [props.maxDate],
  );
  const disabledDatesSet = useMemo(() => {
    const out = new Set<string>();
    for (const date of props.disabledDates ?? []) {
      const raw = (date ?? "").trim();
      if (raw) out.add(raw);
    }
    return out;
  }, [props.disabledDates]);

  const fromDate = useMemo(() => {
    if (!props.value.from) return null;
    const parsed = parseISO(props.value.from);
    return isValid(parsed) ? startOfDay(parsed) : null;
  }, [props.value.from]);

  const toDate = useMemo(() => {
    if (!props.value.to) return null;
    const parsed = parseISO(props.value.to);
    return isValid(parsed) ? startOfDay(parsed) : null;
  }, [props.value.to]);

  const selected: DateRange | undefined = useMemo(() => {
    const from = fromDate ?? undefined;
    const to = toDate ?? undefined;
    if (!from && !to) return undefined;
    return { from, to };
  }, [fromDate, toDate]);

  const mode = props.mode ?? "range";
  const requestedMonths = props.numberOfMonths ?? 1;
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const isNarrowViewport = viewportWidth !== null ? viewportWidth < 768 : false;
  const monthsToRender = requestedMonths > 1 && isNarrowViewport ? 1 : requestedMonths;
  const navigationStep = 1; // Always navigate one month at a time for sequential UX
  const maxMonthsAhead = props.maxMonthsAhead ?? 18;
  const onVisibleMonthChange = props.onVisibleMonthChange;
  const lastNotifiedMonthRef = useRef<Date | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    const onViewportResize = () => {
      updateViewport();
    };
    window.addEventListener("resize", onViewportResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onViewportResize);
    };
  }, []);

  const fromMonth = useMemo(() => startOfMonth(minDate), [minDate]);
  const toMonth = useMemo(() => {
    const byWindow = startOfMonth(addMonths(fromMonth, maxMonthsAhead));
    if (!maxDate) return byWindow;
    const byMaxDate = startOfMonth(maxDate);
    if (isBefore(byMaxDate, fromMonth)) return fromMonth;
    return isBefore(byMaxDate, byWindow) ? byMaxDate : byWindow;
  }, [fromMonth, maxDate, maxMonthsAhead]);
  const lastNavigableMonth = useMemo(
    () => startOfMonth(addMonths(toMonth, -(monthsToRender - 1))),
    [toMonth, monthsToRender],
  );

  function clampMonth(nextMonth: Date): Date {
    const month = startOfMonth(nextMonth);
    if (isBefore(month, fromMonth)) return fromMonth;
    if (isAfter(month, lastNavigableMonth)) return lastNavigableMonth;
    return month;
  }

  const defaultMonth = clampMonth(fromDate ?? minDate);
  const [visibleMonth, setVisibleMonth] = useState<Date>(defaultMonth);
  const displayMonth = clampMonth(visibleMonth);

  useEffect(() => {
    if (!onVisibleMonthChange) return;
    if (lastNotifiedMonthRef.current && isSameMonth(lastNotifiedMonthRef.current, displayMonth)) {
      return;
    }
    lastNotifiedMonthRef.current = displayMonth;
    onVisibleMonthChange(displayMonth);
  }, [displayMonth, onVisibleMonthChange]);

  const hasSelectedRange = Boolean(props.value.from || props.value.to);
  const canGoPrev = isAfter(displayMonth, fromMonth);
  const canGoNext = isBefore(displayMonth, lastNavigableMonth);
  const isTwoMonths = monthsToRender === 2;
  const isCompact = Boolean(props.compact);

  const headerLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(isAr ? "ar-AE" : "en-US", {
      month: "long",
      year: "numeric",
    });
    if (monthsToRender > 1) {
      return `${formatter.format(displayMonth)} - ${formatter.format(
        addMonths(displayMonth, monthsToRender - 1),
      )}`;
    }
    return formatter.format(displayMonth);
  }, [displayMonth, isAr, monthsToRender]);

  function handleSequentialClick(day: Date, disabled: boolean) {
    if (disabled) return;

    const picked = startOfDay(day);
    const pickedISO = toISO(picked);
    const currentPhase = props.selectionPhase ?? "checkin";

    // CHECKOUT PHASE: respect explicit phase — lets edit-modal select checkout directly
    // even when both dates are already set (avoids unwanted check-in reset on first click)
    if (currentPhase === "checkout" && fromDate) {
      if (isBefore(picked, fromDate) || isEqual(picked, fromDate)) {
        // Clicked on/before check-in → restart selection from this date
        props.onChange({ from: pickedISO, to: null });
        props.onSelectionPhaseChange?.("checkout");
        return;
      }
      // Valid date after check-in → select as checkout
      props.onChange({ from: props.value.from, to: pickedISO });
      props.onSelectionPhaseChange?.("checkin");
      props.onComplete?.();
      return;
    }

    // CHECKIN PHASE (or no check-in yet): start a fresh selection
    if (!fromDate || toDate) {
      props.onChange({ from: pickedISO, to: null });
      props.onSelectionPhaseChange?.("checkout");
      return;
    }

    // Check-in set, checkout pending
    if (isBefore(picked, fromDate) || isEqual(picked, fromDate)) {
      props.onChange({ from: pickedISO, to: null });
      props.onSelectionPhaseChange?.("checkout");
      return;
    }

    props.onChange({ from: props.value.from, to: pickedISO });
    props.onSelectionPhaseChange?.("checkin");
    props.onComplete?.();
  }

  function handleRangeSelect(range: DateRange | undefined) {
    props.onChange({
      from: range?.from ? toISO(range.from) : null,
      to: range?.to ? toISO(range.to) : null,
    });
  }

  function clearDates() {
    props.onChange({ from: null, to: null });
    props.onSelectionPhaseChange?.("checkin");
  }

  function isDayDisabled(day: Date): boolean {
    const normalized = startOfDay(day);
    if (isBefore(normalized, minDate)) return true;
    if (maxDate && isAfter(normalized, maxDate)) return true;
    const iso = toISO(normalized);
    if (disabledDatesSet.has(iso)) return true;
    return props.isDateDisabled?.(iso) ?? false;
  }

  const rootClassName = [
    "rounded-[1.6rem] border border-white/80 bg-[rgb(var(--color-surface-rgb)/0.96)] shadow-[0_18px_46px_rgba(11,15,25,0.12)]",
    "backdrop-blur-[6px]",
    isCompact ? "p-3" : "p-4",
    props.className ?? "",
  ]
    .join(" ")
    .trim();
  const checkInLabel = fromDate
    ? fromDate.toLocaleDateString(isAr ? "ar-AE" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
  const checkOutLabel = toDate
    ? toDate.toLocaleDateString(isAr ? "ar-AE" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
  const dayPickerKey = `${format(displayMonth, "yyyy-MM")}-${monthsToRender}`;
  const fitWrapperClass = isTwoMonths ? "mx-auto w-fit max-w-full" : "";
  const monthsViewportClass =
    monthsToRender > 1
      ? "relative overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,238,227,0.72))] p-2 shadow-soft md:p-3"
      : "relative overflow-hidden rounded-2xl border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,238,227,0.72))] p-2 shadow-soft min-h-[328px]";

  return (
    <div className={rootClassName}>
      <div className={fitWrapperClass}>
        <div
          className={
            isTwoMonths || isCompact
              ? "mb-2 flex w-full items-center justify-between"
              : "mb-4 flex items-center justify-between"
          }
        >
          <button
            type="button"
            onClick={() =>
              setVisibleMonth((current) =>
                clampMonth(addMonths(clampMonth(current), -navigationStep)),
              )
            }
            disabled={!canGoPrev}
            aria-label={isAr ? "الشهر السابق" : "Previous month"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-[rgb(var(--color-surface-rgb)/0.9)] text-primary shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 px-3 text-center text-sm font-semibold tracking-[0.01em] text-primary">
            {headerLabel}
          </div>

          <button
            type="button"
            onClick={() =>
              setVisibleMonth((current) =>
                clampMonth(addMonths(clampMonth(current), navigationStep)),
              )
            }
            disabled={!canGoNext}
            aria-label={isAr ? "الشهر التالي" : "Next month"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-[rgb(var(--color-surface-rgb)/0.9)] text-primary shadow-sm transition hover:bg-white hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className={monthsViewportClass}>
          <DayPicker
            key={dayPickerKey}
            mode="range"
            selected={selected}
            onSelect={mode === "range" ? handleRangeSelect : undefined}
            onDayClick={mode === "sequential" ? (day, modifiers) => handleSequentialClick(day, modifiers.disabled) : undefined}
            month={displayMonth}
            onMonthChange={(nextMonth) => setVisibleMonth(clampMonth(nextMonth))}
            fromMonth={fromMonth}
            toMonth={toMonth}
            disabled={(d) => isDayDisabled(d)}
            numberOfMonths={monthsToRender}
            pagedNavigation={monthsToRender > 1}
            hideNavigation
            captionLayout="label"
            navLayout="around"
            fixedWeeks
            animate
            showOutsideDays
            className={[
              "text-primary [--rdp-accent-color:rgb(var(--color-accent-rgb))] [--rdp-accent-background-color:rgb(var(--color-accent-rgb)/0.14)]",
              isCompact
                ? "[--rdp-day-width:2.25rem] [--rdp-day-height:2.25rem] [--rdp-day_button-width:2.25rem] [--rdp-day_button-height:2.25rem] [--rdp-day_button-border-radius:0.8rem]"
                : "[--rdp-day-width:2.5rem] [--rdp-day-height:2.5rem] [--rdp-day_button-width:2.5rem] [--rdp-day_button-height:2.5rem] [--rdp-day_button-border-radius:0.95rem]",
            ].join(" ")}
            classNames={{
              root: isTwoMonths ? "w-fit" : "w-full",
              months: monthsToRender > 1 ? "flex flex-nowrap items-start gap-4 md:gap-6" : "flex items-start",
              month: monthsToRender > 1 ? "w-[286px] shrink-0" : "w-full",
              month_caption:
                isTwoMonths || isCompact
                  ? "mb-2 flex h-7 items-center justify-center"
                  : "mb-3 flex h-8 items-center justify-center",
              caption_label: isCompact ? "text-base font-semibold text-primary" : "text-lg font-semibold text-primary",
              table: isCompact ? "w-full border-separate border-spacing-y-0.5" : "w-full border-separate border-spacing-y-1",
              weekdays: "grid grid-cols-7",
              weekday: "text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted",
              weeks: isCompact ? "space-y-0.5" : "space-y-1",
              week: isCompact ? "grid grid-cols-7 gap-0.5" : "grid grid-cols-7 gap-1",
              cell: "grid place-items-center",
              day: "grid place-items-center",
              day_button:
                isCompact
                  ? "grid h-8 w-8 place-items-center rounded-xl text-xs font-semibold text-primary transition hover:scale-[1.02] hover:bg-[rgb(var(--color-accent-rgb)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent-rgb)/0.2)] md:h-9 md:w-9"
                  : isTwoMonths
                    ? "grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold text-primary transition hover:scale-[1.02] hover:bg-[rgb(var(--color-accent-rgb)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent-rgb)/0.2)] md:h-10 md:w-10"
                    : "grid h-10 w-10 place-items-center rounded-xl text-sm font-semibold text-primary transition hover:scale-[1.02] hover:bg-[rgb(var(--color-accent-rgb)/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-accent-rgb)/0.2)] md:h-11 md:w-11",
              selected:
                "rounded-xl bg-brand text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] ring-1 ring-white/70",
              range_start:
                "rounded-xl bg-brand text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] ring-1 ring-white/70",
              range_end:
                "rounded-xl bg-brand text-white shadow-[0_10px_24px_rgba(79,70,229,0.28)] ring-1 ring-white/70",
              range_middle: "rounded-xl bg-[rgb(var(--color-accent-rgb)/0.14)] text-primary",
              today: "text-brand font-semibold",
              outside: "text-muted/40",
              disabled: "cursor-not-allowed text-muted/40 opacity-50",
            }}
          />
        </div>
      </div>

      <div
        className={
          isTwoMonths || isCompact
            ? "mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-2.5"
            : "mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3.5"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
              props.selectionPhase === "checkin"
                ? "bg-[rgb(var(--color-accent-rgb)/0.16)] text-primary ring-[rgb(var(--color-accent-rgb)/0.28)]"
                : "bg-[rgb(var(--color-surface-rgb)/0.9)] text-secondary ring-white/80",
            ].join(" ")}
          >
            {isAr ? "الوصول:" : "Check-in:"}{" "}
            <span className="ml-1 text-primary">{checkInLabel}</span>
          </span>
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
              props.selectionPhase === "checkout"
                ? "bg-[rgb(var(--color-accent-rgb)/0.16)] text-primary ring-[rgb(var(--color-accent-rgb)/0.28)]"
                : "bg-[rgb(var(--color-surface-rgb)/0.9)] text-secondary ring-white/80",
            ].join(" ")}
          >
            {isAr ? "المغادرة:" : "Check-out:"}{" "}
            <span className="ml-1 text-primary">{checkOutLabel}</span>
          </span>
        </div>

        {props.allowClear !== false ? (
          <button
            type="button"
            onClick={clearDates}
            disabled={!hasSelectedRange}
            className={
              isTwoMonths || isCompact
                ? "rounded-full border border-white/80 bg-[rgb(var(--color-surface-rgb)/0.9)] px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
                : "rounded-full border border-white/80 bg-[rgb(var(--color-surface-rgb)/0.9)] px-5 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-45"
            }
          >
            {isAr ? "مسح التواريخ" : "Clear dates"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
