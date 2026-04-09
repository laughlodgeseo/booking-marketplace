"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startOfDay } from "date-fns";
import { CalendarDays, Loader2, Minus, Plus, X } from "lucide-react";
import { quoteProperty, type Quote } from "@/lib/booking/bookingFlow";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import DateRangePicker, {
  type DateRangeValue,
  type DateSelectionPhase,
} from "@/components/booking/DateRangePicker";

type CheckoutEditModalProps = {
  propertyId: string;
  slug?: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuests: number;
  onClose: () => void;
  onConfirm: (data: { checkIn: string; checkOut: string; guests: number }) => Promise<void>;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
function isValidDate(d: string) {
  return ISO_RE.test(d);
}

function fmtCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency.toUpperCase() === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}


export function CheckoutEditModal({
  propertyId,
  slug: _slug,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  onClose,
  onConfirm,
}: CheckoutEditModalProps) {
  const { currency: selectedCurrency } = useCurrency();

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);

  const today = startOfDay(new Date());
  const [selectionPhase, setSelectionPhase] = useState<DateSelectionPhase>(
    initialCheckIn ? "checkout" : "checkin"
  );
  const dateRangeValue: DateRangeValue = { from: checkIn || null, to: checkOut || null };

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live quote as the user changes inputs
  useEffect(() => {
    if (!isValidDate(checkIn) || !isValidDate(checkOut)) {
      setQuote(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      let cancelled = false;
      setQuoteLoading(true);

      quoteProperty(propertyId, {
        checkIn,
        checkOut,
        guests,
        currency: selectedCurrency,
      })
        .then((q) => { if (!cancelled) { setQuote(q); setQuoteLoading(false); } })
        .catch(() => { if (!cancelled) { setQuote(null); setQuoteLoading(false); } });

      return () => { cancelled = true; };
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [propertyId, checkIn, checkOut, guests, selectedCurrency]);

  const handleConfirm = useCallback(async () => {
    if (!isValidDate(checkIn) || !isValidDate(checkOut)) return;
    setConfirmBusy(true);
    try {
      await onConfirm({ checkIn, checkOut, guests });
    } finally {
      setConfirmBusy(false);
    }
  }, [checkIn, checkOut, guests, onConfirm]);

  const nights =
    isValidDate(checkIn) && isValidDate(checkOut)
      ? Math.max(
          1,
          Math.round(
            (new Date(`${checkOut}T00:00:00Z`).getTime() -
              new Date(`${checkIn}T00:00:00Z`).getTime()) /
              86_400_000,
          ),
        )
      : null;

  // Allow confirming regardless of canBook — the user is editing their OWN hold,
  // so the backend seeing those dates as "held" is expected and not a real block.
  const canConfirm = isValidDate(checkIn) && isValidDate(checkOut) && checkOut > checkIn;
  const displayCurrency = quote?.currency ?? selectedCurrency ?? "AED";

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[0_-24px_64px_rgba(11,15,25,0.28)] sm:max-h-[88vh] sm:rounded-3xl">
        {/* Header — fixed */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.07] px-6 py-4">
          <h2 className="text-base font-semibold text-primary">Edit your stay</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--color-bg-rgb)/0.7)] text-secondary ring-1 ring-black/8 transition hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Date range picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Dates
              {nights !== null && (
                <span className="ml-1 normal-case font-normal text-secondary">
                  · {nights} night{nights !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Selected dates display */}
            <div className="grid grid-cols-2 overflow-hidden rounded-2xl bg-surface ring-1 ring-black/10">
              <button
                type="button"
                onClick={() => {
                  // Switching to check-in: clear both dates and start fresh
                  setSelectionPhase("checkin");
                  setCheckIn("");
                  setCheckOut("");
                }}
                className={[
                  "flex flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors",
                  selectionPhase === "checkin" ? "bg-brand/8" : "hover:bg-warm-alt",
                ].join(" ")}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Check-in</span>
                <span className={`text-sm font-semibold ${checkIn ? "text-primary" : "text-secondary/60"}`}>
                  {checkIn ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${checkIn}T00:00:00`)) : "Add date"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelectionPhase("checkout")}
                className={[
                  "flex flex-col justify-center gap-0.5 border-l border-line/40 px-4 py-3 text-left transition-colors",
                  selectionPhase === "checkout" ? "bg-brand/8" : "hover:bg-warm-alt",
                ].join(" ")}
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Check-out</span>
                <span className={`text-sm font-semibold ${checkOut ? "text-primary" : "text-secondary/60"}`}>
                  {checkOut ? new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(`${checkOut}T00:00:00`)) : "Add date"}
                </span>
              </button>
            </div>

            {/* Calendar */}
            <DateRangePicker
              value={dateRangeValue}
              onChange={(next) => {
                setCheckIn(next.from ?? "");
                setCheckOut(next.to ?? "");
                if (!next.from) setSelectionPhase("checkin");
                else if (!next.to) setSelectionPhase("checkout");
              }}
              minDate={today}
              disabledDates={[]}
              mode="sequential"
              selectionPhase={selectionPhase}
              onSelectionPhaseChange={setSelectionPhase}
              onComplete={() => setSelectionPhase("checkout")}
              numberOfMonths={1}
              maxMonthsAhead={6}
              allowClear={false}
              compact
            />
          </div>

          {/* Guests counter */}
          <div className="flex items-center justify-between rounded-2xl bg-warm-alt px-5 py-3.5 ring-1 ring-black/10">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Guests</div>
              <div className="mt-0.5 text-sm font-semibold text-primary">
                {guests} guest{guests !== 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-black/8 transition hover:ring-black/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-5 text-center text-sm font-semibold text-primary">{guests}</span>
              <button
                onClick={() => setGuests((g) => Math.min(20, g + 1))}
                disabled={guests >= 20}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-black/8 transition hover:ring-black/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Live price preview */}
          {(quoteLoading || quote) && (
            <div className="rounded-xl bg-warm-alt px-4 py-3 ring-1 ring-black/10">
              {quoteLoading ? (
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating price…
                </div>
              ) : quote ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-secondary">
                    <span>
                      {fmtCurrency(quote.breakdown.basePricePerNight, displayCurrency)}{" "}
                      × {quote.breakdown.nights} night{quote.breakdown.nights !== 1 ? "s" : ""}
                    </span>
                    <span>{fmtCurrency(quote.breakdown.nightlySubtotal, displayCurrency)}</span>
                  </div>
                  {quote.breakdown.cleaningFee > 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>Cleaning fee</span>
                      <span>{fmtCurrency(quote.breakdown.cleaningFee, displayCurrency)}</span>
                    </div>
                  )}
                  {(quote.breakdown.serviceFee + quote.breakdown.taxes) > 0 && (
                    <div className="flex justify-between text-secondary">
                      <span>Fees &amp; taxes</span>
                      <span>
                        {fmtCurrency(
                          quote.breakdown.serviceFee + quote.breakdown.taxes,
                          displayCurrency,
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-black/6 pt-2 font-semibold text-primary">
                    <span>Total</span>
                    <span>{fmtCurrency(quote.totalAmount, displayCurrency)}</span>
                  </div>
                  {/* canBook may be false because the user's own hold occupies these dates — suppress warning */}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Actions — fixed at bottom */}
        <div className="flex shrink-0 gap-3 border-t border-black/[0.07] px-6 pb-6 pt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-warm-alt px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-black/10 transition hover:bg-line/30"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || confirmBusy}
            className="site-cta-primary flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-accent-text shadow-[0_4px_14px_rgba(79,70,229,0.28)] transition disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {confirmBusy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </>
            ) : (
              "Update stay"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
