"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  CalendarDays,
  CreditCard,
  MapPin,
  ShieldCheck,
  Timer,
  Users,
} from "lucide-react";
import { useBookingPoll } from "@/components/checkout/useBookingPoll";
import CheckoutForm from "@/components/payment/CheckoutForm";
import StripeProvider from "@/components/payment/StripeProvider";
import {
  cancelBooking,
  createStripePaymentIntent,
  findUserBookingById,
  getUserBookingDetail,
  type BookingListItem,
  type BookingDetail,
} from "@/lib/api/bookings";
import { PromoCodeInput } from "@/components/checkout/PromoCodeInput";
import { OptimizedImage } from "@/components/ui/OptimizedImage";

type ViewState =
  | { kind: "idle" }
  | { kind: "refreshing" }
  | { kind: "cancelling" }
  | { kind: "error"; message: string };

type StripeIntentState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "ready";
      clientSecret: string;
      publishableKey?: string | null;
      reused: boolean;
    }
  | { kind: "error"; message: string };

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; detail: BookingDetail }
  | { kind: "unauthorized" }
  | { kind: "error"; message: string };

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function upper(s: string): string {
  return (s ?? "").toUpperCase();
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function fmtShortDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return s;
  }
}

function isoDay(s: string | null | undefined): string | null {
  if (!s) return null;
  const match = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function fmtCountdown(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function moneyFromCents(cents?: number | null, currency?: string | null): string {
  if (cents == null || !currency) return "—";
  const amount = cents;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency.toUpperCase() === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(currency.toUpperCase() === "AED" ? 0 : 2)} ${currency}`;
  }
}

function isUnauthorizedError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const s = msg.toLowerCase();
  return s.includes("unauthorized") || s.includes("401");
}

function getOrCreatePaymentIdempotencyKey(bookingId: string): string {
  const key = `payment:idemp:${bookingId}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.trim().length > 0) return existing.trim();
  } catch {
    // ignore
  }

  const v =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `idemp_${Math.random().toString(16).slice(2)}_${Date.now()}`;

  try {
    localStorage.setItem(key, v);
  } catch {
    // ignore
  }
  return v;
}

function clearPaymentIdempotencyKey(bookingId: string) {
  const key = `payment:idemp:${bookingId}`;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}


export function PendingPaymentCard(props: { bookingId: string; status: string; subtitle?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [latest, setLatest] = useState<BookingListItem | null>(null);
  const [intentState, setIntentState] = useState<StripeIntentState>({ kind: "idle" });
  const [detailState, setDetailState] = useState<DetailState>({ kind: "idle" });
  const intentOnceRef = useRef(false);

  const loginHref = useMemo(() => {
    const currentQuery = searchParams.toString();
    const next = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    const qp = new URLSearchParams();
    qp.set("role", "customer");
    qp.set("next", next);
    return `/login?${qp.toString()}`;
  }, [pathname, searchParams]);

  const baseStatus = latest?.status ?? props.status;
  const isPendingForPolling = upper(baseStatus).includes("PENDING");

  const poll = useBookingPoll({
    bookingId: props.bookingId,
    enabled: isPendingForPolling,
    intervalMs: 5000,
    maxMs: 2 * 60 * 1000,
  });
  const effectiveLatest = poll.state.booking ?? latest;
  const status = effectiveLatest?.status ?? props.status;
  const s = upper(status);

  const isPending = s.includes("PENDING");
  const isCancelled = s.includes("CANCEL");
  const isConfirmed = s.includes("CONFIRM");
  const isExpired = s.includes("EXPIRE");
  const authRequired = detailState.kind === "unauthorized";
  const bookingDataReady = detailState.kind === "ready";

  const canCancel = useMemo(() => {
    return !isCancelled && !isConfirmed && !isExpired;
  }, [isCancelled, isConfirmed, isExpired]);

  const bookingDetail = detailState.kind === "ready" ? detailState.detail : null;

  useEffect(() => {
    const b = poll.state.booking;
    if (!b) return;

    const st = upper(b.status);

    if (st.includes("CONFIRM")) {
      router.replace(`/payment/success?bookingId=${encodeURIComponent(b.id)}`);
    } else if (st.includes("CANCEL")) {
      router.replace(`/payment/cancelled?bookingId=${encodeURIComponent(b.id)}`);
    } else if (st.includes("EXPIRE")) {
      router.replace(`/payment/failed?bookingId=${encodeURIComponent(b.id)}`);
    }
  }, [poll.state.booking, router]);

  useEffect(() => {
    let cancelled = false;
    if (!props.bookingId) return () => undefined;

    setDetailState({ kind: "loading" });
    getUserBookingDetail({ bookingId: props.bookingId })
      .then((detail: BookingDetail) => {
        if (cancelled) return;
        setDetailState({ kind: "ready", detail });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (isUnauthorizedError(e)) {
          setDetailState({ kind: "unauthorized" });
          return;
        }
        setDetailState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load booking summary",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [props.bookingId]);

  async function refresh() {
    setState({ kind: "refreshing" });
    try {
      const b = await findUserBookingById({ bookingId: props.bookingId, maxPages: 50, pageSize: 20 });
      setLatest(b);
      setState({ kind: "idle" });

      if (b) {
        const st = upper(b.status);
        if (st.includes("CONFIRM")) router.replace(`/payment/success?bookingId=${encodeURIComponent(b.id)}`);
        else if (st.includes("CANCEL")) router.replace(`/payment/cancelled?bookingId=${encodeURIComponent(b.id)}`);
        else if (st.includes("EXPIRE")) router.replace(`/payment/failed?bookingId=${encodeURIComponent(b.id)}`);
      }
    } catch (e) {
      if (isUnauthorizedError(e)) {
        setDetailState({ kind: "unauthorized" });
        setState({ kind: "error", message: "Please sign in to refresh booking status." });
        return;
      }
      setState({ kind: "error", message: e instanceof Error ? e.message : "Failed to refresh" });
    }
  }

  async function onCancel() {
    if (!canCancel) return;

    const ok = window.confirm("Cancel this booking? Backend policy rules will be enforced.");
    if (!ok) return;

    setState({ kind: "cancelling" });
    try {
      await cancelBooking(props.bookingId);
      await refresh();
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Failed to cancel booking" });
    }
  }

  async function prepareIntent() {
    if (!isPending) return;
    if (!bookingDataReady) return;
    if (intentState.kind === "loading" || intentState.kind === "ready") return;
    if (intentOnceRef.current && intentState.kind === "error") return;
    if (authRequired) return;

    intentOnceRef.current = true;
    setIntentState({ kind: "loading" });
    try {
      const idempotencyKey = getOrCreatePaymentIdempotencyKey(props.bookingId);
      const res = await createStripePaymentIntent({ bookingId: props.bookingId, idempotencyKey });

      const clientSecret = (res.clientSecret ?? "").trim();
      const publishableKey = (res.publishableKey ?? "").trim();
      if (!clientSecret) {
        throw new Error("Unable to start payment. Please try again or refresh.");
      }

      setIntentState({
        kind: "ready",
        clientSecret,
        publishableKey: publishableKey || null,
        reused: Boolean(res.reused),
      });
    } catch (e) {
      console.error("❌ Failed to initialize payment session:", {
        bookingId: props.bookingId,
        error: e instanceof Error ? e.message : String(e ?? "unknown"),
      });
      if (isUnauthorizedError(e)) {
        setDetailState({ kind: "unauthorized" });
        setIntentState({ kind: "error", message: "Please sign in to continue payment." });
        return;
      }
      setIntentState({
        kind: "error",
        message:
          e instanceof Error ? e.message : "Unable to start payment. Please try again or refresh.",
      });
    }
  }

  useEffect(() => {
    if (isPending && bookingDataReady && !authRequired) {
      void prepareIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, bookingDataReady, authRequired, props.bookingId]);

  const stripeElementOptions = useMemo(
    () => ({
      appearance: {
        theme: "flat" as const,
        variables: {
          colorPrimary: "#4f46e5",
          colorBackground: "#f8f2e8",
          colorText: "#1b2433",
          colorDanger: "#b42318",
          colorTextSecondary: "rgba(27, 36, 51, 0.72)",
          fontFamily: 'Manrope, "Avenir Next", "Segoe UI", sans-serif',
          borderRadius: "12px",
        },
        rules: {
          ".Input": {
            backgroundColor: "rgba(255, 255, 255, 0.78)",
            border: "1px solid rgba(102, 112, 130, 0.18)",
          },
          ".Label": { color: "rgba(27, 36, 51, 0.72)" },
        },
      },
    }),
    [],
  );

  const detailCurrency = bookingDetail?.currency ?? effectiveLatest?.currency ?? null;
  const detailTotal = bookingDetail?.totalAmount ?? effectiveLatest?.totalAmount ?? null;
  const detailCheckIn = bookingDetail?.checkIn ?? null;
  const detailCheckOut = bookingDetail?.checkOut ?? null;
  const detailNights =
    bookingDetail?.nights ??
    (detailCheckIn && detailCheckOut
      ? Math.max(
          1,
          Math.round(
            (new Date(detailCheckOut).getTime() - new Date(detailCheckIn).getTime()) /
              (24 * 60 * 60 * 1000),
          ),
        )
      : null);
  const detailGuests =
    bookingDetail && Number.isFinite(bookingDetail.adults + bookingDetail.children)
      ? bookingDetail.adults + bookingDetail.children
      : null;
  const fxRateRaw = bookingDetail?.fxRate;
  const fxRate =
    typeof fxRateRaw === "number" && Number.isFinite(fxRateRaw) && fxRateRaw > 0 ? fxRateRaw : null;
  const isAed = !detailCurrency || detailCurrency.toUpperCase() === "AED";
  const toDisplayAmount = (amountAed: number | null) => {
    if (amountAed == null) return null;
    if (isAed) return amountAed;
    if (fxRate == null) return null;
    return Math.round(amountAed * fxRate);
  };

  const basePricePerNightAed = bookingDetail?.property?.basePrice ?? null;
  const cleaningFeeAed = bookingDetail?.property?.cleaningFee ?? null;
  const nightlySubtotalAed =
    basePricePerNightAed != null && detailNights != null ? basePricePerNightAed * detailNights : null;
  const nightlySubtotal = toDisplayAmount(nightlySubtotalAed);
  const cleaningFee = toDisplayAmount(cleaningFeeAed);
  const taxes = 0;
  const computedTotal =
    detailTotal != null ? detailTotal : nightlySubtotal != null ? nightlySubtotal + (cleaningFee ?? 0) + taxes : null;
  const propertyTitle = bookingDetail?.property?.title ?? null;
  const propertySlug = bookingDetail?.property?.slug ?? null;
  const propertyCover = bookingDetail?.property?.coverUrl ?? null;
  const propertyLocation = bookingDetail?.property
    ? [bookingDetail.property.city, bookingDetail.property.area].filter(Boolean).join(", ")
    : null;

  const totalText = moneyFromCents(
    computedTotal ?? effectiveLatest?.totalAmount ?? null,
    detailCurrency ?? effectiveLatest?.currency ?? null,
  );
  const resolvedPublishableKey =
    intentState.kind === "ready"
      ? ((intentState.publishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim())
      : "";
  const isTestMode = resolvedPublishableKey.startsWith("pk_test_");

  const stepAuthStatus = authRequired ? "needs" : "done";
  const stepPaymentStatus = isConfirmed ? "done" : isPending ? "active" : "idle";
  const stepConfirmStatus = isConfirmed ? "done" : "idle";

  const editDatesHref = useMemo(() => {
    if (!propertySlug) return "/properties";
    const qp = new URLSearchParams();
    const checkInDay = isoDay(detailCheckIn);
    const checkOutDay = isoDay(detailCheckOut);
    if (checkInDay) qp.set("checkIn", checkInDay);
    if (checkOutDay) qp.set("checkOut", checkOutDay);
    if (detailGuests != null) qp.set("guests", String(detailGuests));
    return `/properties/${encodeURIComponent(propertySlug)}${qp.toString() ? `?${qp}` : ""}`;
  }, [detailCheckIn, detailCheckOut, detailGuests, propertySlug]);

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="space-y-2.5">
        <h2 className="text-xl font-semibold tracking-tight text-primary">
          {isConfirmed ? "Payment confirmed" : "Complete your payment"}
        </h2>
        {isPending && totalText !== "—" && (
          <div className="inline-flex items-center gap-2.5 rounded-full bg-linear-to-r from-indigo-500/10 to-violet-500/10 px-4 py-2 ring-1 ring-brand/20">
            <CreditCard className="h-4 w-4 shrink-0 text-brand" />
            <span className="text-sm font-bold text-primary">{totalText}</span>
            <span className="text-xs text-secondary">due now</span>
          </div>
        )}
      </div>

      {/* Expiry timer — only show when less than 15 min remaining */}
      {poll.remainingMs !== null && isPending && poll.remainingMs < 15 * 60 * 1000 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2.5 text-xs text-warning ring-1 ring-warning/20">
          <Timer className="h-3.5 w-3.5 shrink-0" />
          Reservation expires in{" "}
          <span className="font-bold">{fmtCountdown(poll.remainingMs)}</span>
        </div>
      )}

      {/* Auth required */}
      {authRequired && (
        <div className="rounded-2xl bg-warning/10 px-5 py-4 ring-1 ring-warning/20">
          <div className="text-sm font-semibold text-primary">Sign in to continue</div>
          <p className="mt-1 text-xs text-secondary">
            You must be signed in to complete payment.
          </p>
          <Link
            href={loginHref}
            className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
          >
            Sign in
          </Link>
        </div>
      )}

      {/* Non-pending / non-confirmed state */}
      {!isPending && !isConfirmed && !isExpired && !authRequired && (
        <div className="rounded-xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-4 py-3 text-sm text-secondary ring-1 ring-black/[0.07]">
          Payment is not available for this booking status.
        </div>
      )}

      {/* Expired */}
      {isExpired && (
        <div className="rounded-xl bg-danger/8 px-4 py-4 text-sm text-danger ring-1 ring-danger/20">
          <div className="font-semibold">Reservation expired</div>
          <p className="mt-1 text-xs">
            This booking expired before payment was completed. Please start again from the listing.
          </p>
        </div>
      )}

      {/* Loading booking details */}
      {isPending && !authRequired && !bookingDataReady && (
        <div className="flex items-center gap-2 text-sm text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Preparing payment…
        </div>
      )}

      {/* Stripe payment form */}
      {isPending && !authRequired && bookingDataReady && (
        <div className="space-y-3">
          {intentState.kind === "idle" || intentState.kind === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-secondary">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              Initializing secure payment…
            </div>
          ) : intentState.kind === "error" ? (
            <div className="space-y-3 rounded-xl bg-danger/8 px-4 py-4 ring-1 ring-danger/20">
              <p className="text-sm font-semibold text-danger">Unable to start payment</p>
              <p className="text-xs text-danger/80">{intentState.message}</p>
              <button
                type="button"
                onClick={() => {
                  clearPaymentIdempotencyKey(props.bookingId);
                  intentOnceRef.current = false;
                  void prepareIntent();
                }}
                className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
              >
                Try again
              </button>
            </div>
          ) : intentState.kind === "ready" ? (
            <div className="relative z-20 pointer-events-auto">
              <StripeProvider
                clientSecret={intentState.clientSecret}
                publishableKey={intentState.publishableKey}
                options={stripeElementOptions}
                onError={(message) => {
                  setIntentState({ kind: "error", message });
                }}
              >
                <CheckoutForm
                  totalText={totalText}
                  disabled={!isPending || state.kind !== "idle"}
                  isTestMode={isTestMode}
                  bookingId={props.bookingId}
                  clientSecret={intentState.clientSecret}
                  onSubmitted={() => void refresh()}
                />
              </StripeProvider>
            </div>
          ) : null}
        </div>
      )}

      {/* Confirmed */}
      {isConfirmed && (
        <div className="flex items-start gap-4 rounded-2xl bg-success/10 px-5 py-5 ring-1 ring-success/20">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
          <div>
            <div className="font-semibold text-primary">Payment confirmed!</div>
            <p className="mt-1 text-sm text-secondary">
              Redirecting to your booking details…
            </p>
          </div>
        </div>
      )}

      {/* Error states */}
      {state.kind === "error" && (
        <div className="rounded-xl bg-danger/8 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
          {state.message}
        </div>
      )}
      {detailState.kind === "error" && (
        <div className="rounded-xl bg-danger/8 px-4 py-3 text-xs text-danger ring-1 ring-danger/20">
          {detailState.message}
        </div>
      )}

      {/* Cancel — subtle text button */}
      {canCancel && isPending && (
        <button
          type="button"
          onClick={() => void onCancel()}
          disabled={state.kind !== "idle"}
          className="text-xs text-muted transition hover:text-danger disabled:opacity-50"
        >
          {state.kind === "cancelling" ? "Cancelling…" : "Cancel this booking"}
        </button>
      )}
    </div>
  );
}
