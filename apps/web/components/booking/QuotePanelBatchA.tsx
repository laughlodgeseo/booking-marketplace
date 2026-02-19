"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { quoteProperty, reserveHold, type Quote } from "@/lib/booking/bookingFlow";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import DateRangePicker, { type DateRangeValue } from "@/components/booking/DateRangePicker";
import { isValidIsoRange } from "@/lib/date-range";

function formatDateSummary(checkIn: string, checkOut: string) {
  if (checkIn && checkOut) return `${checkIn} - ${checkOut}`;
  if (checkIn) return `${checkIn} - Add checkout`;
  return "Select dates";
}

export default function QuotePanelBatchA(props: {
  propertyId: string;
  slug: string;
  currency: string;
  priceFrom: number;
}) {
  const router = useRouter();

  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guests, setGuests] = useState<number>(2);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState<"idle" | "quoting" | "holding">("idle");
  const [error, setError] = useState<string | null>(null);
  const { currency, formatFromAed, formatBaseAed } = useCurrency();

  const canAct = useMemo(() => {
    return isValidIsoRange(checkIn, checkOut) && guests >= 1;
  }, [checkIn, checkOut, guests]);

  const dateRangeValue = useMemo<DateRangeValue>(
    () => ({
      from: checkIn || null,
      to: checkOut || null,
    }),
    [checkIn, checkOut],
  );

  const priceText = formatFromAed(props.priceFrom, { maximumFractionDigits: 0 });
  const dateSummary = formatDateSummary(checkIn, checkOut);

  async function onGetQuote() {
    if (!canAct) return;
    setError(null);
    setBusy("quoting");
    try {
      const q = await quoteProperty(props.propertyId, { checkIn, checkOut, guests });
      setQuote(q);
      setMobileOpen(true);
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "Failed to quote");
      setMobileOpen(true);
    } finally {
      setBusy("idle");
    }
  }

  async function onReserve() {
    if (!canAct) return;
    setError(null);
    setBusy("holding");
    setMobileOpen(true);
    try {
      const res = await reserveHold(props.propertyId, { checkIn, checkOut, guests });

      const qp = new URLSearchParams();
      qp.set("holdId", res.holdId);
      qp.set("slug", props.slug);
      qp.set("guests", String(guests));
      qp.set("checkIn", checkIn);
      qp.set("checkOut", checkOut);

      router.push(`/checkout/${encodeURIComponent(props.propertyId)}?${qp.toString()}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reserve");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <>
      <div className="hidden lg:block">
        <div className="space-y-4">
          <div className="premium-card premium-card-tinted rounded-2xl border border-white/70 p-5 shadow-[0_18px_44px_rgba(11,15,25,0.1)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(11,15,25,0.14)] sm:p-6">
            <div className="text-sm font-semibold text-primary">Your dates</div>

            <div className="mt-3 grid gap-2.5">
              <label className="grid gap-0.5">
                <span className="text-xs font-semibold text-secondary">Dates</span>
                <DateRangePicker
                  value={dateRangeValue}
                  onChange={(next) => {
                    setCheckIn(next.from ?? "");
                    setCheckOut(next.to ?? "");
                  }}
                  minDate={new Date()}
                  numberOfMonths={1}
                  compact
                />
              </label>

              <label className="grid gap-0.5">
                <span className="text-xs font-semibold text-secondary">Guests</span>
                <input
                  type="number"
                  min={1}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="premium-input h-11 rounded-xl px-3 text-sm text-primary"
                />
              </label>
            </div>

            <div className="mt-3 rounded-xl bg-accent-soft/45 px-4 py-2.5 text-xs text-secondary ring-1 ring-white/72">
              From <span className="font-semibold">{priceText}</span> / night
              {currency !== "AED" ? (
                <div className="mt-1 text-[11px] text-muted">Base: {formatBaseAed(props.priceFrom)}</div>
              ) : null}
            </div>

            {error ? (
              <div className="mt-3 rounded-xl bg-danger/12 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
                <span className="font-semibold">Error:</span> {error}
              </div>
            ) : null}

            {quote ? (
              <div className="mt-3 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.8)] px-4 py-3 ring-1 ring-white/72">
                <div className="text-xs font-semibold text-muted">Quote</div>
                <div className="mt-1 text-sm font-semibold text-primary">
                  {formatFromAed(quote.totalAmount, { maximumFractionDigits: 0 })}
                </div>
                {currency !== "AED" ? (
                  <div className="mt-1 text-[11px] text-muted">Base: {formatBaseAed(quote.totalAmount)}</div>
                ) : null}
                <div className="mt-1 text-xs text-secondary">
                  {quote.nights} nights • {quote.checkIn} → {quote.checkOut}
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled={!canAct || busy !== "idle"}
                onClick={() => void onGetQuote()}
                className="h-11 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.9)] text-sm font-semibold text-primary ring-1 ring-white/72 transition hover:bg-[rgb(var(--color-bg-rgb)/1)] disabled:opacity-60"
              >
                {busy === "quoting" ? "Getting quote..." : "Get quote"}
              </button>

              <button
                type="button"
                disabled={!canAct || busy !== "idle"}
                onClick={() => void onReserve()}
                className="h-11 rounded-xl bg-brand text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
              >
                {busy === "holding" ? "Creating hold..." : "Reserve (hold inventory)"}
              </button>

              <div className="text-xs text-secondary">
                Hold prevents double-booking. Booking becomes <span className="font-semibold">CONFIRMED</span> only after
                verified payment events.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] text-secondary">From</p>
              <p className="truncate text-sm font-semibold text-primary">{priceText} / night</p>
              <p className="truncate text-xs text-secondary">{dateSummary}</p>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
            >
              {quote ? "View quote" : "Check availability"}
              <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Close booking panel"
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-dark-1/45"
            />

            <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-primary">Check availability</p>
                  <p className="mt-1 text-xs text-secondary">Select dates and guests to get an exact total.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-primary"
                  aria-label="Close booking panel"
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
              </div>

              <div className="space-y-3">
                <DateRangePicker
                  value={dateRangeValue}
                  onChange={(next) => {
                    setCheckIn(next.from ?? "");
                    setCheckOut(next.to ?? "");
                  }}
                  minDate={new Date()}
                  numberOfMonths={1}
                  compact
                />

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-secondary">Guests</span>
                  <input
                    type="number"
                    min={1}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="premium-input h-12 w-full rounded-xl px-3 text-[16px] text-primary"
                  />
                </label>

                {error ? (
                  <div className="rounded-xl bg-danger/12 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
                    <span className="font-semibold">Error:</span> {error}
                  </div>
                ) : null}

                {quote ? (
                  <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.8)] px-4 py-3 ring-1 ring-white/72">
                    <div className="text-xs font-semibold text-muted">Quote</div>
                    <div className="mt-1 text-sm font-semibold text-primary">
                      {formatFromAed(quote.totalAmount, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {quote.nights} nights • {quote.checkIn} → {quote.checkOut}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2">
                  <button
                    type="button"
                    disabled={!canAct || busy !== "idle"}
                    onClick={() => void onGetQuote()}
                    className="h-11 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.9)] text-sm font-semibold text-primary ring-1 ring-white/72 transition hover:bg-[rgb(var(--color-bg-rgb)/1)] disabled:opacity-60"
                  >
                    {busy === "quoting" ? "Getting quote..." : "Get quote"}
                  </button>

                  <button
                    type="button"
                    disabled={!canAct || busy !== "idle"}
                    onClick={() => void onReserve()}
                    className="h-11 rounded-xl bg-brand text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
                  >
                    {busy === "holding" ? "Creating hold..." : "Reserve (hold inventory)"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="h-20" />
      </div>
    </>
  );
}
