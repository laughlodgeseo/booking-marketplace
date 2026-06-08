"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, Building2, CheckCircle2, CreditCard, Loader2, LockKeyhole, X } from "lucide-react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import {
  getVendorPropertyFees,
  initiatePropertyFeePayment,
  type VendorPropertyFeesResponse,
  type PropertyFeeItem,
  type FeePaymentInitResponse,
} from "@/lib/api/portal/vendor";

// ─── Currency helpers ─────────────────────────────────────────────────────────
const _feeFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
function fmtAed(minorUnits: number): string {
  return `AED ${_feeFormatter.format(minorUnits / 100)}`;
}

// ─── Stripe helpers ───────────────────────────────────────────────────────────
const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();
function getStripePromise(publishableKey: string) {
  if (!stripePromiseCache.has(publishableKey)) {
    stripePromiseCache.set(publishableKey, loadStripe(publishableKey));
  }
  return stripePromiseCache.get(publishableKey)!;
}

// ─── Error helpers ────────────────────────────────────────────────────────────
function friendlyInitError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : typeof raw === "string" ? raw : "";

  if (!msg || msg.includes("fetch") || msg.includes("network") || msg.toLowerCase().includes("failed to fetch")) {
    return "We could not reach the payment service. Please check your connection and try again.";
  }

  const lower = msg.toLowerCase();

  if (lower.includes("already succeeded") || lower.includes("already paid")) {
    return "This fee has already been paid. Please refresh the page to see the updated status.";
  }

  if (lower.includes("no longer payable") || lower.includes("invalid or do not belong") || lower.includes("not payable")) {
    return "This fee is no longer payable. Please refresh the page.";
  }

  if (lower.includes("at least one fee") || lower.includes("fee id")) {
    return "We could not start this payment. Please try again.";
  }

  if (lower.includes("stripe") || lower.includes("client secret") || lower.includes("publishable key")) {
    return "Payments are temporarily unavailable. Please contact support.";
  }

  // Raw JSON / parser errors must never reach the user
  if (msg.startsWith("{") || msg.startsWith("[") || msg.includes("unexpected token") || msg.includes("is not valid json")) {
    return "We could not start this payment. Please try again.";
  }

  // Short, readable backend messages can pass through (e.g. "Payment already succeeded.")
  if (msg.length <= 120 && !msg.includes("{") && !msg.includes("[")) {
    return msg;
  }

  return "We could not start this payment. Please try again.";
}

// ─── Small display components ─────────────────────────────────────────────────
function FeeBadge({ status }: { status: string }) {
  if (status === "PAID")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
      <AlertCircle className="h-3 w-3" /> Unpaid
    </span>
  );
}

function FeeTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    ACTIVATION: "Activation Fee",
    INSURANCE: "Property Insurance",
    FURNISHING: "Furnishing Fee",
  };
  return <span>{map[type] ?? type}</span>;
}

function PropertyFeeStatus({ status }: { status: string }) {
  if (status === "paid")
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">All paid</span>;
  if (status === "partially_paid")
    return <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand">Partial</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">Outstanding</span>;
}

// ─── Fee payment form (inside Stripe Elements context) ────────────────────────
type FeeFormState =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

function FeeCheckoutForm({
  totalFormatted,
  onSubmitted,
}: {
  totalFormatted: string;
  onSubmitted: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<FeeFormState>({ kind: "idle" });
  const [isReady, setIsReady] = useState(false);

  const returnUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URL("/vendor/property-fees?payment=done", window.location.origin).toString();
  }, []);

  const canSubmit =
    state.kind !== "processing" &&
    state.kind !== "submitted" &&
    Boolean(stripe && elements) &&
    isReady;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setState({ kind: "processing" });
    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: { ...(returnUrl ? { return_url: returnUrl } : {}) },
      });
      if (result.error) {
        setState({ kind: "error", message: result.error.message ?? "Payment failed. Please try again." });
        return;
      }
      setState({ kind: "submitted" });
      onSubmitted();
    } catch {
      setState({ kind: "error", message: "Unable to complete payment. Please try again." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-line/80 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-semibold text-secondary">Total due</div>
            <div className="mt-1 text-lg font-semibold text-primary">{totalFormatted}</div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-line/80 bg-surface/80 px-3 py-1 text-xs font-semibold text-secondary">
            <LockKeyhole className="h-3.5 w-3.5" /> Encrypted
          </div>
        </div>
        <div className="rounded-xl border border-line/80 bg-white px-3 py-3">
          <PaymentElement onReady={() => setIsReady(true)} />
        </div>
      </div>

      {state.kind === "error" && (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
          {state.message}
        </div>
      )}
      {state.kind === "submitted" && (
        <div className="rounded-xl border border-success/30 bg-success/12 px-4 py-3 text-xs text-success">
          <span className="font-semibold">Payment submitted.</span> Confirming with Stripe — this page will refresh shortly.
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex h-11 w-full items-center justify-center rounded-2xl bg-brand text-sm font-semibold text-accent-text transition hover:bg-brand-hover disabled:bg-warm-alt disabled:text-muted"
      >
        {state.kind === "processing" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
        ) : state.kind === "submitted" ? "Submitted" : "Pay now"}
      </button>

      <div className="text-[11px] text-secondary text-center">
        Card data goes directly to Stripe. Fees are confirmed only by backend webhook.
      </div>
    </form>
  );
}

// ─── Payment modal ────────────────────────────────────────────────────────────
type ModalState =
  | { kind: "closed" }
  | { kind: "initiating" }
  | { kind: "ready"; intent: FeePaymentInitResponse }
  | { kind: "error"; message: string };

function FeePaymentModal({
  state,
  label,
  onClose,
  onPaid,
  onRetry,
}: {
  state: ModalState;
  label: string;
  onClose: () => void;
  onPaid: () => void;
  onRetry?: () => void;
}) {
  if (state.kind === "closed") return null;

  const envKey = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  const publishableKey =
    state.kind === "ready"
      ? ((state.intent.publishableKey ?? "").trim() || envKey)
      : envKey;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl bg-surface shadow-2xl p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-primary text-lg">Pay fee</h2>
            <p className="text-xs text-secondary mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-warm-alt text-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {state.kind === "initiating" && (
          <div className="flex items-center justify-center py-10 gap-2 text-sm text-secondary">
            <Loader2 className="h-5 w-5 animate-spin" /> Preparing secure payment…
          </div>
        )}

        {state.kind === "error" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
              <AlertCircle className="inline-block h-4 w-4 mr-1.5 align-text-bottom" />
              {state.message}
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex h-10 w-full items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 text-sm font-semibold text-brand hover:bg-brand/20 transition"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {state.kind === "ready" && publishableKey && (
          <Elements
            stripe={getStripePromise(publishableKey)}
            options={{ clientSecret: state.intent.clientSecret }}
          >
            <FeeCheckoutForm
              totalFormatted={state.intent.totalFormatted}
              onSubmitted={() => {
                setTimeout(() => {
                  onPaid();
                  onClose();
                }, 2000);
              }}
            />
          </Elements>
        )}

        {state.kind === "ready" && !publishableKey && (
          <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-sm text-danger">
            Payments are temporarily unavailable. Please contact support.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: VendorPropertyFeesResponse };

export default function VendorPropertyFeesPage() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [modal, setModal] = useState<ModalState>({ kind: "closed" });
  const [modalLabel, setModalLabel] = useState("");
  const retryRef = useRef<(() => void) | null>(null);

  function loadFees() {
    setView({ kind: "loading" });
    getVendorPropertyFees()
      .then((data) => setView({ kind: "ready", data }))
      .catch((e: unknown) =>
        setView({ kind: "error", message: e instanceof Error ? e.message : "Failed to load fees." })
      );
  }

  useEffect(() => { loadFees(); }, []);

  async function openPaymentModal(
    propertyId: string,
    fees: PropertyFeeItem[],
    label: string,
  ) {
    const feeIds = fees.filter((f) => f.status === "UNPAID").map((f) => f.id);
    if (feeIds.length === 0) return;

    const attempt = async () => {
      setModalLabel(label);
      setModal({ kind: "initiating" });
      try {
        const intent = await initiatePropertyFeePayment(propertyId, feeIds);
        setModal({ kind: "ready", intent });
      } catch (e: unknown) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[FeePayment] initiation failed", e);
        }
        setModal({ kind: "error", message: friendlyInitError(e) });
      }
    };

    retryRef.current = attempt;
    await attempt();
  }

  return (
    <>
      <PortalShell role="vendor" title="Property Fees" subtitle="Onboarding fee obligations across your approved properties">
        {view.kind === "loading" && (
          <div className="space-y-4">
            <SkeletonBlock className="h-28 rounded-3xl" />
            <SkeletonBlock className="h-48 rounded-3xl" />
            <SkeletonBlock className="h-48 rounded-3xl" />
          </div>
        )}

        {view.kind === "error" && (
          <div className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
            {view.message}
          </div>
        )}

        {view.kind === "ready" && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                  <CreditCard className="h-3.5 w-3.5" /> Total Fees
                </div>
                <div className="text-2xl font-bold text-primary">{view.data.summary.totalDueFormatted}</div>
                <div className="mt-1 text-xs text-secondary">
                  {view.data.summary.propertiesWithFees} propert{view.data.summary.propertiesWithFees === 1 ? "y" : "ies"} with fees
                </div>
              </div>
              <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Paid
                </div>
                <div className="text-2xl font-bold text-success">{view.data.summary.totalPaidFormatted}</div>
              </div>
              <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                  <AlertCircle className="h-3.5 w-3.5 text-warning" /> Outstanding
                </div>
                <div className="text-2xl font-bold text-warning">{view.data.summary.outstandingFormatted}</div>
              </div>
            </div>

            {/* Info banner */}
            <div className="rounded-2xl border border-brand/20 bg-brand/5 px-5 py-4 text-sm text-primary">
              <span className="font-semibold">How fees work:</span> You can pay each fee individually or all outstanding fees for a property in one payment. Fees are separate charge line items — paying one does not affect others.
            </div>

            {/* Per-property fee tables */}
            {view.data.items.length === 0 ? (
              <div className="rounded-3xl border border-line/50 bg-surface p-10 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-muted opacity-40" />
                <p className="text-sm text-secondary">No fee records yet. Fees are generated when a property is approved by admin.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {view.data.items.map((entry) => {
                  const unpaidFees = entry.fees.filter((f) => f.status === "UNPAID");
                  const isInitiating = modal.kind === "initiating";
                  return (
                    <div key={entry.propertyId} className="rounded-3xl border border-line/50 bg-surface shadow-sm overflow-hidden">
                      {/* Property header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/50 px-6 py-4">
                        <div>
                          <div className="font-semibold text-primary">{entry.propertyTitle}</div>
                          <div className="mt-0.5 text-xs text-secondary">
                            {entry.propertyCity} &middot;{" "}
                            {entry.furnishingStatus === "FURNISHED"
                              ? "Furnished"
                              : entry.furnishingStatus === "UNFURNISHED"
                              ? "Unfurnished"
                              : "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <PropertyFeeStatus status={entry.feeStatus} />
                          {unpaidFees.length > 0 && (
                            <button
                              disabled={isInitiating}
                              onClick={() =>
                                openPaymentModal(
                                  entry.propertyId,
                                  unpaidFees,
                                  `Pay all outstanding — ${entry.propertyTitle}`,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-1.5 text-xs font-semibold text-accent-text hover:bg-brand-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Pay all outstanding
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fee rows */}
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-line/30 bg-warm-base">
                            <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Fee type</th>
                            <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Amount</th>
                            <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                            <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.fees.map((fee) => (
                            <tr key={fee.id} className="border-b border-line/20 last:border-0">
                              <td className="px-6 py-3 text-sm text-primary"><FeeTypeLabel type={fee.type} /></td>
                              <td className="px-6 py-3 text-right text-sm font-semibold text-primary">{fee.amountFormatted}</td>
                              <td className="px-6 py-3 text-right"><FeeBadge status={fee.status} /></td>
                              <td className="px-6 py-3 text-right">
                                {fee.status === "UNPAID" ? (
                                  <button
                                    disabled={isInitiating}
                                    onClick={() =>
                                      openPaymentModal(
                                        entry.propertyId,
                                        [fee],
                                        `Pay ${fee.type === "ACTIVATION" ? "Activation Fee" : fee.type === "INSURANCE" ? "Insurance Fee" : "Furnishing Fee"} — ${entry.propertyTitle}`,
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Pay fee
                                  </button>
                                ) : (
                                  <span className="text-xs text-muted">
                                    {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : "—"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-warm-base">
                            <td className="px-6 py-3 text-sm font-bold text-primary">Total</td>
                            <td className="px-6 py-3 text-right text-sm font-bold text-primary">
                              {fmtAed(entry.totalDueMinor)}
                            </td>
                            <td colSpan={2} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </PortalShell>

      <FeePaymentModal
        state={modal}
        label={modalLabel}
        onClose={() => setModal({ kind: "closed" })}
        onPaid={loadFees}
        onRetry={() => retryRef.current?.()}
      />
    </>
  );
}
