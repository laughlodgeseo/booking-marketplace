"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  X,
} from "lucide-react";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { stripeErrorMessage } from "@/lib/stripe/fee-payment-errors";
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

// ─── Stripe CardElement style ────────────────────────────────────────────────
const CARD_ELEMENT_STYLE = {
  base: {
    fontSize: "15px",
    color: "#0f172a",
    fontFamily: "inherit",
    "::placeholder": { color: "#94a3b8" },
    iconColor: "#64748b",
  },
  invalid: { color: "#ef4444", iconColor: "#ef4444" },
};

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

  if (msg.startsWith("{") || msg.startsWith("[") || msg.includes("unexpected token") || msg.includes("is not valid json")) {
    return "We could not start this payment. Please try again.";
  }

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

// ─── Fee checkout form (inside Stripe Elements context) ───────────────────────
type FeeFormState =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

function FeeCheckoutForm({
  intent,
  propertyTitle,
  fees,
  onSubmitted,
  onCancel,
}: {
  intent: FeePaymentInitResponse;
  propertyTitle: string;
  fees: PropertyFeeItem[];
  onSubmitted: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<FeeFormState>({ kind: "idle" });
  const [isCardReady, setIsCardReady] = useState(false);
  const [isCardComplete, setIsCardComplete] = useState(false);

  const canSubmit =
    state.kind !== "processing" &&
    state.kind !== "submitted" &&
    Boolean(stripe && elements) &&
    isCardReady &&
    isCardComplete;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    setState({ kind: "processing" });
    try {
      const result = await stripe.confirmCardPayment(intent.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: "Laugh & Lodge Vendor",
            address: { country: "AE" },
          },
        },
      });
      if (result.error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[vendor-fee-payment] Stripe confirmation failed", {
            type: result.error.type,
            code: result.error.code,
            decline_code: result.error.decline_code,
            message: result.error.message,
            payment_intent: result.error.payment_intent?.id,
          });
        }
        setState({ kind: "error", message: stripeErrorMessage(result.error) });
        return;
      }
      setState({ kind: "submitted" });
      onSubmitted();
    } catch (err: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[vendor-fee-payment] confirmCardPayment threw", err);
      }
      setState({ kind: "error", message: "Unable to complete payment. Please try again." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      {/* Scrollable content */}
      <div className="px-6 py-5 space-y-5">
        {/* Payment summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Payment summary
          </p>
          <p className="mb-3 truncate text-sm font-medium text-slate-800">{propertyTitle}</p>
          <div className="space-y-2">
            {fees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  <FeeTypeLabel type={fee.type} />
                </span>
                <span className="tabular-nums font-semibold text-slate-800">{fee.amountFormatted}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-800">Total due</span>
            <span className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
              {intent.totalFormatted}
            </span>
          </div>
        </div>

        {/* Stripe card element */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Card details
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <LockKeyhole className="h-3 w-3" /> Secured by Stripe
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
            <CardElement
              onReady={() => setIsCardReady(true)}
              onChange={(e) => {
                setIsCardComplete(e.complete);
                if (!e.error && state.kind === "error") {
                  setState({ kind: "idle" });
                }
              }}
              options={{
                style: CARD_ELEMENT_STYLE,
                hidePostalCode: true,
              }}
            />
          </div>
        </div>

        {/* Inline stripe error */}
        {state.kind === "error" && (
          <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.message}</span>
          </div>
        )}

        {/* Success notice */}
        {state.kind === "submitted" && (
          <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span><span className="font-semibold">Payment submitted.</span> Confirming with Stripe — this page will refresh shortly.</span>
          </div>
        )}
      </div>

      {/* Footer — Cancel left, Pay right, always visible */}
      <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-2xl border border-slate-200 px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-11 min-w-[160px] items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            {state.kind === "processing" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : state.kind === "submitted" ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Submitted
              </>
            ) : (
              `Pay ${intent.totalFormatted}`
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-400">
          Card data goes directly to Stripe. Fees confirmed by secure webhook.
        </p>
      </div>
    </form>
  );
}

// ─── Payment modal ────────────────────────────────────────────────────────────
type ModalState =
  | { kind: "closed" }
  | { kind: "initiating" }
  | { kind: "ready"; intent: FeePaymentInitResponse; propertyTitle: string; fees: PropertyFeeItem[] }
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

  const isReady = state.kind === "ready";
  const hasStripe = isReady && Boolean(publishableKey);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
        style={{ maxHeight: "min(90vh, 700px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pay property fee</h2>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{label}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {state.kind === "initiating" && (
            <div className="flex items-center justify-center gap-2.5 py-20 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Preparing secure payment…
            </div>
          )}

          {state.kind === "error" && (
            <div className="px-6 py-6">
              <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/8 px-5 py-4 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{state.message}</span>
              </div>
            </div>
          )}

          {isReady && !publishableKey && (
            <div className="px-6 py-6">
              <div className="rounded-2xl border border-danger/30 bg-danger/8 px-5 py-4 text-sm text-danger">
                Payments are temporarily unavailable. Please contact support.
              </div>
            </div>
          )}

          {hasStripe && (
            <Elements
              stripe={getStripePromise(publishableKey)}
            >
              <FeeCheckoutForm
                intent={state.intent}
                propertyTitle={state.propertyTitle}
                fees={state.fees}
                onSubmitted={() => {
                  setTimeout(() => {
                    onPaid();
                    onClose();
                  }, 2000);
                }}
                onCancel={onClose}
              />
            </Elements>
          )}
        </main>

        {/* ── Footer (non-ready states only) ──────────────────────────── */}
        {!hasStripe && state.kind !== "initiating" && (
          <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="h-11 flex-1 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              {state.kind === "error" && onRetry && (
                <button
                  onClick={onRetry}
                  className="h-11 flex-1 rounded-2xl bg-brand text-sm font-semibold text-white transition hover:bg-brand-hover"
                >
                  Try again
                </button>
              )}
            </div>
          </footer>
        )}

        {state.kind === "initiating" && (
          <footer className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              onClick={onClose}
              className="h-11 w-full rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </footer>
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
    propertyTitle: string,
  ) {
    const feeIds = fees.filter((f) => f.status === "UNPAID").map((f) => f.id);
    if (feeIds.length === 0) return;

    const attempt = async () => {
      setModalLabel(label);
      setModal({ kind: "initiating" });
      try {
        const intent = await initiatePropertyFeePayment(propertyId, feeIds);
        setModal({
          kind: "ready",
          intent,
          propertyTitle,
          fees: fees.filter((f) => f.status === "UNPAID"),
        });
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
                    <div key={entry.propertyId} className="overflow-hidden rounded-3xl border border-line/50 bg-surface shadow-sm">
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
                                  entry.propertyTitle,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
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
                              <td className="px-6 py-3 text-right text-sm font-semibold text-primary tabular-nums">{fee.amountFormatted}</td>
                              <td className="px-6 py-3 text-right"><FeeBadge status={fee.status} /></td>
                              <td className="px-6 py-3 text-right">
                                {fee.status === "UNPAID" ? (
                                  <button
                                    disabled={isInitiating}
                                    onClick={() =>
                                      openPaymentModal(
                                        entry.propertyId,
                                        [fee],
                                        `${fee.type === "ACTIVATION" ? "Activation Fee" : fee.type === "INSURANCE" ? "Property Insurance" : "Furnishing Fee"} — ${entry.propertyTitle}`,
                                        entry.propertyTitle,
                                      )
                                    }
                                    className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand transition hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
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
                            <td className="px-6 py-3 text-right text-sm font-bold text-primary tabular-nums">
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
