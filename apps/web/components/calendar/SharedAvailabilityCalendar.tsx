"use client";

import { useMemo, useRef, type ReactNode, type TouchEvent } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type SharedAvailabilityStatus = "AVAILABLE" | "BOOKED" | "HOLD" | "BLOCKED";
export type SharedAvailabilityRole = "admin" | "vendor" | "customer" | "public";

export type SharedAvailabilityDay = {
  date: string;
  status: SharedAvailabilityStatus;
};

export type SharedAvailabilityRange = {
  from: Date | null;
  to: Date | null;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function toIsoDay(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function normalizeStatusByRole(
  status: SharedAvailabilityStatus,
  role: SharedAvailabilityRole,
): SharedAvailabilityStatus {
  if ((role === "customer" || role === "public") && status === "BLOCKED") return "BOOKED";
  return status;
}

function inSelectedRange(day: Date, selectedRange: SharedAvailabilityRange | null | undefined): boolean {
  if (!selectedRange?.from) return false;
  const from = selectedRange.from;
  const to = selectedRange.to ?? selectedRange.from;
  const start = isAfter(from, to) ? to : from;
  const end = isAfter(from, to) ? from : to;
  return !isBefore(day, start) && !isAfter(day, end);
}

function labelForStatus(status: SharedAvailabilityStatus, role: SharedAvailabilityRole): string {
  if ((role === "customer" || role === "public") && status === "BLOCKED") return "Unavailable";
  if (status === "BOOKED") return "Booked";
  if (status === "HOLD") return "Hold";
  if (status === "BLOCKED") return "Blocked";
  return "Available";
}

function legendItems(role: SharedAvailabilityRole): Array<{ status: SharedAvailabilityStatus; label: string }> {
  if (role === "customer" || role === "public") {
    return [
      { status: "AVAILABLE", label: "Available" },
      { status: "BOOKED", label: "Unavailable" },
      { status: "HOLD", label: "Hold" },
    ];
  }
  return [
    { status: "AVAILABLE", label: "Available" },
    { status: "BOOKED", label: "Booked" },
    { status: "HOLD", label: "Hold" },
    { status: "BLOCKED", label: "Blocked" },
  ];
}

function tone(status: SharedAvailabilityStatus): {
  fill: string;
  hoverFill: string;
  rail: string;
  dot: string;
  chipBg: string;
  chipText: string;
  focusRing: string;
} {
  if (status === "AVAILABLE") {
    return {
      fill: "bg-emerald-500/14",
      hoverFill: "hover:bg-emerald-500/24",
      rail: "bg-emerald-500/85",
      dot: "bg-emerald-500",
      chipBg: "bg-emerald-100",
      chipText: "text-emerald-700",
      focusRing: "focus-visible:ring-emerald-400/30",
    };
  }

  if (status === "BOOKED") {
    return {
      fill: "bg-rose-500/14",
      hoverFill: "hover:bg-rose-500/22",
      rail: "bg-rose-500/85",
      dot: "bg-rose-500",
      chipBg: "bg-rose-100",
      chipText: "text-rose-700",
      focusRing: "focus-visible:ring-rose-400/30",
    };
  }

  if (status === "HOLD") {
    return {
      fill: "bg-amber-400/16",
      hoverFill: "hover:bg-amber-400/24",
      rail: "bg-amber-400/90",
      dot: "bg-amber-400",
      chipBg: "bg-amber-100",
      chipText: "text-amber-700",
      focusRing: "focus-visible:ring-amber-400/30",
    };
  }

  // BLOCKED — neutral
  return {
    fill: "bg-neutral-200/50",
    hoverFill: "hover:bg-neutral-200/70",
    rail: "bg-neutral-400/70",
    dot: "bg-neutral-400",
    chipBg: "bg-neutral-200",
    chipText: "text-neutral-600",
    focusRing: "focus-visible:ring-neutral-400/25",
  };
}

/* ── Legend pill — two variants ─────────────────────────────── */
function LegendPill(props: {
  status: SharedAvailabilityStatus;
  label: string;
  solid?: boolean;
}) {
  const t = tone(props.status);
  const bg = props.solid
    ? "bg-neutral-100 ring-1 ring-neutral-200/70"
    : "bg-white/86 ring-1 ring-white/72 shadow-sm";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", bg)}>
      <span className={cn("h-2 w-2 rounded-full", t.dot)} />
      <span className="text-[11px] font-semibold text-primary">{props.label}</span>
    </span>
  );
}

/* ── Month navigation header ────────────────────────────────── */
function CalendarNavHeader(props: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  compact?: boolean;
  darkBg?: boolean;
}) {
  const btnBase = props.darkBg
    ? "bg-white/18 ring-1 ring-white/30 text-white hover:bg-white/28"
    : "bg-white ring-1 ring-neutral-200/80 text-primary shadow-sm hover:bg-neutral-50";
  const labelBase = props.darkBg
    ? "bg-white/18 ring-1 ring-white/30 text-white"
    : "bg-white ring-1 ring-neutral-200/80 text-primary shadow-sm";

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={props.onPrev}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition active:scale-95",
          props.compact ? "h-8 w-8" : "h-9 w-9",
          btnBase,
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className={props.compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      <div className={cn(
        "rounded-lg px-3 py-1.5 font-semibold",
        props.compact ? "text-sm" : "text-sm",
        labelBase,
      )}>
        {format(props.month, "MMMM yyyy")}
      </div>

      <button
        type="button"
        onClick={props.onNext}
        className={cn(
          "inline-flex items-center justify-center rounded-lg transition active:scale-95",
          props.compact ? "h-8 w-8" : "h-9 w-9",
          btnBase,
        )}
        aria-label="Next month"
      >
        <ChevronRight className={props.compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

/* ── Day Cell ────────────────────────────────────────────────── */
function DayCell(props: {
  day: Date;
  status: SharedAvailabilityStatus;
  role: SharedAvailabilityRole;
  selected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isRangeMiddle: boolean;
  isCurrentMonth: boolean;
  onClick?: () => void;
  isPublicPremium?: boolean;
}) {
  const { day, status, selected, isRangeStart, isRangeEnd, isCurrentMonth } = props;
  const t = tone(status);
  const srLabel = labelForStatus(status, props.role);
  const blockedPattern = props.isPublicPremium && (status === "BOOKED" || status === "BLOCKED");
  const dotColor = blockedPattern ? "bg-black/40" : t.dot;
  const isEdge = selected && (isRangeStart || isRangeEnd);

  const cellClass = cn(
    "relative overflow-hidden transition-all outline-none",
    // Public premium: square cells
    props.isPublicPremium
      ? "aspect-square rounded-lg p-1 shadow-[0_2px_6px_rgba(11,15,25,0.06)]"
      : "rounded-lg p-1.5 h-9 sm:h-11",
    // Ring
    props.isPublicPremium ? "ring-1 ring-black/5" : "ring-1 ring-black/[0.04]",
    // Background fill
    isEdge ? "!bg-indigo-600 ring-0" : t.fill,
    props.isPublicPremium && isEdge && "!bg-emerald-600",
    !isEdge && props.isPublicPremium && blockedPattern
      ? "bg-black/[0.05] hover:bg-black/[0.07]"
      : !isEdge && t.hoverFill,
    // Range middle tint
    selected && props.isRangeMiddle && !isEdge && "!bg-indigo-100/60 ring-indigo-200/30",
    props.isPublicPremium && selected && props.isRangeMiddle && "!bg-emerald-500/18 ring-emerald-400/20",
    // Disabled month days
    !isCurrentMonth && "opacity-35",
    // Blocked pattern overlay
    blockedPattern &&
      "before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,rgba(17,24,39,0.07)_0,rgba(17,24,39,0.07)_1.5px,transparent_1.5px,transparent_7px)]",
    // Focus ring
    "focus-visible:ring-4",
    t.focusRing,
    props.onClick && "cursor-pointer active:scale-[0.97]",
  );

  const content = props.isPublicPremium ? (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("text-xs font-semibold leading-none", isEdge ? "text-white" : "text-primary")}>
          {format(day, "d")}
        </span>
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} aria-hidden="true" />
      </div>
      <span className="sr-only">{srLabel}</span>
    </>
  ) : (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("text-[11px] font-semibold leading-none sm:text-xs", isEdge ? "text-white" : "text-primary")}>
          {format(day, "d")}
        </span>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} aria-hidden="true" />
      </div>
      {/* Status chip — sm+ only, hidden on mobile to keep cells compact */}
      <div className="mt-1 hidden sm:block">
        <span className={cn("inline-flex rounded-md px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide", t.chipBg, t.chipText)}>
          {srLabel.slice(0, 4)}
        </span>
      </div>
      <span className="sr-only">{srLabel}</span>
    </>
  );

  if (props.onClick) {
    return (
      <button type="button" onClick={props.onClick} className={cellClass}>
        {content}
      </button>
    );
  }
  return <div className={cellClass}>{content}</div>;
}

/* ── Main calendar component ─────────────────────────────────── */
export function SharedAvailabilityCalendar(props: {
  role: SharedAvailabilityRole;
  month: Date;
  onMonthChange: (month: Date) => void;
  days: SharedAvailabilityDay[];
  title: string;
  subtitle?: string;
  propertySelector?: ReactNode;
  selectedRange?: SharedAvailabilityRange | null;
  onSelectDay?: (day: Date) => void;
  variant?: "default" | "publicPremium";
  className?: string;
}) {
  const touchStartX = useRef<number | null>(null);
  const isPublicPremium = props.variant === "publicPremium";
  const clickable = typeof props.onSelectDay === "function";

  const dayMap = useMemo(() => new Map(props.days.map((row) => [row.date, row.status])), [props.days]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(props.month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(props.month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [props.month]);

  const legend = useMemo(() => legendItems(props.role), [props.role]);

  function onTouchStart(e: TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 36) return;
    if (delta < 0) props.onMonthChange(addMonths(props.month, 1));
    if (delta > 0) props.onMonthChange(addMonths(props.month, -1));
  }

  /* ── Calendar grid ───────────────────────────────────────── */
  const calendarGrid = (
    <div
      className={cn(
        isPublicPremium
          ? "rounded-xl bg-white/74 p-2 shadow-sm ring-1 ring-white/70"
          : "rounded-xl bg-neutral-50/60",
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
          <div key={label} className="py-1.5">{label}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {gridDays.map((day) => {
          const rawStatus = dayMap.get(toIsoDay(day)) ?? "AVAILABLE";
          const status = normalizeStatusByRole(rawStatus, props.role);
          const selected = inSelectedRange(day, props.selectedRange);
          const from = props.selectedRange?.from;
          const to = props.selectedRange?.to ?? props.selectedRange?.from ?? null;

          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              status={status}
              role={props.role}
              selected={selected}
              isRangeStart={Boolean(from && isSameDay(day, from))}
              isRangeEnd={Boolean(to && isSameDay(day, to))}
              isRangeMiddle={selected && !Boolean(from && isSameDay(day, from)) && !Boolean(to && isSameDay(day, to))}
              isCurrentMonth={isSameMonth(day, props.month)}
              isPublicPremium={isPublicPremium}
              onClick={clickable ? () => props.onSelectDay?.(day) : undefined}
            />
          );
        })}
      </div>
    </div>
  );

  /* ── Public premium variant ──────────────────────────────── */
  if (isPublicPremium) {
    return (
      <section
        className={cn(
          "premium-card premium-card-tinted rounded-2xl border border-white/70 p-4 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-5",
          props.className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold tracking-tight text-primary">{props.title}</div>
            {props.subtitle ? <div className="mt-0.5 text-xs text-secondary">{props.subtitle}</div> : null}
          </div>
          <CalendarNavHeader
            month={props.month}
            onPrev={() => props.onMonthChange(addMonths(props.month, -1))}
            onNext={() => props.onMonthChange(addMonths(props.month, 1))}
            compact
          />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_200px]">
          <div>{calendarGrid}</div>
          <aside className="space-y-3">
            <div className="rounded-xl bg-white/78 p-3 ring-1 ring-white/72">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Legend</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {legend.map((item) => (
                  <LegendPill key={`premium-${item.status}`} status={item.status} label={item.label} />
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-white/78 p-3 ring-1 ring-white/72">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Policy notes</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-secondary">
                <li>Rates and availability refresh in real time.</li>
                <li>Unavailable dates are not bookable at checkout.</li>
                <li>Cancellation terms appear in the booking quote step.</li>
              </ul>
            </div>
          </aside>
          {/* Mobile legend */}
          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            {legend.map((item) => (
              <LegendPill key={`premium-mobile-${item.status}`} status={item.status} label={item.label} />
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted lg:hidden">Swipe calendar to change month.</p>
      </section>
    );
  }

  /* ── Portal (default) variant — premium redesign ─────────── */
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm",
        props.className,
      )}
    >
      {/* Header band — indigo-tinted, contains title + month nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 bg-gradient-to-br from-indigo-50/60 to-slate-50/20 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary">{props.title}</div>
          {props.subtitle ? (
            <div className="mt-0.5 text-[11px] text-secondary">{props.subtitle}</div>
          ) : null}
        </div>
        <CalendarNavHeader
          month={props.month}
          onPrev={() => props.onMonthChange(addMonths(props.month, -1))}
          onNext={() => props.onMonthChange(addMonths(props.month, 1))}
          compact
        />
      </div>

      {/* Property selector + legend row */}
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 px-4 py-2.5 sm:px-5">
        {props.propertySelector ? (
          <div className="min-w-0 flex-1">{props.propertySelector}</div>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          {legend.map((item) => (
            <LegendPill key={item.status} status={item.status} label={item.label} solid />
          ))}
        </div>
      </div>

      {/* Calendar grid body */}
      <div className="p-3 sm:p-4">
        {/* Mobile swipe hint */}
        <p className="mb-2 text-[10px] text-muted sm:hidden">Swipe left or right to change month.</p>
        {calendarGrid}
      </div>
    </div>
  );
}
