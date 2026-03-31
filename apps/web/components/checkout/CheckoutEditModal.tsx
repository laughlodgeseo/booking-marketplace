"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Loader2, Minus, Plus, X } from "lucide-react";
import { quoteProperty, type Quote } from "@/lib/booking/bookingFlow";
import { useCurrency } from "@/lib/currency/CurrencyProvider";

type CheckoutEditModalProps = {
  propertyId: string;
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

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CheckoutEditModal({
  propertyId,
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

  const today = getTodayStr();
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
      <div className="w-full max-w-md rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-semibold text-primary">Edit your stay</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-warm-alt text-secondary transition hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Date range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Dates
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary">Check-in</label>
                <input
                  type="date"
                  value={checkIn}
                  min={today}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    // Auto-clear checkout if it's before new check-in
                    if (checkOut && e.target.value >= checkOut) {
                      setCheckOut("");
                    }
                  }}
                  className="w-full rounded-xl border border-line bg-warm-alt px-3 py-2.5 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-secondary">Check-out</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-xl border border-line bg-warm-alt px-3 py-2.5 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {nights !== null && (
              <p className="text-xs text-muted">
                {nights} night{nights !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Guests counter */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Guests</div>
            <div className="flex items-center justify-between rounded-xl border border-line bg-warm-alt px-4 py-2.5">
              <span className="text-sm font-medium text-primary">
                {guests} guest{guests !== 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGuests((g) => Math.max(1, g - 1))}
                  disabled={guests <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-secondary transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-primary">{guests}</span>
                <button
                  onClick={() => setGuests((g) => Math.min(20, g + 1))}
                  disabled={guests >= 20}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-secondary transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Live price preview */}
          {(quoteLoading || quote) && (
            <div className="rounded-xl border border-line bg-warm-alt px-4 py-3">
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
                  <div className="flex justify-between border-t border-line pt-2 font-semibold text-primary">
                    <span>Total</span>
                    <span>{fmtCurrency(quote.totalAmount, displayCurrency)}</span>
                  </div>
                  {!quote.canBook && quote.reasons.length > 0 && (
                    <p className="pt-1 text-xs text-danger">{quote.reasons[0]}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-line px-6 pb-6 pt-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-line bg-warm-alt px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-surface"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleConfirm()}
            disabled={!canConfirm || confirmBusy}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-accent-text shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
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
