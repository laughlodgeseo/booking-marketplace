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
  // Customer/public should not see vendor/admin-block distinction.
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

/**
 * Premium + readable palette rules
 * - Use CSS vars for system colors where possible
 * - Use richer tints so blocks look clearly different
 * - Keep it elegant: soft shadow + subtle ring; NO hard borders
 */
function tone(status: SharedAvailabilityStatus): {
  // full cell fill + hover
  fill: string;
  hoverFill: string;

  // accent rail (left)
  rail: string;

  // dot + small badge chip
  dot: string;
  chipBg: string;
  chipText: string;

  // focus ring
  focusRing: string;
} {
  // Available: richer emerald tint (still premium)
  if (status === "AVAILABLE") {
    return {
      fill: "bg-[rgb(var(--color-success-rgb)/0.24)]",
      hoverFill: "hover:bg-[rgb(var(--color-success-rgb)/0.30)]",
      rail: "bg-[rgb(var(--color-success-rgb)/0.85)]",
      dot: "bg-[rgb(var(--color-success-rgb)/1)]",
      chipBg: "bg-[rgb(var(--color-success-rgb)/0.18)]",
      chipText: "text-[rgb(var(--color-success-rgb)/1)]",
      focusRing: "focus-visible:ring-[rgb(var(--color-success-rgb)/0.22)]",
    };
  }

  // Booked: deep rose (use your danger var but make tint stronger)
  if (status === "BOOKED") {
    return {
      fill: "bg-[rgb(var(--color-danger-rgb)/0.20)]",
      hoverFill: "hover:bg-[rgb(var(--color-danger-rgb)/0.26)]",
      rail: "bg-[rgb(var(--color-danger-rgb)/0.85)]",
      dot: "bg-[rgb(var(--color-danger-rgb)/1)]",
      chipBg: "bg-[rgb(var(--color-danger-rgb)/0.18)]",
      chipText: "text-[rgb(var(--color-danger-rgb)/1)]",
      focusRing: "focus-visible:ring-[rgb(var(--color-danger-rgb)/0.22)]",
    };
  }

  // Hold: warm amber (warning)
  if (status === "HOLD") {
    return {
      fill: "bg-[rgb(var(--color-warning-rgb)/0.22)]",
      hoverFill: "hover:bg-[rgb(var(--color-warning-rgb)/0.28)]",
      rail: "bg-[rgb(var(--color-warning-rgb)/0.90)]",
      dot: "bg-[rgb(var(--color-warning-rgb)/1)]",
      chipBg: "bg-[rgb(var(--color-warning-rgb)/0.20)]",
      chipText: "text-[rgb(var(--color-warning-rgb)/1)]",
      focusRing: "focus-visible:ring-[rgb(var(--color-warning-rgb)/0.22)]",
    };
  }

  // Blocked: ink slate (more obvious than current)
  return {
    fill: "bg-[rgb(var(--color-ink-2-rgb)/0.12)]",
    hoverFill: "hover:bg-[rgb(var(--color-ink-2-rgb)/0.18)]",
    rail: "bg-[rgb(var(--color-ink-2-rgb)/0.85)]",
    dot: "bg-[rgb(var(--color-ink-2-rgb)/1)]",
    chipBg: "bg-[rgb(var(--color-ink-2-rgb)/0.10)]",
    chipText: "text-[rgb(var(--color-ink-2-rgb)/0.95)]",
    focusRing: "focus-visible:ring-[rgb(var(--color-ink-2-rgb)/0.20)]",
  };
}

function LegendPill(props: { status: SharedAvailabilityStatus; label: string }) {
  const t = tone(props.status);
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-surface-rgb)/0.86)] px-3 py-1 shadow-sm ring-1 ring-white/72">
      <span className={cn("h-2.5 w-2.5 rounded-full", t.dot)} />
      <span className="text-xs font-semibold text-primary">{props.label}</span>
    </span>
  );
}

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

  const dayMap = useMemo(() => new Map(props.days.map((row) => [row.date, row.status])), [props.days]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(props.month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(props.month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [props.month]);

  const legend = useMemo(() => legendItems(props.role), [props.role]);
  const clickable = typeof props.onSelectDay === "function";
  const isPublicPremium = props.variant === "publicPremium";

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < 36) return;
    if (delta < 0) props.onMonthChange(addMonths(props.month, 1));
    if (delta > 0) props.onMonthChange(addMonths(props.month, -1));
  }

  const calendarGrid = (
    <div
      className={cn(
        "rounded-3xl bg-[rgb(var(--color-surface-rgb)/0.8)] p-3 shadow-sm ring-1 ring-white/72",
        isPublicPremium && "rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.74)] p-2 ring-1 ring-white/72",
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          "grid grid-cols-7 text-center text-[11px] font-semibold tracking-wide text-muted",
          isPublicPremium ? "gap-1.5" : "gap-2",
        )}
      >
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((label) => (
          <div key={label} className={isPublicPremium ? "py-0.5" : "py-1"}>
            {label}
          </div>
        ))}
      </div>

      <div className={cn("mt-2 grid grid-cols-7", isPublicPremium ? "gap-1.5" : "gap-2")}>
        {gridDays.map((day) => {
          const rawStatus = dayMap.get(toIsoDay(day)) ?? "AVAILABLE";
          const status = normalizeStatusByRole(rawStatus, props.role);
          const selected = inSelectedRange(day, props.selectedRange);
          const from = props.selectedRange?.from;
          const to = props.selectedRange?.to ?? props.selectedRange?.from ?? null;
          const isRangeStart = Boolean(from && isSameDay(day, from));
          const isRangeEnd = Boolean(to && isSameDay(day, to));
          const isRangeMiddle = selected && !isRangeStart && !isRangeEnd;
          const t = tone(status);
          const srLabel = labelForStatus(status, props.role);
          const blockedPattern = isPublicPremium && (status === "BOOKED" || status === "BLOCKED");
          const dotTone = blockedPattern ? "bg-black/45" : t.dot;

          const base = cn(
            "relative overflow-hidden text-left transition",
            isPublicPremium
              ? "aspect-square rounded-xl p-1.5 shadow-[0_6px_16px_rgba(11,15,25,0.08)]"
              : "h-20 rounded-2xl p-2 shadow-[0_10px_22px_rgba(11,15,25,0.08)]",
            "ring-1 ring-black/5",
            t.fill,
            t.hoverFill,
            selected && isRangeMiddle && "bg-emerald-500/20 text-emerald-900",
            selected && (isRangeStart || isRangeEnd) && "bg-emerald-600 text-white",
            !isSameMonth(day, props.month) && "opacity-50",
            blockedPattern && "bg-black/[0.06] text-secondary hover:bg-black/[0.08]",
            selected &&
              (isPublicPremium
                ? "ring-2 ring-emerald-500/40"
                : "ring-2 ring-emerald-500/45"),
            "outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/20",
            clickable && "active:scale-[0.99]",
            blockedPattern &&
              "before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,rgba(17,24,39,0.09)_0,rgba(17,24,39,0.09)_2px,transparent_2px,transparent_8px)]",
          );

          const content = isPublicPremium ? (
            <>
              <div className="flex items-start justify-between gap-1">
                <span className={cn("text-xs font-semibold", selected && (isRangeStart || isRangeEnd) ? "text-white" : "text-primary")}>
                  {format(day, "d")}
                </span>
                <span className={cn("mt-0.5 h-2 w-2 rounded-full", dotTone)} aria-hidden="true" />
              </div>
              <span className="sr-only">{srLabel}</span>
            </>
          ) : (
            <>
              <div className={cn("pointer-events-none absolute bottom-2 left-0 top-2 w-1.5 rounded-r-full", t.rail)} />
              <div className="flex items-start justify-between gap-2">
                <span className={cn("text-xs font-semibold", selected && (isRangeStart || isRangeEnd) ? "text-white" : "text-primary")}>
                  {format(day, "d")}
                </span>
                <span className={cn("mt-0.5 h-2.5 w-2.5 rounded-full", dotTone)} aria-hidden="true" />
              </div>
              <div className="mt-2 hidden sm:block">
                <span className={cn("inline-flex rounded-full px-2 py-1 text-[10px] font-semibold", t.chipBg, t.chipText)}>
                  {srLabel.toUpperCase()}
                </span>
              </div>
              <span className="sr-only">{srLabel}</span>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-[linear-gradient(to_top,rgba(255,255,255,0.38),rgba(255,255,255,0))]" />
            </>
          );

          if (clickable) {
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => props.onSelectDay?.(day)}
                className={cn(base, t.focusRing)}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={day.toISOString()} className={base}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <section
      className={cn(
        isPublicPremium
          ? "premium-card premium-card-tinted rounded-2xl border border-white/70 p-4 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-5"
          : "premium-card-tinted rounded-3xl p-4 shadow-soft sm:p-5",
        props.className,
      )}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className={cn("font-semibold text-primary", isPublicPremium ? "text-lg tracking-tight" : "text-sm")}>
            {props.title}
          </div>
          {props.subtitle ? <div className={cn("mt-1 text-secondary", isPublicPremium ? "text-xs" : "text-sm")}>{props.subtitle}</div> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => props.onMonthChange(addMonths(props.month, -1))}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-surface-rgb)/0.9)] px-3 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/72 hover:bg-white active:scale-[0.99]",
                isPublicPremium ? "h-9" : "h-10",
              )}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>

          <div className="rounded-2xl bg-[rgb(var(--color-surface-rgb)/0.9)] px-4 py-2 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/72">
            {format(props.month, "MMMM yyyy")}
          </div>

            <button
              type="button"
              onClick={() => props.onMonthChange(addMonths(props.month, 1))}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl bg-[rgb(var(--color-surface-rgb)/0.9)] px-3 text-sm font-semibold text-primary shadow-sm ring-1 ring-white/72 hover:bg-white active:scale-[0.99]",
                isPublicPremium ? "h-9" : "h-10",
              )}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isPublicPremium ? (
        <div
          className={cn(
            "mt-4 grid gap-3",
            props.propertySelector
              ? "lg:grid-cols-[1fr_auto] lg:items-center"
              : "sm:flex sm:items-center sm:justify-end",
          )}
        >
          {props.propertySelector ? props.propertySelector : null}

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {legend.map((item) => (
              <LegendPill key={item.status} status={item.status} label={item.label} />
            ))}
          </div>

          <details className="sm:hidden">
            <summary className="cursor-pointer rounded-xl bg-[rgb(var(--color-surface-rgb)/0.86)] px-3 py-2 text-xs font-semibold text-primary shadow-sm ring-1 ring-white/72">
              Calendar legend
            </summary>
            <div className="mt-2 grid gap-2">
              {legend.map((item) => (
                <LegendPill key={`m-${item.status}`} status={item.status} label={item.label} />
              ))}
            </div>
          </details>
        </div>
      ) : null}

      <div
        className={cn(
          "mt-2 text-xs text-muted",
          isPublicPremium ? "lg:hidden" : "sm:hidden",
        )}
      >
        Swipe left or right on calendar to change month.
      </div>

      {isPublicPremium ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_208px]">
          <div>{calendarGrid}</div>

          <aside className="space-y-3">
            <div className="rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-3 ring-1 ring-white/72">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Legend</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {legend.map((item) => (
                  <LegendPill key={`premium-${item.status}`} status={item.status} label={item.label} />
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.78)] p-3 ring-1 ring-white/72">
              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Policy notes</div>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-secondary">
                <li>Rates and availability refresh in real time before hold creation.</li>
                <li>Unavailable dates are not bookable in checkout.</li>
                <li>Final cancellation terms appear in the booking quote step.</li>
              </ul>
            </div>
          </aside>

          <div className="flex flex-wrap items-center gap-2 lg:hidden">
            {legend.map((item) => (
              <LegendPill key={`premium-mobile-${item.status}`} status={item.status} label={item.label} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4">{calendarGrid}</div>
      )}
    </section>
  );
}
