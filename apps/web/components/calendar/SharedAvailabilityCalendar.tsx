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
      fill: "bg-emerald-500/18",
      hoverFill: "hover:bg-emerald-500/28",
      rail: "bg-emerald-500/85",
      dot: "bg-emerald-500",
      chipBg: "bg-emerald-500/14",
      chipText: "text-emerald-700",
      focusRing: "focus-visible:ring-emerald-400/30",
    };
  }

  if (status === "BOOKED") {
    return {
      fill: "bg-rose-500/18",
      hoverFill: "hover:bg-rose-500/26",
      rail: "bg-rose-500/85",
      dot: "bg-rose-500",
      chipBg: "bg-rose-500/14",
      chipText: "text-rose-700",
      focusRing: "focus-visible:ring-rose-400/30",
    };
  }

  if (status === "HOLD") {
    return {
      fill: "bg-amber-400/20",
      hoverFill: "hover:bg-amber-400/28",
      rail: "bg-amber-400/90",
      dot: "bg-amber-400",
      chipBg: "bg-amber-400/18",
      chipText: "text-amber-700",
      focusRing: "focus-visible:ring-amber-400/30",
    };
  }

  // BLOCKED — cool slate
  return {
    fill: "bg-slate-400/14",
    hoverFill: "hover:bg-slate-400/20",
    rail: "bg-slate-400/80",
    dot: "bg-slate-400",
    chipBg: "bg-slate-100",
    chipText: "text-slate-600",
    focusRing: "focus-visible:ring-slate-400/25",
  };
}

function LegendPill(props: { status: SharedAvailabilityStatus; label: string }) {
  const t = tone(props.status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/86 px-2.5 py-1 shadow-sm ring-1 ring-white/72">
      <span className={cn("h-2 w-2 rounded-full", t.dot)} />
      <span className="text-xs font-semibold text-primary">{props.label}</span>
    </span>
  );
}

/* ── Month navigation header ────────────────────────────────────── */
function CalendarNavHeader(props: {
  month: Date;
  onPrev: () => void;
  onNext: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={props.onPrev}
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-white/90 text-primary shadow-sm ring-1 ring-white/72 hover:bg-white active:scale-95 transition",
          props.compact ? "h-8 w-8" : "h-9 w-9",
        )}
        aria-label="Previous month"
      >
        <ChevronLeft className={props.compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      <div className={cn(
        "rounded-xl bg-white/90 px-3 py-1.5 font-semibold text-primary shadow-sm ring-1 ring-white/72",
        props.compact ? "text-sm" : "text-sm",
      )}>
        {format(props.month, "MMMM yyyy")}
      </div>

      <button
        type="button"
        onClick={props.onNext}
        className={cn(
          "inline-flex items-center justify-center rounded-xl bg-white/90 text-primary shadow-sm ring-1 ring-white/72 hover:bg-white active:scale-95 transition",
          props.compact ? "h-8 w-8" : "h-9 w-9",
        )}
        aria-label="Next month"
      >
        <ChevronRight className={props.compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}

/* ── Day Cell ───────────────────────────────────────────────────── */
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
  const { day, status, selected, isRangeStart, isRangeEnd, isRangeMiddle, isCurrentMonth } = props;
  const t = tone(status);
  const srLabel = labelForStatus(status, props.role);
  const blockedPattern = props.isPublicPremium && (status === "BOOKED" || status === "BLOCKED");
  const dotColor = blockedPattern ? "bg-black/40" : t.dot;

  const cellClass = cn(
    "relative overflow-hidden transition outline-none",
    // Size: tiny on mobile, comfortable on desktop
    props.isPublicPremium
      ? "aspect-square rounded-lg p-1 shadow-[0_4px_10px_rgba(11,15,25,0.07)]"
      : "rounded-xl p-1.5 shadow-[0_4px_10px_rgba(11,15,25,0.06)] h-10 sm:h-14",
    "ring-1 ring-black/5",
    t.fill,
    t.hoverFill,
    selected && isRangeMiddle && "bg-emerald-500/18 ring-emerald-400/20",
    selected && (isRangeStart || isRangeEnd) && "!bg-emerald-600 ring-0",
    !isCurrentMonth && "opacity-40",
    blockedPattern && "bg-black/[0.05] hover:bg-black/[0.07]",
    selected && "ring-2 ring-emerald-500/45",
    "focus-visible:ring-4",
    t.focusRing,
    props.onClick && "cursor-pointer active:scale-[0.97]",
    blockedPattern &&
      "before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,rgba(17,24,39,0.07)_0,rgba(17,24,39,0.07)_1.5px,transparent_1.5px,transparent_7px)]",
  );

  const content = props.isPublicPremium ? (
    <>
      <div className="flex items-start justify-between">
        <span className={cn("text-xs font-semibold leading-none", selected && (isRangeStart || isRangeEnd) ? "text-white" : "text-primary")}>
          {format(day, "d")}
        </span>
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} aria-hidden="true" />
      </div>
      <span className="sr-only">{srLabel}</span>
    </>
  ) : (
    <>
      {/* Status rail — left edge */}
      <div className={cn("pointer-events-none absolute bottom-1.5 left-0 top-1.5 w-1 rounded-r-full", t.rail)} />
      <div className="flex items-start justify-between gap-1 pl-2">
        <span className={cn("text-xs font-semibold leading-none", selected && (isRangeStart || isRangeEnd) ? "text-white" : "text-primary")}>
          {format(day, "d")}
        </span>
        <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", dotColor)} aria-hidden="true" />
      </div>
      {/* Status label — hidden on very small, visible sm+ */}
      <div className="mt-1 hidden pl-2 sm:block">
        <span className={cn("inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", t.chipBg, t.chipText)}>
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

/* ── Main calendar component ────────────────────────────────────── */
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

  /* ── Calendar grid ──────────────────────────────────────────── */
  const calendarGrid = (
    <div
      className={cn(
        "rounded-2xl p-2.5 shadow-sm ring-1 ring-white/70",
        isPublicPremium
          ? "bg-white/74 p-2"
          : "bg-white/80 sm:p-3",
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-wide text-muted">
        {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
          <div key={label} className="py-1">{label}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
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

  /* ── Public premium variant ─────────────────────────────────── */
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
            <div className="rounded-2xl bg-white/78 p-3 ring-1 ring-white/72">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Legend</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {legend.map((item) => (
                  <LegendPill key={`premium-${item.status}`} status={item.status} label={item.label} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/78 p-3 ring-1 ring-white/72">
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

  /* ── Portal (default) variant ───────────────────────────────── */
  return (
    <section
      className={cn(
        "premium-card-tinted rounded-2xl p-4 shadow-sm sm:p-5",
        props.className,
      )}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-primary">{props.title}</div>
          {props.subtitle ? <div className="mt-0.5 text-xs text-secondary">{props.subtitle}</div> : null}
        </div>
        <CalendarNavHeader
          month={props.month}
          onPrev={() => props.onMonthChange(addMonths(props.month, -1))}
          onNext={() => props.onMonthChange(addMonths(props.month, 1))}
          compact
        />
      </div>

      {/* Property selector + legend row */}
      <div
        className={cn(
          "mt-3 grid gap-2",
          props.propertySelector
            ? "lg:grid-cols-[1fr_auto] lg:items-center"
            : "sm:flex sm:items-center sm:justify-end",
        )}
      >
        {props.propertySelector ?? null}

        {/* Desktop legend */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {legend.map((item) => (
            <LegendPill key={item.status} status={item.status} label={item.label} />
          ))}
        </div>

        {/* Mobile collapsible legend */}
        <details className="sm:hidden">
          <summary className="cursor-pointer rounded-xl bg-white/86 px-3 py-2 text-xs font-semibold text-primary shadow-sm ring-1 ring-white/72">
            Calendar legend ▸
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {legend.map((item) => (
              <LegendPill key={`m-${item.status}`} status={item.status} label={item.label} />
            ))}
          </div>
        </details>
      </div>

      {/* Swipe hint — mobile only */}
      <p className="mt-1.5 text-[10px] text-muted sm:hidden">Swipe calendar to change month.</p>

      {/* Grid */}
      <div className="mt-3">{calendarGrid}</div>
    </section>
  );
}
