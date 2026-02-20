"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import DateRangePicker, { type DateRangeValue } from "./DateRangePicker";
import { quote, reserve } from "@/lib/api/properties";
import type { QuoteResponse, ReserveResponse } from "@/lib/types/property";
import { CalendarDays, Users, ShieldCheck, Timer, Sparkles, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import { isValidIsoRange } from "@/lib/date-range";

function formatIsoShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

type UiState =
  | { kind: "idle" }
  | { kind: "loadingQuote" }
  | { kind: "quoted"; quote: QuoteResponse }
  | { kind: "reserving"; quote: QuoteResponse }
  | { kind: "reserved"; reserved: ReserveResponse }
  | { kind: "error"; message: string };

type Props = {
  propertyId: string;
  currency: string;
  priceFrom: number;
};

function TrustChip(props: { icon: React.ReactNode; text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-primary">
      <span className="text-secondary">{props.icon}</span>
      <span className="whitespace-nowrap">{props.text}</span>
    </div>
  );
}

function LabelRow(props: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-secondary">{props.label}</span>
      <span className={`${props.emphasize ? "text-base" : ""} font-semibold text-primary`}>
        {props.value}
      </span>
    </div>
  );
}

const GUEST_PRESETS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export default function QuotePanel({ propertyId, priceFrom }: Props) {
  const selectedCurrency = useCurrency();
  const [dates, setDates] = useState<DateRangeValue>({ from: null, to: null });
  const [guests, setGuests] = useState<number>(2);
  const [ui, setUi] = useState<UiState>({ kind: "idle" });
  const [mobileOpen, setMobileOpen] = useState(false);

  const canQuote = useMemo(() => {
    return isValidIsoRange(dates.from, dates.to) && guests >= 1 && guests <= 16;
  }, [dates.from, dates.to, guests]);

  async function runQuote() {
    if (!dates.from || !dates.to) return;
    setUi({ kind: "loadingQuote" });

    const res = await quote(propertyId, {
      checkIn: dates.from,
      checkOut: dates.to,
      guests,
      currency: selectedCurrency.currency,
    });
    if (!res.ok) {
      setUi({ kind: "error", message: res.message });
      return;
    }
    setUi({ kind: "quoted", quote: res.data });
    setMobileOpen(true);
  }

  async function runReserve() {
    if (ui.kind !== "quoted") return;
    if (!dates.from || !dates.to) return;

    setUi({ kind: "reserving", quote: ui.quote });
    setMobileOpen(true);
    const res = await reserve(propertyId, {
      checkIn: dates.from,
      checkOut: dates.to,
      guests,
      currency: selectedCurrency.currency,
    });

    if (!res.ok) {
      setUi({ kind: "error", message: res.message });
      return;
    }
    if (!res.data.canReserve || !res.data.hold) {
      const reasons = Array.isArray(res.data.reasons)
        ? res.data.reasons.filter((x): x is string => typeof x === "string")
        : [];
      setUi({
        kind: "error",
        message: reasons.length > 0 ? reasons.join(" ") : "Selected dates are unavailable.",
      });
      return;
    }
    setUi({ kind: "reserved", reserved: res.data });
    setMobileOpen(true);
  }

  const breakdown = ui.kind === "quoted" || ui.kind === "reserving" ? ui.quote.breakdown : null;

  const hold = ui.kind === "reserved" ? ui.reserved.hold : null;
  const checkoutHref = hold?.id
  ? `/checkout/${encodeURIComponent(propertyId)}?holdId=${encodeURIComponent(hold.id)}`
  : `/checkout/${encodeURIComponent(propertyId)}`;

  const displayMoneyFromAed = (amount: number) =>
    selectedCurrency.formatFromAed(amount, { maximumFractionDigits: 0 });
  const quoteCurrency =
    ui.kind === "quoted" || ui.kind === "reserving"
      ? (ui.quote.currency ?? selectedCurrency.currency)
      : selectedCurrency.currency;
  const displayQuoteMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: quoteCurrency,
        maximumFractionDigits: quoteCurrency === "AED" ? 0 : 2,
      }).format(amount);
    } catch {
      return `${quoteCurrency} ${amount.toLocaleString()}`;
    }
  };
  const baseMoney = (amount: number) => selectedCurrency.formatBaseAed(amount);

  return (
    <>
      <motion.aside
        className="hidden lg:block sticky top-28 rounded-2xl border border-line bg-surface p-5 shadow-sm"
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs text-secondary">From</div>
            <div className="text-2xl font-semibold text-primary">
              {displayMoneyFromAed(priceFrom)}
            </div>
          </div>
          <div className="text-xs text-secondary">per night baseline</div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TrustChip icon={<ShieldCheck className="h-4 w-4" />} text="Verified calendar" />
          <TrustChip icon={<Timer className="h-4 w-4" />} text="Hold prevents double booking" />
          <TrustChip icon={<Sparkles className="h-4 w-4" />} text="Operator-grade standards" />
        </div>

        <div className="mt-5 grid gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
              <CalendarDays className="h-4 w-4 text-muted" />
              Dates
            </div>
            <DateRangePicker value={dates} onChange={setDates} minDate={new Date()} />
          </div>

          <GuestsBlock guests={guests} onChange={setGuests} />

          <button
            type="button"
            disabled={!canQuote || ui.kind === "loadingQuote"}
            onClick={runQuote}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-accent-text transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ui.kind === "loadingQuote" ? "Checking price…" : "Get exact price"}
          </button>

          {breakdown ? (
            <div className="rounded-2xl border border-line bg-warm-alt p-4 text-sm">
              <div className="text-xs font-semibold text-primary">Price breakdown</div>
              <div className="mt-3 space-y-2">
                <LabelRow label="Nights" value={`${breakdown.nights}`} />
                <LabelRow label="Base" value={displayQuoteMoney(breakdown.baseAmount)} />
                <LabelRow
                  label="Cleaning"
                  value={displayQuoteMoney(breakdown.cleaningFee)}
                />
                <LabelRow
                  label="Service fee"
                  value={displayQuoteMoney(breakdown.serviceFee)}
                />
                <LabelRow label="Taxes" value={displayQuoteMoney(breakdown.taxes)} />
              </div>

              <div className="mt-3 border-t border-line pt-3">
                <LabelRow
                  label="Total"
                  value={displayQuoteMoney(breakdown.total)}
                  emphasize
                />
              </div>

              {quoteCurrency !== "AED" && typeof breakdown.totalAed === "number" ? (
                <div className="mt-2 text-right text-xs text-muted">
                  Base: {baseMoney(breakdown.totalAed)}
                </div>
              ) : null}

              <button
                type="button"
                onClick={runReserve}
                disabled={ui.kind === "reserving"}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-surface px-4 py-3 text-sm font-semibold text-primary shadow-sm ring-1 ring-line transition hover:bg-warm-alt disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ui.kind === "reserving" ? "Reserving…" : "Reserve (hold inventory)"}
              </button>

              <div className="mt-3 text-xs text-secondary">
                Reserving creates a time-limited hold. You won’t be charged yet.
              </div>
            </div>
          ) : null}

          {ui.kind === "reserved" && hold ? (
            <div className="rounded-2xl border border-success/30 bg-success/12 p-4 text-sm text-success">
              <div className="font-semibold">Hold created</div>
              <div className="mt-1 text-xs text-success/80">
                Expires: <span className="font-semibold">{formatIsoShort(hold.expiresAt)}</span>
              </div>

              <Link
                href={checkoutHref}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-success px-4 py-3 text-sm font-semibold text-inverted transition hover:bg-success"
              >
                Continue to checkout
              </Link>

              <div className="mt-3 text-xs text-success/80">
                Next: convert hold → booking in checkout.
              </div>
            </div>
          ) : null}

          {ui.kind === "error" ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/12 p-4 text-sm text-danger">
              {ui.message}
            </div>
          ) : null}
        </div>
      </motion.aside>

      {/* MOBILE BAR */}
      <div className="lg:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-[11px] text-secondary">From</div>
              <div className="truncate text-sm font-semibold text-primary">
                {displayMoneyFromAed(priceFrom)}
                <span className="ml-1 text-xs font-medium text-secondary">/ night</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-accent-text"
            >
              {breakdown ? "View price" : "Check availability"}
              <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close quote panel"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-dark-1/40"
            />

            <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-primary">Your stay</div>
                  <div className="mt-1 text-xs text-secondary">
                    Select dates and guests to get an exact price.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-primary"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid gap-4 pb-3">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                    <CalendarDays className="h-4 w-4 text-muted" />
                    Dates
                  </div>
                  <DateRangePicker value={dates} onChange={setDates} minDate={new Date()} />
                </div>

                <GuestsBlock guests={guests} onChange={setGuests} />

                <button
                  type="button"
                  disabled={!canQuote || ui.kind === "loadingQuote"}
                  onClick={runQuote}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-accent-text transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ui.kind === "loadingQuote" ? "Checking price…" : "Get exact price"}
                </button>

                {ui.kind === "reserved" && hold ? (
                  <div className="rounded-2xl border border-success/30 bg-success/12 p-4 text-sm text-success">
                    <div className="font-semibold">Hold created</div>
                    <div className="mt-1 text-xs text-success/80">
                      Expires: <span className="font-semibold">{formatIsoShort(hold.expiresAt)}</span>
                    </div>

                    <Link
                      href={checkoutHref}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-success px-4 py-3 text-sm font-semibold text-inverted transition hover:bg-success"
                    >
                      Continue to checkout
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="h-16" />
      </div>
    </>
  );
}

function GuestsBlock(props: { guests: number; onChange: (n: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
        <Users className="h-4 w-4 text-muted" />
        Guests
      </div>

      <div className="grid grid-cols-4 gap-2">
        {GUEST_PRESETS.map((n) => {
          const active = props.guests === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => props.onChange(n)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                active
                  ? "border-brand bg-brand text-accent-text"
                  : "border-line bg-surface text-primary hover:bg-warm-alt"
              }`}
            >
              {n}
            </button>
          );
        })}

        <div className="col-span-4 mt-2">
          <input
            type="number"
            min={1}
            max={16}
            value={props.guests}
            onChange={(e) => props.onChange(Number(e.target.value))}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-line-strong"
            aria-label="Guests"
          />
          <div className="mt-1 text-[11px] text-secondary">Max 16 guests.</div>
        </div>
      </div>
    </div>
  );
}
