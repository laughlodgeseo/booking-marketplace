"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarCheck2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { PortalCalendarEvent, PortalCalendarResponse } from "@/lib/api/portal/calendar";
import { SharedAvailabilityCalendar, type SharedAvailabilityStatus } from "@/components/calendar/SharedAvailabilityCalendar";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";

type RoleView = "vendor" | "admin" | "customer";

type DateRange = {
  from: Date | null;
  to: Date | null;
};

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

function toIsoDay(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function eventOverlapsRange(event: PortalCalendarEvent, from: Date, toExclusive: Date): boolean {
  const eventStart = parseISO(event.start);
  const eventEnd = parseISO(event.end);
  return eventStart < toExclusive && eventEnd > from;
}

function classifyDay(events: PortalCalendarEvent[], day: Date): "booked" | "blocked" | "held" | "available" {
  const from = startOfDay(day);
  const toExclusive = addDays(from, 1);
  const daily = events.filter((event) => eventOverlapsRange(event, from, toExclusive));

  if (daily.some((event) => event.type === "BOOKING")) return "booked";
  if (daily.some((event) => event.type === "BLOCKED")) return "blocked";
  if (daily.some((event) => event.type === "HOLD")) return "held";
  return "available";
}

function toCalendarStatus(tone: "booked" | "blocked" | "held" | "available"): SharedAvailabilityStatus {
  if (tone === "booked") return "BOOKED";
  if (tone === "blocked") return "BLOCKED";
  if (tone === "held") return "HOLD";
  return "AVAILABLE";
}

function statusTone(event: PortalCalendarEvent): "success" | "warning" | "danger" | "neutral" {
  if (event.type === "BOOKING") {
    const value = event.status.toUpperCase();
    if (value.includes("CONFIRM") || value.includes("COMPLETE")) return "success";
    if (value.includes("PENDING") || value.includes("HOLD")) return "warning";
    if (value.includes("CANCEL") || value.includes("FAILED")) return "danger";
    return "neutral";
  }

  if (event.type === "BLOCKED") return "neutral";
  if (event.type === "HOLD") return "warning";
  return "neutral";
}

function formatMoney(amount: number | null, currency: string | null): string {
  if (amount === null || !currency) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDisplayDate(value: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(value);
}

function rangeLabel(range: DateRange, locale: string, emptyLabel: string): string {
  const from = range.from;
  const to = range.to ?? range.from;
  if (!from || !to) return emptyLabel;
  if (isSameDay(from, to)) return formatDisplayDate(from, locale);
  return `${formatDisplayDate(from, locale)} - ${formatDisplayDate(to, locale)}`;
}

function roleIntro(role: RoleView, tPortal: ReturnType<typeof useTranslations>): string {
  if (role === "vendor") return tPortal("calendar.introVendor");
  if (role === "admin") return tPortal("calendar.introAdmin");
  return tPortal("calendar.introCustomer");
}

export function PortalAvailabilityCalendar(props: {
  role: RoleView;
  loadData: (params: { from: string; to: string; propertyId?: string }) => Promise<PortalCalendarResponse>;
  allowBlockControls?: boolean;
  blockControlMode?: "direct" | "request";
  eventHref?: (event: PortalCalendarEvent) => string | null;
  onBlockRange?: (params: { propertyId: string; from: string; to: string; note?: string }) => Promise<unknown>;
  onUnblockRange?: (params: { propertyId: string; from: string; to: string; note?: string }) => Promise<unknown>;
}) {
  const { loadData, role } = props;
  const tPortal = useTranslations("portal");
  const locale = useLocale();

  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [rangeFrom, setRangeFrom] = useState<string>("");
  const [rangeTo, setRangeTo] = useState<string>("");
  const [rangeNote, setRangeNote] = useState<string>("");
  const [rangeBusy, setRangeBusy] = useState<string | null>(null);
  const [rangeMessage, setRangeMessage] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "error"; message: string }
    | { kind: "ready"; data: PortalCalendarResponse }
  >({ kind: "loading" });

  const [range, setRange] = useState<DateRange>({ from: null, to: null });

  useEffect(() => {
    let alive = true;

    async function load() {
      setState({ kind: "loading" });
      try {
        const from = toIsoDay(startOfMonth(month));
        const to = toIsoDay(addMonths(startOfMonth(month), 1));

        const data = await loadData({
          from,
          to,
          propertyId: selectedPropertyId ?? undefined,
        });

        if (!alive) return;
        setState({ kind: "ready", data });

        if (!selectedPropertyId && data.selectedPropertyId) {
          setSelectedPropertyId(data.selectedPropertyId);
        }
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : tPortal("calendar.errors.load"),
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadData, month, refreshTick, selectedPropertyId]);

  useEffect(() => {
    const from = toIsoDay(startOfMonth(month));
    const to = toIsoDay(addDays(startOfMonth(month), 1));
    setRangeFrom(from);
    setRangeTo(to);
  }, [month]);

  const data = state.kind === "ready" ? state.data : null;
  const events = useMemo(() => data?.events ?? [], [data]);

  const activeRange = useMemo(() => {
    if (!range.from) return null;
    const from = startOfDay(range.from);
    const to = startOfDay(range.to ?? range.from);
    const start = isAfter(from, to) ? to : from;
    const end = isAfter(from, to) ? from : to;
    return { from: start, to: end };
  }, [range.from, range.to]);

  const detailEvents = useMemo(() => {
    if (!activeRange) return [];
    const toExclusive = addDays(activeRange.to, 1);
    return events.filter((event) => eventOverlapsRange(event, activeRange.from, toExclusive));
  }, [activeRange, events]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Array<{ date: string; status: SharedAvailabilityStatus }> = [];

    for (let day = start; day <= end; day = addDays(day, 1)) {
      out.push({
        date: toIsoDay(day),
        status: toCalendarStatus(classifyDay(events, day)),
      });
    }
    return out;
  }, [events, month]);

  function pickDay(day: Date) {
    setRange((current) => {
      if (!current.from || current.to) return { from: day, to: null };
      if (isBefore(day, current.from)) return { from: day, to: current.from };
      if (isSameDay(day, current.from)) return { from: day, to: day };
      return { from: current.from, to: day };
    });
  }

  const propertySelector = (
    <label className="flex items-center gap-3 rounded-2xl bg-surface/82 px-4 py-3 ring-1 ring-line/24">
      <span className="text-xs font-semibold tracking-wide text-muted">{tPortal("calendar.propertyLabel")}</span>
      <select
        value={selectedPropertyId ?? data?.selectedPropertyId ?? ""}
        onChange={(event) => setSelectedPropertyId(event.target.value || null)}
        className="w-full bg-transparent text-sm font-semibold text-primary outline-none"
        disabled={!data || data.properties.length === 0}
      >
        {(data?.properties ?? []).map((property) => (
          <option key={property.id} value={property.id}>
            {property.title}
            {property.city ? ` (${property.city})` : ""}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="space-y-5">
      {state.kind === "loading" ? (
        <div className="grid gap-3">
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-[420px]" />
        </div>
      ) : state.kind === "error" ? (
        <div className="rounded-3xl bg-[rgb(var(--color-danger-rgb)/0.12)] p-6 text-sm text-[rgb(var(--color-danger-rgb)/1)] ring-1 ring-danger/20">
          {state.message}
        </div>
      ) : (
        <>
          <SharedAvailabilityCalendar
            role={role}
            month={month}
            onMonthChange={setMonth}
            days={calendarDays}
            title={tPortal("calendar.monthlyAvailability")}
            subtitle={roleIntro(role, tPortal)}
            propertySelector={propertySelector}
            selectedRange={range}
            onSelectDay={pickDay}
          />

          {props.allowBlockControls && role === "vendor" ? (
            <div className="portal-card rounded-3xl bg-surface/82 p-4">
              <div className="text-sm font-semibold text-primary">
                {props.blockControlMode === "request"
                  ? tPortal("calendar.blockRequestTitle")
                  : tPortal("calendar.ownerControlsTitle")}
              </div>
              <div className="mt-1 text-xs text-secondary">
                {props.blockControlMode === "request"
                  ? tPortal("calendar.blockRequestDescription")
                  : tPortal("calendar.ownerControlsDescription")}
              </div>

              <div
                className={[
                  "mt-4 grid gap-2",
                  props.blockControlMode === "request"
                    ? "lg:grid-cols-[1fr_1fr_2fr_auto]"
                    : "lg:grid-cols-[1fr_1fr_2fr_auto_auto]",
                ].join(" ")}
              >
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(event) => setRangeFrom(event.target.value)}
                  className="h-10 rounded-2xl bg-surface/82 px-3 text-sm text-primary ring-1 ring-line/24 outline-none focus-visible:ring-4 focus-visible:ring-brand/16"
                />
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(event) => setRangeTo(event.target.value)}
                  className="h-10 rounded-2xl bg-surface/82 px-3 text-sm text-primary ring-1 ring-line/24 outline-none focus-visible:ring-4 focus-visible:ring-brand/16"
                />
                <input
                  value={rangeNote}
                  onChange={(event) => setRangeNote(event.target.value)}
                  placeholder={tPortal("calendar.noteOptional")}
                  className="h-10 rounded-2xl bg-surface/82 px-3 text-sm text-primary ring-1 ring-line/24 outline-none focus-visible:ring-4 focus-visible:ring-brand/16"
                />
                <button
                  type="button"
                  disabled={!selectedPropertyId || !rangeFrom || !rangeTo || rangeBusy !== null}
                  onClick={async () => {
                    if (!props.onBlockRange || !selectedPropertyId) return;
                    setRangeError(null);
                    setRangeMessage(null);
                    setRangeBusy(tPortal("calendar.busy.blocking"));
                    try {
                      await props.onBlockRange({
                        propertyId: selectedPropertyId,
                        from: rangeFrom,
                        to: rangeTo,
                        note: rangeNote.trim() || undefined,
                      });
                      setRangeMessage(
                        props.blockControlMode === "request"
                          ? tPortal("calendar.success.blockRequestSubmitted")
                          : tPortal("calendar.success.blocked"),
                      );
                      setRefreshTick((value) => value + 1);
                    } catch (error) {
                      console.error("Failed to submit block request", error);
                      setRangeError(
                        error instanceof Error
                          ? error.message
                          : props.blockControlMode === "request"
                            ? tPortal("calendar.errors.submitBlockRequest")
                            : tPortal("calendar.errors.blockDates"),
                      );
                    } finally {
                      setRangeBusy(null);
                    }
                  }}
                  className="rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(79,70,229,0.22)] hover:bg-brand-hover disabled:opacity-60"
                >
                  {props.blockControlMode === "request"
                    ? tPortal("calendar.submitRequest")
                    : tPortal("calendar.block")}
                </button>

                {props.blockControlMode !== "request" && props.onUnblockRange ? (
                  <button
                    type="button"
                    disabled={!selectedPropertyId || !rangeFrom || !rangeTo || rangeBusy !== null}
                    onClick={async () => {
                      if (!props.onUnblockRange || !selectedPropertyId) return;
                      setRangeError(null);
                      setRangeMessage(null);
                      setRangeBusy(tPortal("calendar.busy.unblocking"));
                      try {
                        await props.onUnblockRange({
                          propertyId: selectedPropertyId,
                          from: rangeFrom,
                          to: rangeTo,
                          note: rangeNote.trim() || undefined,
                        });
                        setRangeMessage(tPortal("calendar.success.unblocked"));
                        setRefreshTick((value) => value + 1);
                      } catch (error) {
                        console.error("Failed to unblock dates", error);
                        setRangeError(
                          error instanceof Error ? error.message : tPortal("calendar.errors.unblockDates"),
                        );
                      } finally {
                        setRangeBusy(null);
                      }
                    }}
                    className="rounded-2xl bg-surface/82 px-4 py-2 text-sm font-semibold text-primary ring-1 ring-line/24 hover:bg-accent-soft/20 disabled:opacity-60"
                  >
                    {tPortal("calendar.unblock")}
                  </button>
                ) : null}
              </div>

              {rangeBusy ? <div className="mt-2 text-xs font-semibold text-secondary">{rangeBusy}</div> : null}

              {rangeMessage ? (
                <div className="mt-3 rounded-2xl bg-[rgb(var(--color-success-rgb)/0.12)] p-3 text-xs text-[rgb(var(--color-success-rgb)/1)] ring-1 ring-success/22">
                  {rangeMessage}
                </div>
              ) : null}

              {rangeError ? (
                <div className="mt-3 rounded-2xl bg-[rgb(var(--color-danger-rgb)/0.12)] p-3 text-xs text-[rgb(var(--color-danger-rgb)/1)] ring-1 ring-danger/20">
                  {rangeError}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {range.from ? (
        <section className="portal-card rounded-3xl bg-surface/82 p-4">
          <div className="rounded-3xl bg-warm-alt/66 p-4 text-sm text-secondary ring-1 ring-line/20">
            <div className="font-semibold text-primary">
              {rangeLabel(range, locale, tPortal("calendar.noDateSelected"))}
            </div>
            <div className="mt-1">
              {(data?.properties ?? []).find(
                (property) => property.id === (selectedPropertyId ?? data?.selectedPropertyId ?? ""),
              )?.title ?? tPortal("calendar.selectedProperty")}
            </div>
          </div>

          {detailEvents.length === 0 ? (
            <div className="mt-3 rounded-3xl bg-[rgb(var(--color-success-rgb)/0.12)] p-4 text-sm text-[rgb(var(--color-success-rgb)/1)] ring-1 ring-success/22">
              <div className="font-semibold">{tPortal("calendar.available")}</div>
              <div className="mt-1">{tPortal("calendar.availableDescription")}</div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {detailEvents.map((event) => {
                const href = props.eventHref?.(event) ?? null;
                const body = (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-primary">{event.propertyTitle}</div>
                      <StatusPill tone={statusTone(event)}>{event.type === "BOOKING" ? event.status : event.type}</StatusPill>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm text-secondary sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <div className="text-xs font-semibold text-muted">{tPortal("calendar.checkIn")}</div>
                        <div className="mt-1">{formatDisplayDate(parseISO(event.start), locale)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted">{tPortal("calendar.checkOut")}</div>
                        <div className="mt-1">{formatDisplayDate(parseISO(event.end), locale)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted">{tPortal("calendar.guest")}</div>
                        <div className="mt-1">{event.guestDisplay ?? "-"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted">{tPortal("calendar.bookingRef")}</div>
                        <div className="mt-1 font-mono text-xs">{event.bookingRef ?? "-"}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-secondary">
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface/84 px-3 py-1 ring-1 ring-line/22">
                        <CalendarCheck2 className="h-3.5 w-3.5" />
                        {tPortal("calendar.status")}: {event.status}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface/84 px-3 py-1 ring-1 ring-line/22">
                        {tPortal("calendar.value")}: {formatMoney(event.totalAmount, event.currency)}
                      </span>
                      {event.note ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-surface/84 px-3 py-1 ring-1 ring-line/22">
                          {tPortal("calendar.note")}: {event.note}
                        </span>
                      ) : null}
                    </div>
                  </>
                );

                if (!href) {
                  return (
                    <div key={`${event.type}:${event.id}`} className="rounded-3xl bg-surface/84 p-4 ring-1 ring-line/22">
                      {body}
                    </div>
                  );
                }

                return (
                  <Link
                    key={`${event.type}:${event.id}`}
                    href={href}
                    className="block rounded-3xl bg-surface/84 p-4 ring-1 ring-line/22 transition hover:bg-accent-soft/20"
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
