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

function StatusPill({ status }: { status: string }) {
  const s = upper(status);
  if (s.includes("PENDING")) {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/12 px-3 py-1.5 text-xs font-semibold text-warning">
        PENDING PAYMENT
      </span>
    );
  }
  if (s.includes("CONFIRM")) {
    return (
      <span className="inline-flex items-center rounded-full border border-success/30 bg-success/12 px-3 py-1.5 text-xs font-semibold text-success">
        CONFIRMED
      </span>
    );
  }
  if (s.includes("CANCEL")) {
    return (
      <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/12 px-3 py-1.5 text-xs font-semibold text-danger">
        CANCELLED
      </span>
    );
  }
  if (s.includes("EXPIRE")) {
    return (
      <span className="inline-flex items-center rounded-full border border-danger/30 bg-danger/12 px-3 py-1.5 text-xs font-semibold text-danger">
        EXPIRED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-line/80 bg-surface/60 px-3 py-1.5 text-xs font-semibold text-secondary">
      {status || "—"}
    </span>
  );
}

function HowConfirmationWorks() {
  return (
    <div className="rounded-2xl border border-line/80 bg-surface/70 p-4">
      <div className="text-sm font-semibold text-primary">How confirmation works</div>
      <p className="mt-1 text-sm leading-6 text-secondary">
        Your booking becomes <span className="font-semibold">CONFIRMED</span> only after Stripe notifies the backend via
        verified webhooks. This prevents fake confirmations and protects inventory.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line/80 bg-white/60 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <CreditCard className="h-4 w-4" />
            Step 1
          </div>
          <div className="mt-2 text-sm font-semibold text-primary">Pay securely</div>
          <div className="mt-1 text-xs text-secondary">Card details are encrypted and sent to Stripe.</div>
        </div>
        <div className="rounded-xl border border-line/80 bg-white/60 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <ShieldCheck className="h-4 w-4" />
            Step 2
          </div>
          <div className="mt-2 text-sm font-semibold text-primary">Stripe verifies</div>
          <div className="mt-1 text-xs text-secondary">Stripe validates the payment and sends a webhook.</div>
        </div>
        <div className="rounded-xl border border-line/80 bg-white/60 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            Step 3
          </div>
          <div className="mt-2 text-sm font-semibold text-primary">Backend confirms</div>
          <div className="mt-1 text-xs text-secondary">Only backend confirmation marks the booking.</div>
        </div>
      </div>
    </div>
  );
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
    <div className="premium-card premium-card-tinted rounded-3xl p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-wide text-muted">Payment status</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-primary">Secure checkout</h2>
          <p className="mt-2 text-sm text-secondary">
            {props.subtitle ??
              (isPending
                ? "Submit payment securely. Booking is confirmed only after Stripe webhooks are verified by the backend."
                : "This booking status is driven by backend state.")}
          </p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={classNames(
                "rounded-2xl border p-4",
                stepAuthStatus === "done"
                  ? "border-success/30 bg-success/10"
                  : "border-warning/30 bg-warning/12",
              )}
            >
              <div className="text-xs font-semibold text-secondary">Step 1</div>
              <div className="mt-1 text-sm font-semibold text-primary">Authentication</div>
              <div className="mt-1 text-xs text-secondary">
                {authRequired ? "Sign in required to continue checkout." : "Signed in and ready."}
              </div>
            </div>

            <div
              className={classNames(
                "rounded-2xl border p-4",
                stepPaymentStatus === "done"
                  ? "border-success/30 bg-success/10"
                  : stepPaymentStatus === "active"
                    ? "border-warning/30 bg-warning/12"
                    : "border-line/80 bg-surface/70",
              )}
            >
              <div className="text-xs font-semibold text-secondary">Step 2</div>
              <div className="mt-1 text-sm font-semibold text-primary">Payment method</div>
              <div className="mt-1 text-xs text-secondary">
                {stepPaymentStatus === "done"
                  ? "Payment submitted."
                  : stepPaymentStatus === "active"
                    ? "Enter card details to pay."
                    : "Awaiting payment window."}
              </div>
            </div>

            <div
              className={classNames(
                "rounded-2xl border p-4",
                stepConfirmStatus === "done"
                  ? "border-success/30 bg-success/10"
                  : "border-line/80 bg-surface/70",
              )}
            >
              <div className="text-xs font-semibold text-secondary">Step 3</div>
              <div className="mt-1 text-sm font-semibold text-primary">Confirmation</div>
              <div className="mt-1 text-xs text-secondary">
                {stepConfirmStatus === "done"
                  ? "Booking confirmed via webhook."
                  : "Confirmation follows verified Stripe events."}
              </div>
            </div>
          </div>

          {isPending && !authRequired && computedTotal != null && (
            <div className="rounded-2xl border border-line/80 bg-surface/70 p-4">
              <div className="text-xs font-semibold text-secondary mb-3">Promo code</div>
              <PromoCodeInput
                bookingAmount={computedTotal}
                propertyId={bookingDetail?.property?.id}
                onApplied={(_discount) => {
                  // TODO: apply discount to total
                }}
                onRemoved={() => {
                  // TODO: remove discount from total
                }}
              />
            </div>
          )}

          <div className="rounded-2xl border border-line/80 bg-surface/70 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-secondary">Payment method</div>
                <div className="mt-1 text-sm text-secondary">Card payment via Stripe.</div>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
                <CreditCard className="h-4 w-4" />
                Card
              </div>
            </div>

            {authRequired ? (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/12 px-4 py-3 text-xs text-warning">
                <div className="font-semibold">Sign in required.</div>
                <div className="mt-1">Please log in to continue secure checkout.</div>
                <Link
                  href={loginHref}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
                >
                  Go to login
                </Link>
              </div>
            ) : !isPending ? (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
                Payment is not available for this booking status.
              </div>
            ) : !bookingDataReady ? (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
                Loading booking details before payment initialization…
              </div>
            ) : intentState.kind === "loading" || intentState.kind === "idle" ? (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
                Preparing secure checkout…
              </div>
            ) : intentState.kind === "error" ? (
              <div className="mt-4 rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
                <div className="font-semibold">Unable to start payment. Please try again or refresh.</div>
                <div className="mt-1">{intentState.message}</div>
                <button
                  type="button"
                  onClick={() => {
                    clearPaymentIdempotencyKey(props.bookingId);
                    intentOnceRef.current = false;
                    void prepareIntent();
                  }}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
                >
                  Try again
                </button>
              </div>
            ) : intentState.kind === "ready" ? (
              <div className="relative z-20 mt-4 pointer-events-auto">
                <StripeProvider
                  clientSecret={intentState.clientSecret}
                  publishableKey={intentState.publishableKey}
                  options={stripeElementOptions}
                  onError={(message) => {
                    console.error("❌ StripeProvider initialization error:", {
                      bookingId: props.bookingId,
                      message,
                    });
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
            ) : (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
                Payment session not ready. Please refresh.
              </div>
            )}

            {intentState.kind === "ready" && intentState.reused ? (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-[11px] text-secondary">
                Using an existing secure payment session for this booking.
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-line/80 bg-surface/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-secondary">Booking</div>
                <div className="mt-1 text-sm text-primary">
                  ID: <span className="font-mono text-xs">{props.bookingId}</span>
                </div>
                <div className="mt-1 text-sm text-secondary">
                  Status: <span className="font-semibold">{status}</span>
                </div>
                {totalText !== "—" ? (
                  <div className="mt-1 text-sm text-secondary">
                    Total: <span className="font-semibold">{totalText}</span>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3 py-1 text-xs font-semibold text-secondary">
                <Timer className="h-3.5 w-3.5" />
                {isPending ? "Payment window" : "Timeline"}
              </div>
            </div>

            {effectiveLatest?.expiresAt ? (
              <div className="mt-2 text-xs text-secondary">
                Expires at: <span className="font-semibold">{fmtDate(effectiveLatest.expiresAt)}</span>
              </div>
            ) : null}

            {poll.remainingMs !== null && isPending ? (
              <div className="mt-2 text-xs text-warning">
                Remaining: <span className="font-semibold">{fmtCountdown(poll.remainingMs)}</span>
              </div>
            ) : null}

            <div className="mt-3 text-xs text-secondary">
              Auto-refresh: <span className="font-semibold">{isPending ? "On" : "Off"}</span> • ticks: {poll.ticks}
            </div>
          </div>

          {isPending ? <HowConfirmationWorks /> : null}

          {isExpired ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
              This booking expired due to unpaid status. Please start again from the listing.
            </div>
          ) : null}

          {detailState.kind === "error" ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
              <span className="font-semibold">Summary error:</span> {detailState.message}
            </div>
          ) : null}

          {poll.state.kind === "error" ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
              <span className="font-semibold">Auto-refresh error:</span> {poll.state.message}
            </div>
          ) : null}

          {state.kind === "error" ? (
            <div className="rounded-2xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
              <span className="font-semibold">Error:</span> {state.message}
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={state.kind !== "idle"}
              className="inline-flex items-center justify-center rounded-2xl border border-line/80 bg-surface/70 px-4 py-2 text-sm font-semibold text-primary hover:bg-surface disabled:opacity-60"
            >
              {state.kind === "refreshing" ? "Refreshing…" : "Refresh status"}
            </button>

            <button
              type="button"
              onClick={() => void onCancel()}
              disabled={state.kind !== "idle" || !canCancel}
              className="inline-flex items-center justify-center rounded-2xl border border-line/80 bg-surface/70 px-4 py-2 text-sm font-semibold text-danger hover:bg-surface disabled:opacity-60"
            >
              {state.kind === "cancelling" ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-line/80 bg-surface/70 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-secondary">Your trip</div>
              {propertyLocation ? (
                <div className="flex items-center gap-1 text-[11px] text-secondary">
                  <MapPin className="h-3.5 w-3.5" />
                  {propertyLocation}
                </div>
              ) : null}
            </div>

            {detailState.kind === "loading" ? (
              <div className="mt-4 space-y-3">
                <div className="h-20 w-full animate-pulse rounded-xl bg-white/50" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-white/50" />
                <div className="h-24 w-full animate-pulse rounded-xl bg-white/50" />
              </div>
            ) : detailState.kind === "unauthorized" ? (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/12 px-4 py-3 text-xs text-warning">
                <div className="font-semibold">Sign in to view your booking summary.</div>
                <Link
                  href={loginHref}
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
                >
                  Go to login
                </Link>
              </div>
            ) : bookingDetail ? (
              <>
                <div className="mt-4 flex items-start gap-3">
                  <div className="h-20 w-24 overflow-hidden rounded-xl border border-line/80 bg-warm-alt">
                    {propertyCover ? (
                      <OptimizedImage src={propertyCover} alt={propertyTitle ?? "Property"} width={400} height={300} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-secondary">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-primary">{propertyTitle ?? "Property"}</div>
                    {propertyLocation ? (
                      <div className="mt-1 flex items-center gap-1 text-xs text-secondary">
                        <MapPin className="h-3.5 w-3.5" />
                        {propertyLocation}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-xl border border-line/80 bg-white/60 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Dates
                      </div>
                      <Link href={editDatesHref} className="text-xs font-semibold text-brand">
                        Edit
                      </Link>
                    </div>
                    <div className="mt-1 text-sm text-primary">
                      {fmtShortDate(detailCheckIn)} – {fmtShortDate(detailCheckOut)}
                    </div>
                    {detailNights != null ? (
                      <div className="mt-1 text-xs text-secondary">{detailNights} nights</div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-line/80 bg-white/60 p-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
                      <Users className="h-3.5 w-3.5" />
                      Guests
                    </div>
                    <div className="mt-1 text-sm text-primary">{detailGuests ?? "—"}</div>
                  </div>

                  <div className="rounded-xl border border-line/80 bg-white/60 p-3">
                    <div className="text-xs font-semibold text-secondary">Price breakdown</div>
                    <div className="mt-2 space-y-2 text-xs text-secondary">
                      <div className="flex items-center justify-between gap-4">
                        <span>Base price</span>
                        <span className="font-semibold text-primary">
                          {moneyFromCents(nightlySubtotal, detailCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Cleaning fee</span>
                        <span className="font-semibold text-primary">
                          {moneyFromCents(cleaningFee, detailCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Taxes</span>
                        <span className="font-semibold text-primary">
                          {moneyFromCents(taxes, detailCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-line/60 pt-2 text-sm font-semibold text-primary">
                        <span>Total</span>
                        <span>{moneyFromCents(computedTotal, detailCurrency)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
                Booking summary is unavailable.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/account/bookings"
          className="inline-flex items-center justify-center rounded-2xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:opacity-95"
        >
          View my bookings
        </Link>

        <Link
          href={`/account/bookings/${encodeURIComponent(props.bookingId)}`}
          className="inline-flex items-center justify-center rounded-2xl border border-line/80 bg-surface/70 px-4 py-2 text-sm font-semibold text-primary hover:bg-surface"
        >
          Booking details
        </Link>

        <Link
          href="/properties"
          className="inline-flex items-center justify-center rounded-2xl border border-line/80 bg-surface/70 px-4 py-2 text-sm font-semibold text-primary hover:bg-surface"
        >
          Continue browsing
        </Link>
      </div>
    </div>
  );
}
