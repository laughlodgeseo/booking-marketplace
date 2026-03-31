"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LogIn,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { reserveHold } from "@/lib/booking/bookingFlow";
import { CreateBookingCardBatchA } from "@/components/checkout/CreateBookingCardBatchA";
import { CheckoutPropertySummary } from "@/components/checkout/CheckoutPropertySummary";
import { CheckoutEditModal } from "@/components/checkout/CheckoutEditModal";

type Step = 1 | 2 | 3;

type CheckoutPageClientProps = {
  propertyId: string;
  holdId: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  slug: string;
};

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function safeGuests(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 20) : 2;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(d: string) {
  return ISO_RE.test(d);
}

export function CheckoutPageClient(props: CheckoutPageClientProps) {
  const router = useRouter();
  const { status: authStatus, user } = useAuth();

  // ── Core state ───────────────────────────────────────────────────────────────
  const [checkIn, setCheckIn] = useState(props.checkIn);
  const [checkOut, setCheckOut] = useState(props.checkOut);
  const [guests, setGuests] = useState(safeGuests(props.guests));
  const [activeHoldId, setActiveHoldId] = useState(props.holdId || "");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reserveError, setReserveError] = useState<string | null>(null);
  const [reserveBusy, setReserveBusy] = useState(false);

  // ── Step management ──────────────────────────────────────────────────────────
  // Step 1 = auth, Step 2 = payment, Step 3 = confirmed (inside PendingPaymentCard)
  const [step, setStep] = useState<Step>(1);
  const autoAdvancedRef = useRef(false);

  useEffect(() => {
    if (authStatus === "authenticated" && !autoAdvancedRef.current) {
      autoAdvancedRef.current = true;
      setStep(2);
    }
    if (authStatus === "anonymous") {
      autoAdvancedRef.current = false;
      setStep(1);
    }
  }, [authStatus]);

  // ── Auth redirect URLs ───────────────────────────────────────────────────────
  const checkoutUrl = useMemo(() => {
    const qp = new URLSearchParams();
    qp.set("propertyId", props.propertyId);
    if (activeHoldId) qp.set("holdId", activeHoldId);
    qp.set("checkIn", checkIn);
    qp.set("checkOut", checkOut);
    qp.set("guests", String(guests));
    if (props.slug) qp.set("slug", props.slug);
    return `/checkout?${qp.toString()}`;
  }, [props.propertyId, props.slug, activeHoldId, checkIn, checkOut, guests]);

  const loginHref = useMemo(() => {
    const qp = new URLSearchParams({ role: "customer", next: checkoutUrl });
    return `/login?${qp.toString()}`;
  }, [checkoutUrl]);

  const signupHref = useMemo(() => {
    const qp = new URLSearchParams({ role: "customer", next: checkoutUrl });
    return `/signup?${qp.toString()}`;
  }, [checkoutUrl]);

  const backHref = props.slug ? `/properties/${props.slug}` : "/properties";

  // ── Hold creation (for users arriving without a holdId after auth) ────────────
  const createHold = useCallback(async () => {
    if (!props.propertyId || !isValidDate(checkIn) || !isValidDate(checkOut)) return;
    setReserveError(null);
    setReserveBusy(true);
    try {
      const result = await reserveHold(props.propertyId, {
        checkIn,
        checkOut,
        guests,
      });
      setActiveHoldId(result.holdId);
      // Update URL without reload
      const qp = new URLSearchParams();
      qp.set("propertyId", props.propertyId);
      qp.set("holdId", result.holdId);
      qp.set("checkIn", checkIn);
      qp.set("checkOut", checkOut);
      qp.set("guests", String(guests));
      if (props.slug) qp.set("slug", props.slug);
      router.replace(`/checkout?${qp.toString()}`);
    } catch (e) {
      setReserveError(e instanceof Error ? e.message : "Failed to secure dates. Please try again.");
    } finally {
      setReserveBusy(false);
    }
  }, [props.propertyId, props.slug, checkIn, checkOut, guests, router]);

  // ── Inline edit handler ──────────────────────────────────────────────────────
  const handleEditConfirm = useCallback(
    async (data: { checkIn: string; checkOut: string; guests: number }) => {
      setCheckIn(data.checkIn);
      setCheckOut(data.checkOut);
      setGuests(data.guests);

      // If we already have a hold (step 2), create a new one with the new dates
      if (step === 2 && authStatus === "authenticated") {
        setReserveBusy(true);
        setReserveError(null);
        try {
          const result = await reserveHold(props.propertyId, {
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            guests: data.guests,
          });
          setActiveHoldId(result.holdId);
          const qp = new URLSearchParams();
          qp.set("propertyId", props.propertyId);
          qp.set("holdId", result.holdId);
          qp.set("checkIn", data.checkIn);
          qp.set("checkOut", data.checkOut);
          qp.set("guests", String(data.guests));
          if (props.slug) qp.set("slug", props.slug);
          router.replace(`/checkout?${qp.toString()}`);
        } catch (e) {
          setReserveError(e instanceof Error ? e.message : "Failed to update dates.");
        } finally {
          setReserveBusy(false);
        }
      } else {
        // Not yet in payment step — just clear any stale holdId
        setActiveHoldId("");
        const qp = new URLSearchParams();
        qp.set("propertyId", props.propertyId);
        qp.set("checkIn", data.checkIn);
        qp.set("checkOut", data.checkOut);
        qp.set("guests", String(data.guests));
        if (props.slug) qp.set("slug", props.slug);
        router.replace(`/checkout?${qp.toString()}`);
      }
    },
    [step, authStatus, props.propertyId, props.slug, router],
  );

  // ── Early exit: required params missing ──────────────────────────────────────
  if (!props.propertyId) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <p className="text-secondary">No property selected.</p>
          <Link href="/properties" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Browse properties
          </Link>
        </div>
      </main>
    );
  }

  const datesValid = isValidDate(checkIn) && isValidDate(checkOut);
  const nights = datesValid
    ? Math.max(
        1,
        Math.round(
          (new Date(`${checkOut}T00:00:00Z`).getTime() -
            new Date(`${checkIn}T00:00:00Z`).getTime()) /
            86_400_000,
        ),
      )
    : null;

  // ── Step 1: Auth content ─────────────────────────────────────────────────────
  function renderStep1() {
    if (authStatus === "loading") {
      return (
        <div className="flex items-center gap-3 py-8 text-sm text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Checking your session…
        </div>
      );
    }

    if (authStatus === "authenticated") {
      return (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/8 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <div>
            <div className="text-sm font-semibold text-primary">You&apos;re signed in</div>
            <div className="text-xs text-secondary">{user?.email ?? "Authenticated"}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-primary">Sign in to continue</h2>
          <p className="mt-1.5 text-sm text-secondary">
            You&apos;ll need an account to complete your booking. Your selected dates and guests are saved.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={loginHref}
            className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand/15">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-primary">Sign in</div>
              <div className="mt-0.5 text-sm text-secondary">I already have an account</div>
            </div>
          </Link>

          <Link
            href={signupHref}
            className="group flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm transition hover:border-brand hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand/15">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-primary">Create account</div>
              <div className="mt-0.5 text-sm text-secondary">New to RentProperty</div>
            </div>
          </Link>
        </div>

        <p className="text-xs text-muted">
          After signing in or creating an account you&apos;ll automatically return here to complete your booking.
        </p>
      </div>
    );
  }

  // ── Step 2: Payment content ──────────────────────────────────────────────────
  function renderStep2() {
    if (authStatus === "loading") {
      return (
        <div className="flex items-center gap-3 py-8 text-sm text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Loading…
        </div>
      );
    }

    if (authStatus !== "authenticated") {
      return (
        <div className="rounded-2xl border border-line bg-warm-alt px-5 py-4 text-sm text-secondary">
          Complete sign in first to proceed to payment.
        </div>
      );
    }

    if (reserveError) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-danger/30 bg-danger/8 px-5 py-4 text-sm text-danger">
            {reserveError}
          </div>
          <button
            onClick={() => { setReserveError(null); void createHold(); }}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
          >
            Try again
          </button>
        </div>
      );
    }

    // No hold yet — need to create one
    if (!activeHoldId) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-primary">Secure your dates</h2>
            <p className="mt-1.5 text-sm text-secondary">
              We&apos;ll place a temporary hold on your selected dates while you complete payment. You won&apos;t be charged yet.
            </p>
          </div>

          {!datesValid && (
            <div className="rounded-xl border border-warning/30 bg-warning/8 px-4 py-3 text-sm text-warning">
              Please select valid check-in and check-out dates before continuing.
            </div>
          )}

          <button
            onClick={() => void createHold()}
            disabled={reserveBusy || !datesValid}
            className={classNames(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition",
              reserveBusy || !datesValid
                ? "cursor-not-allowed bg-warm-alt text-muted"
                : "bg-brand text-accent-text hover:bg-brand-hover",
            )}
          >
            {reserveBusy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-text/40 border-t-accent-text" />
                Securing dates…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Hold dates &amp; continue to payment
              </>
            )}
          </button>
        </div>
      );
    }

    // Hold exists — show booking card
    return (
      <CreateBookingCardBatchA
        key={activeHoldId}
        propertyId={props.propertyId}
        holdId={activeHoldId}
        guests={guests}
      />
    );
  }

  // ── Step 3: Informational (PendingPaymentCard handles actual confirmation + redirect) ──
  function renderStep3() {
    return (
      <div className="rounded-2xl border border-line bg-warm-alt px-5 py-5 text-sm text-secondary">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <span className="font-semibold text-primary">Booking confirmed</span>
        </div>
        <p className="mt-2">
          Your booking has been confirmed via Stripe webhook verification. You&apos;ll be redirected to your booking details.
        </p>
      </div>
    );
  }

  const steps: Array<{ id: Step; label: string; icon: React.ReactNode }> = [
    { id: 1, label: "Sign in", icon: <LogIn className="h-4 w-4" /> },
    { id: 2, label: "Payment", icon: <CreditCard className="h-4 w-4" /> },
    { id: 3, label: "Confirmed", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <>
      <main className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-secondary transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {props.slug ? "Back to property" : "Back to properties"}
          </Link>

          <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
            {/* ── LEFT: Step flow ─────────────────────────────────────────── */}
            <div className="min-w-0">
              {/* Page title */}
              <div className="mb-6">
                <h1 className="text-3xl font-semibold tracking-tight text-primary">Checkout</h1>
                {datesValid && nights !== null && (
                  <p className="mt-1 text-sm text-secondary">
                    {nights} night{nights !== 1 ? "s" : ""} &middot; {guests} guest{guests !== 1 ? "s" : ""}
                  </p>
                )}
              </div>

              {/* Step indicator */}
              <div className="mb-8">
                <div className="flex items-center gap-0">
                  {steps.map((s, idx) => {
                    const done = step > s.id;
                    const active = step === s.id;
                    return (
                      <div key={s.id} className="flex flex-1 items-center last:flex-none">
                        {/* Step bubble */}
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={classNames(
                              "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                              done
                                ? "border-success bg-success text-white"
                                : active
                                  ? "border-brand bg-brand text-accent-text shadow-md shadow-brand/20"
                                  : "border-line bg-surface text-muted",
                            )}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4" /> : s.icon}
                          </div>
                          <span
                            className={classNames(
                              "text-xs font-medium",
                              done ? "text-success" : active ? "text-primary" : "text-muted",
                            )}
                          >
                            {s.label}
                          </span>
                        </div>

                        {/* Connector line */}
                        {idx < steps.length - 1 && (
                          <div
                            className={classNames(
                              "mx-2 mb-5 h-0.5 flex-1 rounded-full transition-all duration-500",
                              done ? "bg-success" : "bg-line",
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step content card */}
              <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
              </div>

              {/* Security note */}
              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Secured by Stripe. Your payment details are encrypted end-to-end.
              </div>
            </div>

            {/* ── RIGHT: Sticky property summary ──────────────────────────── */}
            <div className="lg:sticky lg:top-24">
              <CheckoutPropertySummary
                slug={props.slug}
                propertyId={props.propertyId}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                onEdit={() => setEditModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Inline edit modal */}
      {editModalOpen && (
        <CheckoutEditModal
          propertyId={props.propertyId}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={guests}
          onClose={() => setEditModalOpen(false)}
          onConfirm={async (data) => {
            setEditModalOpen(false);
            await handleEditConfirm(data);
          }}
        />
      )}
    </>
  );
}
