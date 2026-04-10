"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Elements } from "@stripe/react-stripe-js";
import {
  loadStripe,
  type StripeElementsOptionsClientSecret,
} from "@stripe/stripe-js";

const stripePromiseCache = new Map<string, ReturnType<typeof loadStripe>>();

function getStripePromise(publishableKey: string) {
  const cached = stripePromiseCache.get(publishableKey);
  if (cached) return cached;
  const created = loadStripe(publishableKey);
  stripePromiseCache.set(publishableKey, created);
  return created;
}

type StripeProviderProps = {
  clientSecret: string;
  publishableKey?: string | null;
  options?: Omit<StripeElementsOptionsClientSecret, "clientSecret">;
  onError?: (message: string) => void;
  children: ReactNode;
};

export default function StripeProvider(props: StripeProviderProps) {
  const envPublishableKey = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim();
  const publishableKey = (props.publishableKey ?? "").trim() || envPublishableKey;
  const normalizedClientSecret = (props.clientSecret ?? "").trim();

  const stripePromise = useMemo(() => {
    if (!publishableKey) return null;
    return getStripePromise(publishableKey);
  }, [publishableKey]);

  // Synchronous validation derived from props — no effect needed
  const validationError: string | null = !normalizedClientSecret
    ? "Stripe client secret is missing."
    : !publishableKey
      ? "Stripe publishable key is missing. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY."
      : !stripePromise
        ? "Stripe failed to initialize."
        : null;

  const [asyncError, setAsyncError] = useState<string | null>(null);

  useEffect(() => {
    if (validationError || !stripePromise) return;
    let active = true;

    stripePromise
      .then((client) => {
        if (!active) return;
        setAsyncError(client ? null : "Stripe failed to initialize. Verify your publishable key.");
      })
      .catch(() => {
        if (!active) return;
        setAsyncError("Stripe failed to load. Please refresh and try again.");
      });

    return () => {
      active = false;
    };
  }, [stripePromise, validationError]);

  const initError = validationError ?? asyncError;
  const { onError } = props;

  useEffect(() => {
    if (initError) onError?.(initError);
  }, [initError, onError]);

  const options: StripeElementsOptionsClientSecret = useMemo(
    () => ({
      ...(props.options ?? {}),
      clientSecret: normalizedClientSecret,
    }),
    [props.options, normalizedClientSecret],
  );

  if (!stripePromise || initError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/12 px-4 py-3 text-xs text-danger">
        {initError ?? "Stripe is unavailable right now."}
      </div>
    );
  }

  return (
    <div className="relative z-20 pointer-events-auto">
      <Elements stripe={stripePromise} options={options}>
        {props.children}
      </Elements>
    </div>
  );
}
