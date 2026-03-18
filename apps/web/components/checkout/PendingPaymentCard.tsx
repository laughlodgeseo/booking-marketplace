"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import {
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { useBookingPoll } from "@/components/checkout/useBookingPoll";
import {
  cancelBooking,
  createStripePaymentIntent,
  findUserBookingById,
  type BookingListItem,
} from "@/lib/api/bookings";

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
      publishableKey: string;
      reused: boolean;
    }
  | { kind: "error"; message: string };

type PaymentActionState =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "submitted" }
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

function fmtCountdown(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  if (m <= 0) return `${r}s`;
  return `${m}m ${r}s`;
}

function moneyFromCents(cents?: number | null, currency?: string | null): string {
  if (cents == null || !currency) return "—";
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
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

function StripeCheckoutForm(props: {
  totalText: string;
  disabled: boolean;
  isTestMode: boolean;
  bookingId: string;
  onSubmitted: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<PaymentActionState>({ kind: "idle" });

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const url = new URL("/payment/return", window.location.origin);
    if (props.bookingId) url.searchParams.set("bookingId", props.bookingId);
    return url.toString();
  }, [props.bookingId]);

  const canSubmit =
    !props.disabled &&
    state.kind !== "processing" &&
    state.kind !== "submitted" &&
    Boolean(stripe && elements);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setState({ kind: "processing" });

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: returnUrl ? { return_url: returnUrl } : undefined,
      redirect: "if_required",
    });

    if (result.error) {
      setState({ kind: "error", message: result.error.message ?? "Payment failed." });
      return;
    }

    const intent = result.paymentIntent;
    if (!intent) {
      setState({ kind: "error", message: "Payment confirmation failed." });
      return;
    }

    if (intent.status === "requires_payment_method") {
      setState({ kind: "error", message: "Payment was not authorized. Try another method." });
      return;
    }

    setState({ kind: "submitted" });
    props.onSubmitted();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-secondary">Total due</div>
          <div className="mt-1 text-lg font-semibold text-primary">{props.totalText}</div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-line/80 bg-surface/80 px-3 py-1 text-xs font-semibold text-secondary">
          <LockKeyhole className="h-3.5 w-3.5" />
          Encrypted
        </div>
      </div>

      <div className="rounded-2xl border border-line/80 bg-surface/70 p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-secondary">
          <span>Payment details</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-line/80 bg-white/60 px-2 py-1 text-[10px] text-secondary">
            Powered by Stripe
          </span>
        </div>
        <div className="mt-3 rounded-xl border border-line/80 bg-white/70 px-3 py-3">
          <PaymentElement
            options={{
              layout: "accordion",
              fields: { billingDetails: { name: "auto" } },
            }}
          />
        </div>
      </div>

      {state.kind === "error" ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
          <span className="font-semibold">Payment error:</span> {state.message}
        </div>
      ) : null}

      {state.kind === "submitted" ? (
        <div className="rounded-xl border border-success/30 bg-success/12 px-4 py-3 text-xs text-success">
          <span className="font-semibold">Payment submitted.</span> We&apos;re verifying it with Stripe.
        </div>
      ) : null}

      {props.isTestMode ? (
        <div className="rounded-xl border border-line/80 bg-surface/70 px-4 py-3 text-[11px] text-secondary">
          Test card: <span className="font-semibold">4242 4242 4242 4242</span> · any future date · any CVC
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={classNames(
          "flex h-11 w-full items-center justify-center rounded-2xl text-sm font-semibold transition",
          canSubmit ? "bg-brand text-accent-text hover:bg-brand-hover" : "bg-warm-alt text-muted",
        )}
      >
        {state.kind === "processing" ? "Processing…" : state.kind === "submitted" ? "Submitted" : "Pay securely"}
      </button>

      <div className="text-[11px] text-secondary">
        Payment confirmation is handled by the backend after Stripe webhook verification.
      </div>
    </form>
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
  const [state, setState] = useState<ViewState>({ kind: "idle" });
  const [latest, setLatest] = useState<BookingListItem | null>(null);
  const [intentState, setIntentState] = useState<StripeIntentState>({ kind: "idle" });
  const intentOnceRef = useRef(false);

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

  const canCancel = useMemo(() => {
    return !isCancelled && !isConfirmed && !isExpired;
  }, [isCancelled, isConfirmed, isExpired]);

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
    if (intentState.kind === "loading" || intentState.kind === "ready") return;
    if (intentOnceRef.current && intentState.kind === "error") return;

    intentOnceRef.current = true;
    setIntentState({ kind: "loading" });
    try {
      const idempotencyKey = getOrCreatePaymentIdempotencyKey(props.bookingId);
      const res = await createStripePaymentIntent({ bookingId: props.bookingId, idempotencyKey });

      const clientSecret = (res.clientSecret ?? "").trim();
      const publishableKey = (res.publishableKey ?? "").trim();
      if (!clientSecret || !publishableKey) {
        throw new Error("Payment session is unavailable. Please try again.");
      }

      setIntentState({
        kind: "ready",
        clientSecret,
        publishableKey,
        reused: Boolean(res.reused),
      });
    } catch (e) {
      setIntentState({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to start payment",
      });
    }
  }

  useEffect(() => {
    if (isPending) {
      void prepareIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, props.bookingId]);

  const stripePromise = useMemo(() => {
    if (intentState.kind !== "ready") return null;
    return loadStripe(intentState.publishableKey);
  }, [intentState]);

  const elementsOptions = useMemo<StripeElementsOptions | undefined>(() => {
    if (intentState.kind !== "ready") return undefined;
    return {
      clientSecret: intentState.clientSecret,
      appearance: {
        theme: "flat",
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
    };
  }, [intentState]);

  const totalText = moneyFromCents(effectiveLatest?.totalAmount ?? null, effectiveLatest?.currency ?? null);

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

        <div className="rounded-2xl border border-line/80 bg-surface/70 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-secondary">Stripe checkout</div>
              <div className="mt-1 text-sm text-secondary">
                Secure card payment. Confirmation is webhook-driven.
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-secondary">
              <CreditCard className="h-4 w-4" />
              Card
            </div>
          </div>

          {!isPending ? (
            <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
              Payment is not available for this booking status.
            </div>
          ) : intentState.kind === "loading" || intentState.kind === "idle" ? (
            <div className="mt-4 rounded-xl border border-line/80 bg-white/60 px-4 py-3 text-xs text-secondary">
              Preparing secure checkout…
            </div>
          ) : intentState.kind === "error" ? (
            <div className="mt-4 rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
              <div className="font-semibold">Payment session failed.</div>
              <div className="mt-1">{intentState.message}</div>
              <button
                type="button"
                onClick={() => {
                  intentOnceRef.current = false;
                  void prepareIntent();
                }}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
              >
                Try again
              </button>
            </div>
          ) : intentState.kind === "ready" && stripePromise ? (
            <div className="mt-4">
              <Elements stripe={stripePromise} options={elementsOptions}>
            <StripeCheckoutForm
              totalText={totalText}
              disabled={!isPending || state.kind !== "idle"}
              isTestMode={intentState.publishableKey.startsWith("pk_test_")}
              bookingId={props.bookingId}
              onSubmitted={() => void refresh()}
            />
              </Elements>
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
