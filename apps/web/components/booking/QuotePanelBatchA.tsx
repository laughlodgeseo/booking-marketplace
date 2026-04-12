"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addDays,
  format,
  isSameMonth,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";
import { CalendarDays, ChevronDown, Loader2, Minus, Plus, Users } from "lucide-react";
import { useLocale } from "next-intl";
import { quoteProperty, reserveHold, type Quote } from "@/lib/booking/bookingFlow";
import { getPropertyCalendarBySlug } from "@/lib/api/properties";
import { useCurrency } from "@/lib/currency/CurrencyProvider";
import DateRangePicker, {
  type DateRangeValue,
  type DateSelectionPhase,
} from "@/components/booking/DateRangePicker";
import { isValidIsoRange } from "@/lib/date-range";
import CurrencySwitcher from "@/components/currency/CurrencySwitcher";
import { normalizeLocale } from "@/lib/i18n/config";
import { useAuth } from "@/lib/auth/auth-context";

type CalendarDayStatus = "AVAILABLE" | "BOOKED" | "HOLD" | "BLOCKED";

type CalendarDay = {
  date: string;
  status: CalendarDayStatus;
};

const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

const COPY = {
  en: {
    checkIn: "Check-in",
    checkOut: "Checkout",
    addDate: "Add date",
    addCheckout: "Add checkout",
    guests: "Guests",
    fromPerNight: "From",
    perNight: "/ night",
    livePricing: "Live pricing",
    livePricingHint: "Price updates live as you select dates and guests.",
    loadingPrice: "Updating price...",
    reserve: "Reserve",
    reserveAndContinue: "Reserve",
    reserving: "Reserving…",
    holdNote: "You won't be charged yet.",
    checkAvailability: "Check availability",
    viewDetails: "View details",
    closeBookingPanel: "Close booking panel",
    exactTotal: "Pick dates to see live total.",
    availabilityLoading: "Loading backend availability...",
    availabilityError: "Failed to load availability calendar.",
    availabilityUntil: "Availability loaded through",
    quoteError: "Failed to load live price",
    reserveError: "Failed to reserve",
    loginRequired: "Sign in required. Redirecting to login...",
    unavailable: "Selected dates are unavailable.",
    calendar: "Calendar",
    nights: "nights",
    base: "Base",
    cleaning: "Cleaning",
    serviceFee: "Service fee",
    taxes: "Taxes",
    total: "Total",
    signInToReserve: "Reserve",
    confirmAndPay: "Confirm & pay",
  },
  ar: {
    checkIn: "تسجيل الوصول",
    checkOut: "تسجيل المغادرة",
    addDate: "أضف تاريخاً",
    addCheckout: "أضف تاريخ المغادرة",
    guests: "الضيوف",
    fromPerNight: "ابتداءً من",
    perNight: "/ ليلة",
    livePricing: "سعر مباشر",
    livePricingHint: "يتم تحديث السعر مباشرة عند اختيار التواريخ وعدد الضيوف.",
    loadingPrice: "جارٍ تحديث السعر...",
    reserve: "احجز",
    reserveAndContinue: "احجز",
    reserving: "جارٍ الحجز…",
    holdNote: "لن يتم تحصيل أي مبلغ الآن.",
    checkAvailability: "تحقق من التوافر",
    viewDetails: "عرض التفاصيل",
    closeBookingPanel: "إغلاق لوحة الحجز",
    exactTotal: "اختر التواريخ لرؤية الإجمالي المباشر.",
    availabilityLoading: "جارٍ تحميل التوافر من الخادم...",
    availabilityError: "تعذر تحميل تقويم التوافر.",
    availabilityUntil: "التوافر محمّل حتى",
    quoteError: "تعذر تحميل السعر المباشر",
    reserveError: "تعذر إنشاء الحجز المؤقت",
    loginRequired: "يتطلب تسجيل الدخول. سيتم تحويلك الآن...",
    unavailable: "التواريخ المختارة غير متاحة.",
    calendar: "التقويم",
    nights: "ليالٍ",
    base: "الأساس",
    cleaning: "التنظيف",
    serviceFee: "رسوم الخدمة",
    taxes: "الضرائب",
    total: "الإجمالي",
    signInToReserve: "احجز",
    confirmAndPay: "تأكيد والدفع",
  },
} as const;

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function clampGuests(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(16, Math.trunc(value)));
}

function isValidIsoDay(value: string): boolean {
  if (!ISO_DAY_RE.test(value)) return false;
  const parsed = parseISO(value);
  return isValid(parsed);
}

function toIsoDay(value: Date): string {
  return format(value, "yyyy-MM-dd");
}

function formatIsoForUi(iso: string, locale: "en" | "ar"): string {
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return iso;
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return fmt.format(parsed);
}

function isUnauthorizedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lowered = message.toLowerCase();
  return lowered.includes("unauthorized") || lowered.includes("401");
}

export default function QuotePanelBatchA(props: {
  propertyId: string;
  slug: string;
  currency: string;
  priceFrom: number;
  priceFromAed?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status: authStatus } = useAuth();

  const locale = normalizeLocale(useLocale());
  const copy = COPY[locale];
  const today = useMemo(() => startOfDay(new Date()), []);

  const { currency: selectedCurrency, formatFromAed, formatBaseAed } = useCurrency();

  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guests, setGuests] = useState<number>(2);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCalendarOpen, setDesktopCalendarOpen] = useState(false);
  const [mobileCalendarOpen, setMobileCalendarOpen] = useState(true);
  const [selectionPhase, setSelectionPhase] = useState<DateSelectionPhase>("checkin");

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [reserveBusy, setReserveBusy] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [taxesOpen, setTaxesOpen] = useState(false);

  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarWindow, setCalendarWindow] = useState<{ from: string; to: string } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(today));
  const calendarCacheRef = useRef(
    new Map<
      string,
      { days: CalendarDay[]; from: string; to: string; fetchedAt: number }
    >(),
  );
  const calendarRequestRef = useRef<string | null>(null);

  const initializedRef = useRef(false);
  const [autoReserveRequested, setAutoReserveRequested] = useState(false);
  const autoReserveAttemptedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const checkInQuery = (searchParams.get("checkIn") ?? "").trim();
    const checkOutQuery = (searchParams.get("checkOut") ?? "").trim();
    const guestsQuery = Number(searchParams.get("guests") ?? "");

    const normalizedCheckIn = isValidIsoDay(checkInQuery) ? checkInQuery : "";
    const normalizedCheckOut = isValidIsoDay(checkOutQuery) ? checkOutQuery : "";

    if (normalizedCheckIn && normalizedCheckOut && isValidIsoRange(normalizedCheckIn, normalizedCheckOut)) {
      setCheckIn(normalizedCheckIn);
      setCheckOut(normalizedCheckOut);
      const month = parseISO(normalizedCheckIn);
      if (isValid(month)) setCalendarMonth(startOfMonth(month));
    } else if (normalizedCheckIn) {
      setCheckIn(normalizedCheckIn);
      setCheckOut("");
      const month = parseISO(normalizedCheckIn);
      if (isValid(month)) setCalendarMonth(startOfMonth(month));
    }

    if (Number.isFinite(guestsQuery)) {
      setGuests(clampGuests(guestsQuery));
    }

    const shouldAutoReserve = searchParams.get("autoreserve") === "1";
    setAutoReserveRequested(shouldAutoReserve);
  }, [searchParams]);

  useEffect(() => {
    let alive = true;
    const from = toIsoDay(startOfMonth(calendarMonth));
    const to = toIsoDay(addDays(startOfMonth(calendarMonth), 119));
    const requestKey = `${props.slug}:${from}:${to}`;
    const cacheEntry = calendarCacheRef.current.get(requestKey);
    const now = Date.now();
    const CACHE_TTL_MS = 2 * 60 * 1000;

    if (cacheEntry) {
      setCalendarDays(cacheEntry.days);
      setCalendarWindow({ from: cacheEntry.from, to: cacheEntry.to });
      setCalendarError(null);
      if (now - cacheEntry.fetchedAt < CACHE_TTL_MS) {
        setCalendarLoading(false);
        return;
      }
    }

    if (calendarRequestRef.current === requestKey) {
      return;
    }

    calendarRequestRef.current = requestKey;

    async function loadCalendarWindow() {
      setCalendarLoading(true);
      setCalendarError(null);

      const res = await getPropertyCalendarBySlug(props.slug, { from, to });
      if (!alive) return;

      if (!res.ok) {
        setCalendarError(res.message || copy.availabilityError);
        setCalendarLoading(false);
        calendarRequestRef.current = null;
        return;
      }

      const nextDays = res.data.days ?? [];
      setCalendarDays(nextDays);
      setCalendarWindow({ from: res.data.from, to: res.data.to });
      calendarCacheRef.current.set(requestKey, {
        days: nextDays,
        from: res.data.from,
        to: res.data.to,
        fetchedAt: Date.now(),
      });
      setCalendarLoading(false);
      calendarRequestRef.current = null;
    }

    void loadCalendarWindow();
    return () => {
      alive = false;
      if (calendarRequestRef.current === requestKey) {
        calendarRequestRef.current = null;
      }
    };
  }, [calendarMonth, copy.availabilityError, props.slug]);

  const dateRangeValue = useMemo<DateRangeValue>(
    () => ({ from: checkIn || null, to: checkOut || null }),
    [checkIn, checkOut],
  );

  const canQuote = useMemo(() => isValidIsoRange(checkIn, checkOut) && guests >= 1, [checkIn, checkOut, guests]);

  useEffect(() => {
    if (!canQuote) {
      setQuote(null);
      setQuoteState("idle");
      setQuoteError(null);
      return;
    }

    let alive = true;
    const timer = window.setTimeout(async () => {
      setQuoteState("loading");
      setQuoteError(null);

      try {
        const nextQuote = await quoteProperty(props.propertyId, {
          checkIn,
          checkOut,
          guests,
          currency: selectedCurrency,
        });

        if (!alive) return;
        setQuote(nextQuote);
        setQuoteState("ready");
      } catch (error) {
        if (!alive) return;
        setQuote(null);
        setQuoteState("error");
        setQuoteError(error instanceof Error ? error.message : copy.quoteError);
      }
    }, 320);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [canQuote, checkIn, checkOut, copy.quoteError, guests, props.propertyId, selectedCurrency]);

  const unavailableDates = useMemo(
    () => calendarDays.filter((day) => day.status !== "AVAILABLE").map((day) => day.date),
    [calendarDays],
  );

  const maxSelectableDate = useMemo(() => {
    if (!calendarWindow?.to) return null;
    const parsed = parseISO(calendarWindow.to);
    if (!isValid(parsed)) return null;
    return subDays(startOfDay(parsed), 1);
  }, [calendarWindow?.to]);
  const displayedNightPrice = useMemo(() => {
    if (typeof props.priceFromAed === "number") {
      return formatFromAed(props.priceFromAed, {
        maximumFractionDigits: selectedCurrency === "AED" ? 0 : 2,
      });
    }
    return formatMoney(props.priceFrom, props.currency);
  }, [formatFromAed, props.currency, props.priceFrom, props.priceFromAed, selectedCurrency]);

  const checkInLabel = checkIn ? formatIsoForUi(checkIn, locale) : copy.addDate;
  const checkOutLabel = checkOut ? formatIsoForUi(checkOut, locale) : copy.addCheckout;

  const dateSummary =
    checkIn && checkOut
      ? `${checkInLabel} - ${checkOutLabel}`
      : checkIn
        ? `${checkInLabel} - ${copy.addCheckout}`
        : `${copy.addDate} - ${copy.addCheckout}`;

  const pricingTitle = quoteState === "loading" ? copy.loadingPrice : copy.livePricing;

  const reserveCtaLabel =
    reserveBusy || authStatus === "loading"
      ? copy.reserving
      : copy.reserve;

  // Allow unauthenticated users to proceed — checkout page handles sign-in inline
  const canReserve =
    Boolean(canQuote) &&
    Boolean(quote) &&
    quoteState === "ready" &&
    Boolean(quote?.canBook) &&
    !reserveBusy &&
    authStatus !== "loading";

  const updateDates = useCallback(
    (next: DateRangeValue) => {
      const nextCheckIn = next.from ?? "";
      const nextCheckOut = next.to ?? "";
      setCheckIn(nextCheckIn);
      setCheckOut(nextCheckOut);

      if (!nextCheckIn) {
        setSelectionPhase("checkin");
        return;
      }
      if (!nextCheckOut) {
        setSelectionPhase("checkout");
      }
    },
    [setSelectionPhase],
  );

  const openCalendar = useCallback(
    (phase: DateSelectionPhase) => {
      if (phase === "checkout" && !checkIn) {
        setSelectionPhase("checkin");
      } else {
        setSelectionPhase(phase);
      }
      setDesktopCalendarOpen(true);
      setMobileCalendarOpen(true);
    },
    [checkIn],
  );

  const handleVisibleMonthChange = useCallback((month: Date) => {
    const normalized = startOfMonth(month);
    setCalendarMonth((current) => (isSameMonth(current, normalized) ? current : normalized));
  }, []);

  /** Build the /checkout URL with current selection (no holdId — checkout page handles hold creation) */
  const buildCheckoutUrl = useCallback(() => {
    const qp = new URLSearchParams();
    qp.set("propertyId", props.propertyId);
    if (checkIn) qp.set("checkIn", checkIn);
    if (checkOut) qp.set("checkOut", checkOut);
    qp.set("guests", String(guests));
    if (props.slug) qp.set("slug", props.slug);
    return `/checkout?${qp.toString()}`;
  }, [checkIn, checkOut, guests, props.propertyId, props.slug]);

  const onReserve = useCallback(async () => {
    if (!canQuote || !quote || !quote.canBook || reserveBusy) return;

    // Not signed in → go straight to checkout; the Account card handles sign-in/sign-up inline.
    // After auth, the checkout page redirects back to itself with the same params.
    if (authStatus !== "authenticated") {
      router.push(buildCheckoutUrl());
      return;
    }

    // Authenticated → create the hold first, then go to checkout with holdId
    setReserveBusy(true);
    setReserveError(null);

    try {
      const reserved = await reserveHold(props.propertyId, {
        checkIn,
        checkOut,
        guests,
        currency: selectedCurrency,
      });

      const qp = new URLSearchParams();
      qp.set("propertyId", props.propertyId);
      qp.set("holdId", reserved.holdId);
      if (props.slug) qp.set("slug", props.slug);
      qp.set("guests", String(guests));
      qp.set("checkIn", checkIn);
      qp.set("checkOut", checkOut);

      router.push(`/checkout?${qp.toString()}`);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        // Token may have expired — go to checkout without hold; it'll re-auth
        router.push(buildCheckoutUrl());
        return;
      }
      setReserveError(error instanceof Error ? error.message : copy.reserveError);
    } finally {
      setReserveBusy(false);
    }
  }, [
    authStatus,
    buildCheckoutUrl,
    canQuote,
    checkIn,
    checkOut,
    copy.reserveError,
    guests,
    props.propertyId,
    props.slug,
    quote,
    reserveBusy,
    router,
    selectedCurrency,
  ]);

  useEffect(() => {
    if (!autoReserveRequested || autoReserveAttemptedRef.current) return;
    if (authStatus !== "authenticated") return;
    if (!canQuote || quoteState !== "ready" || !quote) return;

    autoReserveAttemptedRef.current = true;
    if (!quote.canBook) return;

    void onReserve();
  }, [autoReserveRequested, authStatus, canQuote, onReserve, quote, quoteState]);

  const quoteUnavailableReason =
    quote && !quote.canBook
      ? quote.reasons.filter(Boolean).join(" ") || copy.unavailable
      : null;

  const breakdown = quote?.breakdown ?? null;

  const breakdownCard = (
    <div className="mt-5 border-t border-line/30 pt-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {pricingTitle}
        </span>
        {quoteState === "loading" && (
          <Loader2 className="h-3 w-3 animate-spin text-muted" />
        )}
      </div>

      {quoteState === "loading" && !quote ? (
        <div className="animate-pulse space-y-3">
          {[70, 55, 55].map((w, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 rounded-full bg-line/50" style={{ width: `${w}%` }} />
              <div className="h-3 w-16 rounded-full bg-line/50" />
            </div>
          ))}
          <div className="mt-4 flex justify-between border-t border-line/30 pt-4">
            <div className="h-4 w-1/4 rounded-full bg-line/50" />
            <div className="h-4 w-24 rounded-full bg-line/50" />
          </div>
        </div>
      ) : !quote ? (
        <p className="text-sm text-secondary/70">{copy.exactTotal}</p>
      ) : breakdown ? (
        <div className="space-y-2.5">
          {/* Nightly subtotal */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-secondary">
              {breakdown.nights} {copy.nights} × {formatMoney(breakdown.basePricePerNight, quote.currency)}
            </span>
            <span className="font-semibold text-primary">
              {formatMoney(breakdown.nightlySubtotal, quote.currency)}
            </span>
          </div>

          {/* Cleaning fee */}
          {breakdown.cleaningFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-secondary">{copy.cleaning}</span>
              <span className="font-semibold text-primary">
                {formatMoney(breakdown.cleaningFee, quote.currency)}
              </span>
            </div>
          )}

          {/* Taxes & fees — collapsible */}
          {(breakdown.serviceCharge > 0 || breakdown.municipalityFee > 0 || breakdown.tourismFee > 0 || breakdown.vat > 0 || breakdown.tourismDirham > 0) && (
            <>
              <button
                type="button"
                onClick={() => setTaxesOpen((o) => !o)}
                className="flex w-full items-center justify-between text-sm"
              >
                <span className="flex items-center gap-1 text-secondary underline decoration-dotted underline-offset-2">
                  {locale === "ar" ? "الضرائب والرسوم" : "Taxes & fees"}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${taxesOpen ? "rotate-180" : ""}`} />
                </span>
                <span className="font-semibold text-primary">
                  {formatMoney(breakdown.serviceCharge + breakdown.municipalityFee + breakdown.tourismFee + breakdown.vat + breakdown.tourismDirham, quote.currency)}
                </span>
              </button>

              {taxesOpen && (
                <div className="space-y-2 rounded-xl bg-warm-alt px-3 py-2.5">
                  {breakdown.serviceCharge > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary" title="Tourism authority service charge — 10% of base">
                        {locale === "ar" ? "رسوم الخدمة (10%)" : "Service charge (10%)"}
                      </span>
                      <span className="text-primary">{formatMoney(breakdown.serviceCharge, quote.currency)}</span>
                    </div>
                  )}
                  {breakdown.municipalityFee > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary" title="Dubai municipality fee — 7% of base">
                        {locale === "ar" ? "رسوم البلدية (7%)" : "Municipality fee (7%)"}
                      </span>
                      <span className="text-primary">{formatMoney(breakdown.municipalityFee, quote.currency)}</span>
                    </div>
                  )}
                  {breakdown.tourismFee > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary" title="Dubai tourism fee — 6% of base">
                        {locale === "ar" ? "رسوم السياحة (6%)" : "Tourism fee (6%)"}
                      </span>
                      <span className="text-primary">{formatMoney(breakdown.tourismFee, quote.currency)}</span>
                    </div>
                  )}
                  {breakdown.vat > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary" title="Value Added Tax — 5% of subtotal including fees">
                        {locale === "ar" ? "ضريبة القيمة المضافة (5%)" : "VAT (5%)"}
                      </span>
                      <span className="text-primary">{formatMoney(breakdown.vat, quote.currency)}</span>
                    </div>
                  )}
                  {breakdown.tourismDirham > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-secondary" title="Tourism Dirham: fixed per room per night, capped at 30 nights">
                        {locale === "ar" ? "درهم السياحة" : "Tourism Dirham"}
                      </span>
                      <span className="text-primary">
                        {quote.currency === "AED"
                          ? formatMoney(breakdown.tourismDirham, "AED")
                          : `AED ${breakdown.tourismDirhamAed.toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Total */}
          <div className="flex items-center justify-between border-t border-line/30 pt-3 text-base font-bold text-primary">
            <span>{copy.total}</span>
            <span>{formatMoney(breakdown.total, quote.currency)}</span>
          </div>
          {quote.currency !== "AED" && (
            <div className="text-right text-[11px] text-muted">
              {formatBaseAed(quote.totalAmountAed)}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP ── */}
      <div
        className={[
          "hidden lg:block lg:sticky",
          desktopCalendarOpen ? "lg:top-6" : "lg:top-[88px]",
          "transition-[top] duration-300 ease-in-out",
        ].join(" ")}
      >
        <div className="premium-card premium-card-tinted rounded-3xl border border-white/60 p-6 shadow-[0_24px_64px_rgba(11,15,25,0.18)] ring-1 ring-white/40">
          {/* Price + currency switcher */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {copy.fromPerNight}
              </p>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold tracking-tight text-primary">{displayedNightPrice}</span>
                <span className="text-sm text-secondary">{copy.perNight}</span>
              </div>
            </div>
            <div className="mt-0.5 shrink-0">
              <CurrencySwitcher compact />
            </div>
          </div>

          {/* Date + guest selector */}
          <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-neutral-200">
            <div className="grid grid-cols-2 divide-x divide-line/40">
              <button
                type="button"
                onClick={() => openCalendar("checkin")}
                className="group flex min-h-[76px] flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent-soft/8"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted transition-colors group-hover:text-primary">
                  {copy.checkIn}
                </span>
                <span className={`mt-0.5 text-sm font-semibold ${checkIn ? "text-primary" : "text-secondary/60"}`}>
                  {checkInLabel}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openCalendar("checkout")}
                className="group flex min-h-[76px] flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors duration-150 hover:bg-accent-soft/8"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted transition-colors group-hover:text-primary">
                  {copy.checkOut}
                </span>
                <span className={`mt-0.5 text-sm font-semibold ${checkOut ? "text-primary" : "text-secondary/60"}`}>
                  {checkOutLabel}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-line/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted" />
                <span className="text-sm font-semibold text-primary">{copy.guests}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGuests((value) => clampGuests(value - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-neutral-300 transition hover:ring-neutral-400 active:scale-95"
                  aria-label="decrease guests"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-semibold text-primary">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests((value) => clampGuests(value + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface text-primary ring-1 ring-neutral-300 transition hover:ring-neutral-400 active:scale-95"
                  aria-label="increase guests"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {desktopCalendarOpen ? (
            <div className="mt-4">
              {calendarLoading ? (
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {copy.availabilityLoading}
                </div>
              ) : null}
              <DateRangePicker
                value={dateRangeValue}
                onChange={updateDates}
                minDate={today}
                maxDate={maxSelectableDate ?? undefined}
                disabledDates={unavailableDates}
                mode="sequential"
                selectionPhase={selectionPhase}
                onSelectionPhaseChange={setSelectionPhase}
                onComplete={() => {
                  setSelectionPhase("checkin");
                  setDesktopCalendarOpen(false);
                }}
                onVisibleMonthChange={handleVisibleMonthChange}
                numberOfMonths={1}
                maxMonthsAhead={6}
                compact
              />
            </div>
          ) : null}

          {calendarError ? (
            <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2.5 text-xs text-warning ring-1 ring-warning/20">
              {calendarError}
            </div>
          ) : null}

          {breakdownCard}

          {quoteError ? (
            <div className="mt-3 rounded-xl bg-danger/8 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
              {quoteError}
            </div>
          ) : null}

          {quoteUnavailableReason ? (
            <div className="mt-3 rounded-xl bg-warning/8 px-4 py-3 text-xs text-warning ring-1 ring-warning/20">
              {quoteUnavailableReason}
            </div>
          ) : null}

          {reserveError ? (
            <div className="mt-3 rounded-xl bg-danger/8 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
              {reserveError}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void onReserve()}
            disabled={!canReserve}
            className="site-cta-primary mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-accent-text shadow-[0_4px_16px_rgba(79,70,229,0.28)] transition hover:shadow-[0_6px_24px_rgba(79,70,229,0.36)] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
          >
            {reserveBusy || authStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {reserveCtaLabel}
          </button>

          <p className="mt-3 text-center text-xs text-secondary/70">{copy.holdNote}</p>
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="lg:hidden">
        {/* Fixed bottom bar */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">{copy.fromPerNight}</p>
              <p className="truncate text-base font-bold text-primary">
                {quote ? formatMoney(quote.totalAmount, quote.currency) : displayedNightPrice}
              </p>
              {quote ? (
                <p className="truncate text-[11px] text-secondary">
                  {quote.nights} {copy.nights} · {formatIsoForUi(quote.checkIn, locale)} – {formatIsoForUi(quote.checkOut, locale)}
                </p>
              ) : (
                <p className="truncate text-[11px] text-secondary">{dateSummary}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="site-cta-primary inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 text-sm font-bold text-accent-text shadow-[0_4px_14px_rgba(79,70,229,0.3)]"
            >
              {quote ? copy.viewDetails : copy.checkAvailability}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <button
              type="button"
              aria-label={copy.closeBookingPanel}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-brand/24"
            />

            {/* Bottom sheet */}
            <div className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-2xl border border-neutral-200 bg-white shadow-[0_-20px_60px_rgba(0,0,0,0.15)]">
              {/* Sticky header with drag handle */}
              <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white">
                <div className="flex justify-center pb-2 pt-3">
                  <div className="h-1 w-10 rounded-full bg-line/50" />
                </div>
                <div className="flex items-center justify-between gap-4 px-5 pb-3">
                  <div>
                    <p className="text-sm font-bold text-primary">{copy.checkAvailability}</p>
                    <p className="mt-0.5 text-xs text-secondary/70">{copy.exactTotal}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-muted ring-1 ring-neutral-300 transition hover:bg-neutral-100"
                    aria-label={copy.closeBookingPanel}
                  >
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-1">
                {/* Date + guest selector */}
                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
                  <div className="grid grid-cols-2 divide-x divide-line/40">
                    <button
                      type="button"
                      onClick={() => { openCalendar("checkin"); setMobileCalendarOpen(true); }}
                      className={[
                        "flex min-h-18 flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors",
                        selectionPhase === "checkin" && checkIn === "" ? "bg-brand/6" : "hover:bg-warm-alt/70",
                      ].join(" ")}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{copy.checkIn}</span>
                      <span className={`mt-0.5 text-sm font-semibold ${checkIn ? "text-primary" : "text-secondary/60"}`}>{checkInLabel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { openCalendar("checkout"); setMobileCalendarOpen(true); }}
                      className={[
                        "flex min-h-18 flex-col justify-center gap-0.5 px-4 py-3 text-left transition-colors",
                        selectionPhase === "checkout" && checkOut === "" ? "bg-brand/6" : "hover:bg-warm-alt/70",
                      ].join(" ")}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{copy.checkOut}</span>
                      <span className={`mt-0.5 text-sm font-semibold ${checkOut ? "text-primary" : "text-secondary/60"}`}>{checkOutLabel}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/40 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted" />
                      <span className="text-sm font-semibold text-primary">{copy.guests}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setGuests((value) => clampGuests(value - 1))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary ring-1 ring-neutral-300 active:scale-95"
                        aria-label="decrease guests"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-primary">{guests}</span>
                      <button
                        type="button"
                        onClick={() => setGuests((value) => clampGuests(value + 1))}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary ring-1 ring-neutral-300 active:scale-95"
                        aria-label="increase guests"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {mobileCalendarOpen ? (
                  <div className="mt-4">
                    {calendarLoading ? (
                      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-muted">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {copy.availabilityLoading}
                      </div>
                    ) : null}
                    <DateRangePicker
                      value={dateRangeValue}
                      onChange={updateDates}
                      minDate={today}
                      maxDate={maxSelectableDate ?? undefined}
                      disabledDates={unavailableDates}
                      mode="sequential"
                      selectionPhase={selectionPhase}
                      onSelectionPhaseChange={setSelectionPhase}
                      onComplete={() => { setSelectionPhase("checkin"); setMobileCalendarOpen(false); }}
                      onVisibleMonthChange={handleVisibleMonthChange}
                      numberOfMonths={1}
                      maxMonthsAhead={4}
                      compact
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMobileCalendarOpen(true)}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-neutral-100"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {copy.calendar}
                  </button>
                )}

                {calendarError ? (
                  <div className="mt-3 rounded-xl bg-warning/10 px-3 py-2.5 text-xs text-warning ring-1 ring-warning/20">
                    {calendarError}
                  </div>
                ) : null}

                {breakdownCard}

                {quoteError ? (
                  <div className="mt-3 rounded-xl bg-danger/8 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
                    {quoteError}
                  </div>
                ) : null}

                {quoteUnavailableReason ? (
                  <div className="mt-3 rounded-xl bg-warning/8 px-4 py-3 text-xs text-warning ring-1 ring-warning/20">
                    {quoteUnavailableReason}
                  </div>
                ) : null}

                {reserveError ? (
                  <div className="mt-3 rounded-xl bg-danger/8 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
                    {reserveError}
                  </div>
                ) : null}

              <button
                type="button"
                onClick={() => void onReserve()}
                disabled={!canReserve}
                className="site-cta-primary mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold text-accent-text shadow-[0_4px_14px_rgba(79,70,229,0.28)] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none"
              >
                {reserveBusy || authStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {reserveCtaLabel}
              </button>

              <p className="mt-3 text-center text-xs text-secondary/70">{copy.holdNote}</p>
              <div className="mt-4">
                <CurrencySwitcher compact />
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
