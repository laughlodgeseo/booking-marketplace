"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    reserveAndContinue: "Reserve and continue",
    reserving: "Reserving...",
    holdNote:
      "You won't be charged yet. We create a temporary hold, then continue to secure checkout for payment.",
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
    signInToReserve: "Sign in to reserve",
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
    reserveAndContinue: "احجز وتابع",
    reserving: "جارٍ إنشاء الحجز المؤقت...",
    holdNote:
      "لن يتم تحصيل أي مبلغ الآن. ننشئ حجزاً مؤقتاً ثم ننتقل إلى صفحة دفع آمنة.",
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
    signInToReserve: "سجّل الدخول للحجز",
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
  const pathname = usePathname();
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
  const availabilityUntilLabel = useMemo(() => {
    if (!calendarWindow?.to) return null;
    const parsed = parseISO(calendarWindow.to);
    if (!isValid(parsed)) return null;
    return formatIsoForUi(toIsoDay(subDays(parsed, 1)), locale);
  }, [calendarWindow?.to, locale]);

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
      : authStatus === "authenticated"
        ? copy.reserveAndContinue
        : copy.signInToReserve;

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

  const buildLoginNextPath = useCallback(() => {
    // After login, land on the new /checkout page so the hold is created there
    const qp = new URLSearchParams();
    qp.set("propertyId", props.propertyId);
    if (checkIn) qp.set("checkIn", checkIn);
    if (checkOut) qp.set("checkOut", checkOut);
    qp.set("guests", String(guests));
    if (props.slug) qp.set("slug", props.slug);
    return `/checkout?${qp.toString()}`;
  }, [checkIn, checkOut, guests, props.propertyId, props.slug]);

  const redirectToLogin = useCallback(() => {
    const qp = new URLSearchParams();
    qp.set("role", "customer");
    qp.set("next", buildLoginNextPath());
    router.push(`/login?${qp.toString()}`);
  }, [buildLoginNextPath, router]);

  const onReserve = useCallback(async () => {
    if (!canQuote || !quote || !quote.canBook || reserveBusy) return;

    if (authStatus !== "authenticated") {
      setReserveError(copy.loginRequired);
      redirectToLogin();
      return;
    }

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
      qp.set("slug", props.slug);
      qp.set("guests", String(guests));
      qp.set("checkIn", checkIn);
      qp.set("checkOut", checkOut);

      router.push(`/checkout?${qp.toString()}`);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setReserveError(copy.loginRequired);
        redirectToLogin();
        return;
      }
      setReserveError(error instanceof Error ? error.message : copy.reserveError);
    } finally {
      setReserveBusy(false);
    }
  }, [
    authStatus,
    canQuote,
    checkIn,
    checkOut,
    copy.loginRequired,
    copy.reserveError,
    guests,
    props.propertyId,
    props.slug,
    quote,
    redirectToLogin,
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
    <div className="mt-3 rounded-2xl border border-line/70 bg-[rgb(var(--color-bg-rgb)/0.84)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{pricingTitle}</div>
          <div className="mt-1 text-lg font-semibold text-primary">
            {quote ? formatMoney(quote.totalAmount, quote.currency) : displayedNightPrice}
          </div>
          {quote ? (
            <div className="text-xs text-secondary">
              {quote.nights} {copy.nights} • {formatIsoForUi(quote.checkIn, locale)} - {formatIsoForUi(quote.checkOut, locale)}
            </div>
          ) : (
            <div className="text-xs text-secondary">{copy.exactTotal}</div>
          )}
        </div>
        <div className="text-right text-xs text-secondary">
          {copy.fromPerNight} {displayedNightPrice}
          <div>{copy.perNight}</div>
        </div>
      </div>

      {quote && breakdown ? (
        <div className="mt-3 space-y-2 border-t border-line/70 pt-3 text-sm text-secondary">
          <div className="flex items-center justify-between">
            <span>
              {copy.base} ({breakdown.nights} {copy.nights})
            </span>
            <span className="font-semibold text-primary">{formatMoney(breakdown.baseAmount, quote.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{copy.cleaning}</span>
            <span className="font-semibold text-primary">{formatMoney(breakdown.cleaningFee, quote.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{copy.serviceFee}</span>
            <span className="font-semibold text-primary">{formatMoney(breakdown.serviceFee, quote.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{copy.taxes}</span>
            <span className="font-semibold text-primary">{formatMoney(breakdown.taxes, quote.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line/70 pt-2 text-base font-semibold text-primary">
            <span>{copy.total}</span>
            <span>{formatMoney(breakdown.total, quote.currency)}</span>
          </div>

          {quote.currency !== "AED" ? (
            <div className="text-right text-[11px] text-muted">{formatBaseAed(quote.totalAmountAed)}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      <div className="hidden lg:block">
        <div className="premium-card premium-card-tinted rounded-3xl border border-white/70 p-5 shadow-[0_20px_56px_rgba(11,15,25,0.14)] sm:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">{copy.fromPerNight}</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{displayedNightPrice}</div>
            </div>
            <div className="text-xs text-secondary">{copy.perNight}</div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-line/70 bg-surface/90">
            <div className="grid grid-cols-2">
              <button
                type="button"
                onClick={() => openCalendar("checkin")}
                className="flex min-h-[78px] flex-col items-start justify-center gap-1 border-r border-line/70 px-4 text-left transition hover:bg-accent-soft/12"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.checkIn}</span>
                <span className="text-sm font-semibold text-primary">{checkInLabel}</span>
              </button>

              <button
                type="button"
                onClick={() => openCalendar("checkout")}
                className="flex min-h-[78px] flex-col items-start justify-center gap-1 px-4 text-left transition hover:bg-accent-soft/12"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.checkOut}</span>
                <span className="text-sm font-semibold text-primary">{checkOutLabel}</span>
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-line/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Users className="h-4 w-4 text-muted" />
                {copy.guests}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGuests((value) => clampGuests(value - 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 bg-surface text-primary hover:bg-accent-soft/20"
                  aria-label="decrease guests"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <span className="min-w-8 text-center text-sm font-semibold text-primary">{guests}</span>

                <button
                  type="button"
                  onClick={() => setGuests((value) => clampGuests(value + 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 bg-surface text-primary hover:bg-accent-soft/20"
                  aria-label="increase guests"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {desktopCalendarOpen ? (
            <div className="mt-3 rounded-2xl border border-line/70 bg-surface/95 p-3">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-secondary">
                <span>{copy.calendar}</span>
                {calendarLoading ? <span>{copy.availabilityLoading}</span> : null}
              </div>

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
                numberOfMonths={2}
                maxMonthsAhead={4}
                compact
              />
            </div>
          ) : null}

          {calendarError ? (
            <div className="mt-3 rounded-xl border border-warning/30 bg-warning/12 px-3 py-2 text-xs text-warning">
              {calendarError}
            </div>
          ) : null}

          {availabilityUntilLabel ? (
            <div className="mt-2 text-xs text-secondary">
              {copy.availabilityUntil} {availabilityUntilLabel}
            </div>
          ) : null}

          <div className="mt-3">
            <CurrencySwitcher compact />
          </div>

          {breakdownCard}

          {quoteError ? (
            <div className="mt-3 rounded-xl border border-danger/25 bg-danger/12 px-4 py-3 text-xs text-danger">{quoteError}</div>
          ) : null}

          {quoteUnavailableReason ? (
            <div className="mt-3 rounded-xl border border-warning/25 bg-warning/12 px-4 py-3 text-xs text-warning">
              {quoteUnavailableReason}
            </div>
          ) : null}

          {reserveError ? (
            <div className="mt-3 rounded-xl border border-danger/25 bg-danger/12 px-4 py-3 text-xs text-danger">{reserveError}</div>
          ) : null}

          <button
            type="button"
            onClick={() => void onReserve()}
            disabled={!canReserve}
            className="site-cta-primary mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-accent-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reserveBusy || authStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {reserveCtaLabel}
          </button>

          <div className="mt-3 text-xs text-secondary">{copy.holdNote}</div>
          <div className="mt-1 text-xs text-secondary">{copy.livePricingHint}</div>
          <div className="mt-1 text-xs text-secondary">{copy.confirmAndPay}</div>
        </div>
      </div>

      <div className="lg:hidden">
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-[rgb(var(--color-surface-rgb)/0.98)]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] text-secondary">{copy.fromPerNight}</p>
              <p className="truncate text-sm font-semibold text-primary">{quote ? formatMoney(quote.totalAmount, quote.currency) : displayedNightPrice}</p>
              <p className="truncate text-xs text-secondary">{dateSummary}</p>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="site-cta-primary inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-accent-text"
            >
              {quote ? copy.viewDetails : copy.checkAvailability}
              <ChevronDown className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              aria-label={copy.closeBookingPanel}
              onClick={() => setMobileOpen(false)}
              className="absolute inset-0 bg-black/45"
            />

            <div className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-22px_62px_rgba(11,15,25,0.28)]">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-primary">{copy.checkAvailability}</p>
                  <p className="mt-1 text-xs text-secondary">{copy.exactTotal}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line/70 bg-surface text-primary"
                  aria-label={copy.closeBookingPanel}
                >
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-line/70 bg-surface/90">
                <div className="grid grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      openCalendar("checkin");
                      setMobileCalendarOpen(true);
                    }}
                    className="flex min-h-[74px] flex-col items-start justify-center gap-1 border-r border-line/70 px-4 text-left"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.checkIn}</span>
                    <span className="text-sm font-semibold text-primary">{checkInLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      openCalendar("checkout");
                      setMobileCalendarOpen(true);
                    }}
                    className="flex min-h-[74px] flex-col items-start justify-center gap-1 px-4 text-left"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{copy.checkOut}</span>
                    <span className="text-sm font-semibold text-primary">{checkOutLabel}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-line/70 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Users className="h-4 w-4 text-muted" />
                    {copy.guests}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuests((value) => clampGuests(value - 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 bg-surface text-primary"
                      aria-label="decrease guests"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-semibold text-primary">{guests}</span>
                    <button
                      type="button"
                      onClick={() => setGuests((value) => clampGuests(value + 1))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line/70 bg-surface text-primary"
                      aria-label="increase guests"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {mobileCalendarOpen ? (
                <div className="mt-3 rounded-2xl border border-line/70 bg-surface/95 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-secondary">
                    <div className="inline-flex items-center gap-2">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {copy.calendar}
                    </div>
                    {calendarLoading ? <span>{copy.availabilityLoading}</span> : null}
                  </div>

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
                      setMobileCalendarOpen(false);
                    }}
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
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line/70 bg-surface px-4 py-3 text-sm font-semibold text-primary"
                >
                  <CalendarDays className="h-4 w-4" />
                  {copy.calendar}
                </button>
              )}

              {calendarError ? (
                <div className="mt-3 rounded-xl border border-warning/30 bg-warning/12 px-3 py-2 text-xs text-warning">
                  {calendarError}
                </div>
              ) : null}

              {breakdownCard}

              {quoteError ? (
                <div className="mt-3 rounded-xl border border-danger/25 bg-danger/12 px-4 py-3 text-xs text-danger">{quoteError}</div>
              ) : null}

              {quoteUnavailableReason ? (
                <div className="mt-3 rounded-xl border border-warning/25 bg-warning/12 px-4 py-3 text-xs text-warning">
                  {quoteUnavailableReason}
                </div>
              ) : null}

              {reserveError ? (
                <div className="mt-3 rounded-xl border border-danger/25 bg-danger/12 px-4 py-3 text-xs text-danger">{reserveError}</div>
              ) : null}

              <button
                type="button"
                onClick={() => void onReserve()}
                disabled={!canReserve}
                className="site-cta-primary mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-accent-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reserveBusy || authStatus === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {reserveCtaLabel}
              </button>

              <div className="mt-3 text-xs text-secondary">{copy.holdNote}</div>
              <div className="mt-1 text-xs text-secondary">{copy.livePricingHint}</div>
              <div className="mt-3">
                <CurrencySwitcher compact />
              </div>
            </div>
          </div>
        ) : null}

        <div className="h-20" />
      </div>
    </>
  );
}
