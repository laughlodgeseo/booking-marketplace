"use client";

import { useEffect, useMemo, useState } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  isEqual,
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
  mode?: "range" | "sequential";
  selectionPhase?: DateSelectionPhase;
  onSelectionPhaseChange?: (phase: DateSelectionPhase) => void;
  onComplete?: () => void;
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
  const navigationStep = monthsToRender > 1 ? monthsToRender : 1;
  const maxMonthsAhead = props.maxMonthsAhead ?? 18;

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
  const toMonth = useMemo(() => startOfMonth(addMonths(fromMonth, maxMonthsAhead)), [fromMonth, maxMonthsAhead]);
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

    if (!fromDate || toDate) {
      props.onChange({ from: pickedISO, to: null });
      props.onSelectionPhaseChange?.("checkout");
      return;
    }

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

  const rootClassName = [
    "rounded-[1.35rem] border border-indigo-100/80 bg-white shadow-[0_22px_48px_rgba(79,70,229,0.12)]",
    "backdrop-blur-[1px]",
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
      ? "relative overflow-hidden rounded-2xl border border-indigo-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.52))] p-2 md:p-3"
      : "relative overflow-hidden rounded-2xl border border-indigo-100/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.45))] p-2 min-h-[328px]";

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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 px-3 text-center text-sm font-semibold tracking-[0.01em] text-slate-800">
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200/80 bg-indigo-50 text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
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
            disabled={(d) => startOfDay(d) < minDate}
            numberOfMonths={monthsToRender}
            pagedNavigation={monthsToRender > 1}
            hideNavigation
            captionLayout="label"
            navLayout="around"
            fixedWeeks
            animate
            showOutsideDays
            className={[
              "text-slate-900 [--rdp-accent-color:#4f46e5] [--rdp-accent-background-color:#e0e7ff]",
              isCompact
                ? "[--rdp-day-width:2.25rem] [--rdp-day-height:2.25rem] [--rdp-day_button-width:2.25rem] [--rdp-day_button-height:2.25rem] [--rdp-day_button-border-radius:0.72rem]"
                : "[--rdp-day-width:2.5rem] [--rdp-day-height:2.5rem] [--rdp-day_button-width:2.5rem] [--rdp-day_button-height:2.5rem] [--rdp-day_button-border-radius:0.85rem]",
            ].join(" ")}
            classNames={{
              root: isTwoMonths ? "w-fit" : "w-full",
              months: monthsToRender > 1 ? "flex flex-nowrap items-start gap-4 md:gap-6" : "flex items-start",
              month: monthsToRender > 1 ? "w-[286px] shrink-0" : "w-full",
              month_caption:
                isTwoMonths || isCompact
                  ? "mb-2 flex h-7 items-center justify-center"
                  : "mb-3 flex h-8 items-center justify-center",
              caption_label: isCompact ? "text-base font-semibold text-slate-900" : "text-lg font-semibold text-slate-900",
              table: isCompact ? "w-full border-separate border-spacing-y-0.5" : "w-full border-separate border-spacing-y-1",
              weekdays: "grid grid-cols-7",
              weekday: "text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500",
              weeks: isCompact ? "space-y-0.5" : "space-y-1",
              week: isCompact ? "grid grid-cols-7 gap-0.5" : "grid grid-cols-7 gap-1",
              cell: "grid place-items-center",
              day: "grid place-items-center",
              day_button:
                isCompact
                  ? "grid h-8 w-8 place-items-center rounded-xl text-xs font-semibold text-slate-800 transition hover:scale-[1.02] hover:bg-indigo-100 md:h-9 md:w-9"
                  : isTwoMonths
                    ? "grid h-9 w-9 place-items-center rounded-xl text-sm font-semibold text-slate-800 transition hover:scale-[1.02] hover:bg-indigo-100 md:h-10 md:w-10"
                    : "grid h-10 w-10 place-items-center rounded-xl text-sm font-semibold text-slate-800 transition hover:scale-[1.02] hover:bg-indigo-100 md:h-11 md:w-11",
              selected:
                "rounded-xl bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]",
              range_start:
                "rounded-xl bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]",
              range_end:
                "rounded-xl bg-indigo-600 text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]",
              range_middle: "rounded-xl bg-indigo-100 text-slate-900",
              today: "text-indigo-700",
              outside: "text-slate-300",
              disabled: "cursor-not-allowed text-slate-300 opacity-55",
            }}
          />
        </div>
      </div>

      <div
        className={
          isTwoMonths || isCompact
            ? "mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100/90 pt-2.5"
            : "mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100/90 pt-3.5"
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900">
            {isAr ? "الوصول:" : "Check-in:"}{" "}
            <span className="ml-1 text-slate-800">{checkInLabel}</span>
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-900">
            {isAr ? "المغادرة:" : "Check-out:"}{" "}
            <span className="ml-1 text-slate-800">{checkOutLabel}</span>
          </span>
        </div>

        {props.allowClear !== false ? (
          <button
            type="button"
            onClick={clearDates}
            disabled={!hasSelectedRange}
            className={
              isTwoMonths || isCompact
                ? "rounded-full border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45"
                : "rounded-full border border-indigo-200 bg-indigo-50 px-5 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45"
            }
          >
            {isAr ? "مسح التواريخ" : "Clear dates"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
