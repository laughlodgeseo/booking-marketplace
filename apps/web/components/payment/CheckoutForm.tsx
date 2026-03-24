"use client";

import { useMemo, useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type PaymentActionState =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

type CheckoutFormProps = {
  clientSecret: string;
  bookingId: string;
  totalText: string;
  disabled?: boolean;
  isTestMode?: boolean;
  onSubmitted?: () => void;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function CheckoutForm(props: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [state, setState] = useState<PaymentActionState>({ kind: "idle" });
  const [cardholderName, setCardholderName] = useState("");
  const [isElementReady, setIsElementReady] = useState(false);

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
    Boolean(stripe && elements) &&
    isElementReady;

  const paymentElementOptions = useMemo(
    () => ({
      layout: "tabs" as const,
      fields: {
        billingDetails: {
          name: "never" as const,
        },
      },
    }),
    [],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) {
      setState({ kind: "error", message: "Stripe is still loading. Please wait a moment." });
      return;
    }

    if (!isElementReady) {
      setState({ kind: "error", message: "Payment form is unavailable. Please refresh." });
      return;
    }

    setState({ kind: "processing" });

    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          ...(returnUrl ? { return_url: returnUrl } : {}),
          payment_method_data: {
            billing_details: {
              name: cardholderName.trim() || undefined,
            },
          },
        },
      });

      if (result.error) {
        console.error("❌ Stripe confirmPayment error:", {
          code: result.error.code,
          declineCode: result.error.decline_code,
          type: result.error.type,
          message: result.error.message,
        });
        setState({ kind: "error", message: result.error.message ?? "Payment failed." });
        return;
      }

      const intent = result.paymentIntent;
      if (!intent) {
        setState({ kind: "error", message: "Payment confirmation failed." });
        return;
      }

      if (intent.status === "requires_payment_method") {
        setState({ kind: "error", message: "Payment was not authorized. Try another card." });
        return;
      }

      if (intent.status === "canceled") {
        setState({ kind: "error", message: "Payment was canceled. Please try again." });
        return;
      }

      setState({ kind: "submitted" });
      props.onSubmitted?.();
    } catch (error) {
      console.error("❌ Stripe confirmPayment threw unexpectedly:", error);
      setState({
        kind: "error",
        message: "Unable to complete payment confirmation. Please try again.",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-line/80 bg-white/80 p-4 shadow-sm">
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

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-xs font-semibold text-secondary" htmlFor="cardholderName">
            Cardholder name
            <input
              id="cardholderName"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Full name"
              autoComplete="cc-name"
              className="h-11 rounded-xl border border-line/80 bg-white px-3 text-sm text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>

          <div className="relative z-20 rounded-xl border border-line/80 bg-white px-3 py-3 shadow-[inset_0_1px_0_rgba(15,23,42,0.03)] transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/25">
            <PaymentElement
              options={paymentElementOptions}
              onReady={() => setIsElementReady(true)}
              onChange={(event) => {
                const maybeError = (event as { error?: { message?: string } }).error;
                if (maybeError?.message) {
                  setState({ kind: "error", message: maybeError.message });
                  return;
                }
                setState((prev) => (prev.kind === "error" ? { kind: "idle" } : prev));
              }}
            />
          </div>
        </div>
      </div>

      {state.kind === "error" ? (
        <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
          <span className="font-semibold">Payment error:</span> {state.message}
        </div>
      ) : null}

      {state.kind === "submitted" ? (
        <div className="rounded-xl border border-success/30 bg-success/12 px-4 py-3 text-xs text-success">
          <span className="font-semibold">Payment submitted.</span> We are verifying it with Stripe.
        </div>
      ) : null}

      {props.isTestMode ? (
        <div className="rounded-xl border border-line/80 bg-surface/70 px-4 py-3 text-[11px] text-secondary">
          Test cards:
          <div className="mt-2 space-y-1 text-[11px]">
            <div>
              <span className="font-semibold">Success</span>: 4242 4242 4242 4242, any future date, any CVC
            </div>
            <div>
              <span className="font-semibold">Declined</span>: 4000 0000 0000 0002
            </div>
          </div>
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
        {state.kind === "processing" ? "Processing..." : state.kind === "submitted" ? "Submitted" : "Pay now"}
      </button>

      <div className="text-[11px] text-secondary">
        Card data goes directly to Stripe. Booking is confirmed only by backend webhook verification.
      </div>
    </form>
  );
}
