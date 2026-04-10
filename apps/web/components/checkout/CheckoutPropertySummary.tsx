"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CalendarDays, ChevronDown, MapPin, Pencil, Users } from "lucide-react";
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
  const { currency: selectedCurrency } = useCurrency();

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [propLoading, setPropLoading] = useState(true);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [taxesOpen, setTaxesOpen] = useState(false);

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
    <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-black/[0.07] shadow-[0_12px_40px_rgba(11,15,25,0.10)]">
      {/* Property hero image */}
      <div className="relative aspect-video w-full overflow-hidden bg-warm-alt">
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

            {/* Property meta — beds & guests only (no rating field in API) */}
            {(property.bedrooms || property.maxGuests) && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-secondary">
                {property.bedrooms && (
                  <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}</span>
                )}
                {property.bathrooms && (
                  <span>{property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}</span>
                )}
                {property.maxGuests && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Up to {property.maxGuests} guests
                  </span>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Divider */}
        <div className="my-4 border-t border-black/6" />

        {/* Dates + guests with edit button */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5">
            {/* Check-in / Check-out row */}
            {isValidDate(checkIn) && isValidDate(checkOut) ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-3 py-2 ring-1 ring-black/6">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Check-in</div>
                  <div className="mt-0.5 text-sm font-semibold text-primary">{fmtShortDate(checkIn)}</div>
                </div>
                <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-3 py-2 ring-1 ring-black/6">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">Check-out</div>
                  <div className="mt-0.5 text-sm font-semibold text-primary">{fmtShortDate(checkOut)}</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarDays className="h-4 w-4 shrink-0" />
                No dates selected
              </div>
            )}

            {/* Nights + Guests row */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-secondary">
              {nights !== null && (
                <span className="font-medium text-primary">{nights} night{nights !== 1 ? "s" : ""}</span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {guests} guest{guests !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            onClick={onEdit}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-3 py-1.5 text-xs font-semibold text-secondary ring-1 ring-black/8 transition hover:text-brand hover:ring-brand/40"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-black/6" />

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
            <p className="text-xs text-secondary">Pricing unavailable — your dates are reserved.</p>
          ) : quote ? (
            <div className="space-y-2 text-sm">
              {/* Nightly subtotal */}
              <div className="flex justify-between">
                <span className="text-secondary">
                  {quote.breakdown.nights} night{quote.breakdown.nights !== 1 ? "s" : ""}{" "}
                  × {fmtCurrency(quote.breakdown.basePricePerNight, displayCurrency)}
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

              {/* Taxes & fees — collapsible */}
              {(quote.breakdown.serviceCharge > 0 || quote.breakdown.municipalityFee > 0 || quote.breakdown.tourismFee > 0 || quote.breakdown.vat > 0 || quote.breakdown.tourismDirham > 0) && (
                <>
                  <button
                    type="button"
                    onClick={() => setTaxesOpen((o) => !o)}
                    className="flex w-full items-center justify-between"
                  >
                    <span className="flex items-center gap-1 text-secondary underline decoration-dotted underline-offset-2">
                      Taxes & fees
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${taxesOpen ? "rotate-180" : ""}`} />
                    </span>
                    <span className="font-medium text-primary">
                      {fmtCurrency(
                        quote.breakdown.serviceCharge + quote.breakdown.municipalityFee + quote.breakdown.tourismFee + quote.breakdown.vat + quote.breakdown.tourismDirham,
                        displayCurrency,
                      )}
                    </span>
                  </button>

                  {taxesOpen && (
                    <div className="space-y-2 rounded-xl bg-warm-alt px-3 py-2.5">
                      {quote.breakdown.serviceCharge > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary" title="Tourism authority service charge — 10% of base">Service charge (10%)</span>
                          <span className="text-primary">{fmtCurrency(quote.breakdown.serviceCharge, displayCurrency)}</span>
                        </div>
                      )}
                      {quote.breakdown.municipalityFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary" title="Dubai municipality fee — 7% of base">Municipality fee (7%)</span>
                          <span className="text-primary">{fmtCurrency(quote.breakdown.municipalityFee, displayCurrency)}</span>
                        </div>
                      )}
                      {quote.breakdown.tourismFee > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary" title="Dubai tourism fee — 6% of base">Tourism fee (6%)</span>
                          <span className="text-primary">{fmtCurrency(quote.breakdown.tourismFee, displayCurrency)}</span>
                        </div>
                      )}
                      {quote.breakdown.vat > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary" title="Value Added Tax — 5% of subtotal including fees">VAT (5%)</span>
                          <span className="text-primary">{fmtCurrency(quote.breakdown.vat, displayCurrency)}</span>
                        </div>
                      )}
                      {quote.breakdown.tourismDirham > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-secondary" title="Tourism Dirham: fixed per room per night, capped at 30 nights">Tourism Dirham</span>
                          <span className="text-primary">
                            {displayCurrency === "AED"
                              ? fmtCurrency(quote.breakdown.tourismDirham, "AED")
                              : `AED ${quote.breakdown.tourismDirhamAed.toLocaleString()}`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Total */}
              <div className="border-t border-black/6 pt-3">
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
              {/* NOTE: canBook=false is expected here — the user's own active hold
                  temporarily marks these dates as unavailable. Do not show a warning. */}
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
