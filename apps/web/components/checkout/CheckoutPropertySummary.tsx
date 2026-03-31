"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, MapPin, Pencil, Star, Users } from "lucide-react";
import { getPropertyBySlug } from "@/lib/api/properties";
import { quoteProperty, type Quote } from "@/lib/booking/bookingFlow";
import type { PropertyDetail } from "@/lib/types/property";
import { useCurrency } from "@/lib/currency/CurrencyProvider";

type CheckoutPropertySummaryProps = {
  slug: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  onEdit: () => void;
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d: string) {
  return ISO_RE.test(d);
}

function fmtShortDate(d: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(`${d}T00:00:00`));
  } catch {
    return d;
  }
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

function SkeletonLine({ w = "full" }: { w?: string }) {
  return <div className={`h-4 w-${w} animate-pulse rounded bg-line/60`} />;
}

export function CheckoutPropertySummary({
  slug,
  propertyId,
  checkIn,
  checkOut,
  guests,
  onEdit,
}: CheckoutPropertySummaryProps) {
  const { selectedCurrency } = useCurrency();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [propLoading, setPropLoading] = useState(true);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ── Fetch property details ──────────────────────────────────────────────────
  useEffect(() => {
    if (!slug && !propertyId) return;
    let cancelled = false;
    setPropLoading(true);

    const fetchProperty = async () => {
      try {
        const res = slug
          ? await getPropertyBySlug(slug)
          : null;

        if (cancelled) return;

        if (res?.ok && res.data) {
          setProperty(res.data as PropertyDetail);
        }
      } catch {
        // silently fail — summary still shows dates + price
      } finally {
        if (!cancelled) setPropLoading(false);
      }
    };

    void fetchProperty();
    return () => { cancelled = true; };
  }, [slug, propertyId]);

  // ── Fetch quote whenever dates / guests / currency change ──────────────────
  useEffect(() => {
    if (!propertyId || !isValidDate(checkIn) || !isValidDate(checkOut)) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    setQuoteError(null);

    const fetchQuote = async () => {
      try {
        const q = await quoteProperty(propertyId, {
          checkIn,
          checkOut,
          guests,
          currency: selectedCurrency,
        });
        if (!cancelled) setQuote(q);
      } catch (e) {
        if (!cancelled) {
          setQuoteError(e instanceof Error ? e.message : "Failed to load pricing");
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    void fetchQuote();
    return () => { cancelled = true; };
  }, [propertyId, checkIn, checkOut, guests, selectedCurrency]);

  // ── Computed values ─────────────────────────────────────────────────────────
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

  const heroImage = property?.media?.find((m) => m.sortOrder === 0) ?? property?.media?.[0];
  const heroSrc = heroImage?.url ?? null;
  const displayCurrency = quote?.currency ?? property?.currency ?? "AED";

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl shadow-black/5">
      {/* Property hero image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-warm-alt">
        {propLoading ? (
          <div className="h-full w-full animate-pulse bg-line/40" />
        ) : heroSrc ? (
          <Image
            src={heroSrc}
            alt={property?.title ?? "Property"}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 380px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-warm-alt">
            <span className="text-3xl text-muted">🏠</span>
          </div>
        )}
      </div>

      <div className="p-5">
        {/* Property title & location */}
        {propLoading ? (
          <div className="space-y-2">
            <SkeletonLine w="3/4" />
            <SkeletonLine w="1/2" />
          </div>
        ) : property ? (
          <div>
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-primary">
              {property.title}
            </h3>
            {(property.city || property.area) && (
              <div className="mt-1.5 flex items-center gap-1 text-xs text-secondary">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {[property.area, property.city].filter(Boolean).join(", ")}
              </div>
            )}

            {/* Rating + beds */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-secondary">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                <span className="font-medium text-primary">New listing</span>
              </span>
              {property.bedrooms && (
                <span>{property.bedrooms} bed{property.bedrooms !== 1 ? "s" : ""}</span>
              )}
              {property.maxGuests && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Up to {property.maxGuests} guests
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* Divider */}
        <div className="my-4 border-t border-line" />

        {/* Dates + guests with edit button */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 shrink-0 text-secondary" />
              <span className="text-primary">
                {isValidDate(checkIn) && isValidDate(checkOut) ? (
                  <>
                    {fmtShortDate(checkIn)}{" "}
                    <span className="text-muted">→</span>{" "}
                    {fmtShortDate(checkOut)}
                    {nights !== null && (
                      <span className="ml-1.5 text-xs text-muted">
                        ({nights} night{nights !== 1 ? "s" : ""})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted">No dates selected</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 shrink-0 text-secondary" />
              <span className="text-primary">
                {guests} guest{guests !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-warm-alt px-3 py-1.5 text-xs font-semibold text-secondary transition hover:border-brand hover:text-brand"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-line" />

        {/* Price breakdown */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-primary">Price breakdown</div>

          {quoteLoading ? (
            <div className="space-y-2">
              <SkeletonLine />
              <SkeletonLine w="4/5" />
              <SkeletonLine w="3/4" />
            </div>
          ) : quoteError ? (
            <p className="text-xs text-danger">{quoteError}</p>
          ) : quote ? (
            <div className="space-y-2 text-sm">
              {/* Nightly */}
              <div className="flex justify-between">
                <span className="text-secondary">
                  {fmtCurrency(quote.breakdown.basePricePerNight, displayCurrency)}{" "}
                  × {quote.breakdown.nights} night{quote.breakdown.nights !== 1 ? "s" : ""}
                </span>
                <span className="font-medium text-primary">
                  {fmtCurrency(quote.breakdown.nightlySubtotal, displayCurrency)}
                </span>
              </div>

              {/* Cleaning fee */}
              {quote.breakdown.cleaningFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">Cleaning fee</span>
                  <span className="font-medium text-primary">
                    {fmtCurrency(quote.breakdown.cleaningFee, displayCurrency)}
                  </span>
                </div>
              )}

              {/* Service fee */}
              {quote.breakdown.serviceFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">Service fee</span>
                  <span className="font-medium text-primary">
                    {fmtCurrency(quote.breakdown.serviceFee, displayCurrency)}
                  </span>
                </div>
              )}

              {/* Taxes */}
              {quote.breakdown.taxes > 0 && (
                <div className="flex justify-between">
                  <span className="text-secondary">Taxes</span>
                  <span className="font-medium text-primary">
                    {fmtCurrency(quote.breakdown.taxes, displayCurrency)}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-line pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-primary">Total</span>
                  <span className="text-lg font-bold text-primary">
                    {fmtCurrency(quote.totalAmount, displayCurrency)}
                  </span>
                </div>
                {displayCurrency !== "AED" && (
                  <div className="mt-1 text-right text-xs text-muted">
                    ≈ AED {quote.totalAmountAed.toLocaleString()}
                  </div>
                )}
              </div>

              {/* canBook warning */}
              {!quote.canBook && quote.reasons.length > 0 && (
                <div className="rounded-xl border border-danger/30 bg-danger/8 px-3 py-2.5 text-xs text-danger">
                  {quote.reasons[0]}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">
              {!isValidDate(checkIn) || !isValidDate(checkOut)
                ? "Select dates to see pricing."
                : "Loading price…"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
