"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  createVendorActivationPaymentIntent,
  getVendorPropertyActivation,
} from "@/lib/api/portal/vendor";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      data: Awaited<ReturnType<typeof getVendorPropertyActivation>>;
    };

type PaymentSession = {
  clientSecret: string;
  publishableKey: string | null;
  paymentIntentId: string;
  reused: boolean;
};

function formatMoneyMinor(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

function fmtDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function readActivationPaymentIdempotencyKey(propertyId: string): string {
  const key = `activation:payment:idempotency:${propertyId}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.trim()) return existing.trim();
  } catch {
    // ignore storage failures
  }

  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `activation_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  try {
    localStorage.setItem(key, generated);
  } catch {
    // ignore storage failures
  }

  return generated;
}

function clearActivationPaymentIdempotencyKey(propertyId: string) {
  const key = `activation:payment:idempotency:${propertyId}`;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(publishableKey: string) {
  const cached = stripePromiseCache.get(publishableKey);
  if (cached) return cached;
  const created = loadStripe(publishableKey);
  stripePromiseCache.set(publishableKey, created);
  return created;
}

function ActivationCardForm(props: {
  clientSecret: string;
  onSubmitted: () => Promise<void>;
  disabled?: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      setError("Stripe is still loading. Please wait a moment.");
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card form is unavailable. Refresh and try again.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const result = await stripe.confirmCardPayment(props.clientSecret, {
        payment_method: {
          card,
        },
      });

      if (result.error) {
        setError(result.error.message ?? "Payment failed. Please try again.");
        return;
      }

      await props.onSubmitted();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Payment failed. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="rounded-xl border border-line/80 bg-surface px-3 py-3">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                color: "#1b2433",
                fontFamily: 'Manrope, "Segoe UI", sans-serif',
                fontSize: "14px",
                "::placeholder": {
                  color: "rgba(27, 36, 51, 0.54)",
                },
              },
              invalid: {
                color: "#b42318",
              },
            },
          }}
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={props.disabled || processing}
        className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
      >
        {processing ? "Confirming payment..." : "Pay now"}
      </button>
    </form>
  );
}

export default function VendorPropertyActivationPage() {
  const router = useRouter();
  const params = useParams<{ propertyId: string }>();
  const propertyId = typeof params?.propertyId === "string" ? params.propertyId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setState({ kind: "error", message: "Missing property id." });
      return;
    }

    setState({ kind: "loading" });
    try {
      const data = await getVendorPropertyActivation(propertyId);
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load activation status",
      });
    }
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const paymentSessionPublishableKey =
    (paymentSession?.publishableKey ?? "").trim() ||
    (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();

  const stripePromise = useMemo(() => {
    if (!paymentSession || !paymentSessionPublishableKey) return null;
    return getStripePromise(paymentSessionPublishableKey);
  }, [paymentSession, paymentSessionPublishableKey]);

  const isAlreadyPaid =
    state.kind === "ready" &&
    (state.data.activationPaymentStatus === "PAID" ||
      state.data.invoice?.status === "PAID" ||
      state.data.propertyStatus === "PUBLISHED");

  async function startPayment() {
    if (!propertyId || state.kind !== "ready") return;

    setBusy("Preparing payment...");
    setMessage(null);

    try {
      const idempotencyKey = readActivationPaymentIdempotencyKey(propertyId);
      const session = await createVendorActivationPaymentIntent(propertyId, {
        idempotencyKey,
      });

      setPaymentSession({
        clientSecret: session.clientSecret,
        publishableKey: session.publishableKey,
        paymentIntentId: session.paymentIntentId,
        reused: session.reused,
      });

      setState({
        kind: "ready",
        data: {
          ...state.data,
          propertyStatus: session.propertyStatus,
          activationPaymentStatus: session.activationPaymentStatus,
          invoice: session.invoice,
        },
      });

      if (session.reused) {
        setMessage("Reusing your existing payment session.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to initialize activation payment.",
      );
    } finally {
      setBusy(null);
    }
  }

  const pollUntilActivated = useCallback(async () => {
    if (!propertyId) return;

    setBusy("Verifying payment webhook...");

    try {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const latest = await getVendorPropertyActivation(propertyId);
        setState({ kind: "ready", data: latest });

        const paid =
          latest.activationPaymentStatus === "PAID" ||
          latest.invoice?.status === "PAID" ||
          latest.propertyStatus === "PUBLISHED";

        if (paid) {
          clearActivationPaymentIdempotencyKey(propertyId);
          setMessage("Activation payment confirmed. Your listing is now live.");
          setTimeout(() => {
            router.replace(`/vendor/properties/${encodeURIComponent(propertyId)}`);
          }, 1200);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 2500));
      }

      setMessage("Payment submitted. We are still waiting for Stripe webhook confirmation.");
    } finally {
      setBusy(null);
    }
  }, [propertyId, router]);

  return (
    <PortalShell
      role="vendor"
      title="Activation Payment"
      subtitle="Complete activation to publish your listing"
      right={
        <Link
          href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          Back to editor
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/vendor" className="hover:text-primary">Portal Home</Link>
          <span className="mx-2">/</span>
          <Link href="/vendor/properties" className="hover:text-primary">Properties</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">Activation</span>
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-40" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-5 text-sm text-danger">{state.message}</div>
        ) : (
          <>
            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-primary">Property approved</div>
                  <div className="mt-1 text-xs text-secondary">
                    Pay activation fee to publish your listing.
                  </div>
                </div>
                <StatusPill status={state.data.propertyStatus}>{state.data.propertyStatus}</StatusPill>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Info
                  label="Activation fee"
                  value={
                    typeof state.data.activationFee === "number"
                      ? formatMoneyMinor(state.data.activationFee, state.data.activationFeeCurrency)
                      : "Not set"
                  }
                />
                <Info label="Payment status" value={state.data.activationPaymentStatus} />
                <Info label="Invoice status" value={state.data.invoice?.status ?? "PENDING"} />
                <Info label="Paid at" value={fmtDate(state.data.invoice?.paidAt ?? null)} />
              </div>
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Activation invoice</div>
              {state.data.invoice ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Info label="Invoice" value={state.data.invoice.id} mono />
                  <Info
                    label="Amount"
                    value={formatMoneyMinor(state.data.invoice.amount, state.data.invoice.currency)}
                  />
                  <Info label="Status" value={state.data.invoice.status} />
                  <Info label="Created" value={fmtDate(state.data.invoice.createdAt)} />
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No activation invoice found yet.
                </div>
              )}

              {!isAlreadyPaid ? (
                <div className="mt-4 space-y-3">
                  {!paymentSession ? (
                    <button
                      type="button"
                      onClick={() => void startPayment()}
                      disabled={busy !== null || !state.data.activationRequired}
                      className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
                    >
                      Pay now
                    </button>
                  ) : !stripePromise ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs text-danger">
                      Stripe publishable key is missing. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
                    </div>
                  ) : (
                    <Elements stripe={stripePromise}>
                      <ActivationCardForm
                        clientSecret={paymentSession.clientSecret}
                        onSubmitted={pollUntilActivated}
                        disabled={busy !== null}
                      />
                    </Elements>
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-success/30 bg-success/12 p-3 text-sm text-success">
                  Activation payment is complete. Your listing is active.
                </div>
              )}

              {state.data.invoice?.lastError ? (
                <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/12 p-3 text-xs text-danger">
                  Last payment error: {state.data.invoice.lastError}
                </div>
              ) : null}

              {busy ? <div className="mt-3 text-xs font-semibold text-secondary">{busy}</div> : null}
              {message ? (
                <div className="mt-3 rounded-2xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">
                  {message}
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}

function Info(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-line/70 bg-warm-base p-4">
      <div className="text-xs font-semibold text-muted">{props.label}</div>
      <div className={`mt-1 text-sm font-semibold text-primary ${props.mono ? "font-mono text-xs" : ""}`}>
        {props.value}
      </div>
    </div>
  );
}
