"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Lock,
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

  // ── Step 1: Auth content ─────────────────────────────────────────────────────
  function renderStep1() {
    if (authStatus === "loading") {
      return (
        <div className="flex items-center gap-3 py-2 text-sm text-secondary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          Checking your session…
        </div>
      );
    }

    if (authStatus === "authenticated") {
      return (
        <div className="flex items-center gap-3 rounded-2xl bg-success/10 px-4 py-3.5 ring-1 ring-success/25">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.30)]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-primary">Signed in</div>
            <div className="text-xs text-secondary">{user?.email ?? "Authenticated"}</div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Sign in or create an account to complete your booking. Your selected dates are saved.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href={loginHref}
            className="group flex items-center gap-4 rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-5 py-4 ring-1 ring-black/[0.07] transition hover:ring-brand/40 hover:shadow-[0_8px_24px_rgba(79,70,229,0.10)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-[0_4px_14px_rgba(79,70,229,0.28)] transition group-hover:shadow-[0_6px_20px_rgba(79,70,229,0.38)]">
              <LogIn className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-primary">Sign in</div>
              <div className="mt-0.5 text-xs text-secondary">I have an account</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </Link>

          <Link
            href={signupHref}
            className="group flex items-center gap-4 rounded-2xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-5 py-4 ring-1 ring-black/[0.07] transition hover:ring-brand/40 hover:shadow-[0_8px_24px_rgba(79,70,229,0.10)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_14px_rgba(124,58,237,0.28)] transition group-hover:shadow-[0_6px_20px_rgba(124,58,237,0.38)]">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-primary">Create account</div>
              <div className="mt-0.5 text-xs text-secondary">New to Laugh &amp; Lodge</div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
          </Link>
        </div>
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
          Please sign in first to continue to payment.
        </div>
      );
    }

    if (reserveError) {
      const isConflict =
        /progress|in use|active hold|another|conflict/i.test(reserveError);
      const isUnavailable =
        /unavailable|not available|already booked|occupied/i.test(reserveError);

      return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-danger/8 px-5 py-4 ring-1 ring-danger/20">
            <div className="text-sm font-semibold text-danger">
              {isConflict
                ? "Reservation session conflict"
                : isUnavailable
                  ? "Dates unavailable"
                  : "Unable to secure dates"}
            </div>
            <p className="mt-1 text-xs text-danger/80">
              {isConflict
                ? "You may have an active reservation in progress. Wait a moment, then try again — or return to the property and start fresh."
                : isUnavailable
                  ? "These dates are no longer available. Please return to the property and select different dates."
                  : reserveError}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isUnavailable && (
              <button
                onClick={() => { setReserveError(null); void createHold(); }}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
              >
                Try again
              </button>
            )}
            <a
              href={backHref}
              className="inline-flex items-center gap-2 rounded-xl bg-[rgb(var(--color-bg-rgb)/0.7)] px-4 py-2 text-sm font-semibold text-secondary ring-1 ring-black/8 transition hover:text-primary"
            >
              Back to property
            </a>
          </div>
        </div>
      );
    }

    // No hold yet — need to create one
    if (!activeHoldId) {
      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-primary">Reserve your dates</h2>
            <p className="mt-1.5 text-sm text-secondary">
              We&apos;ll temporarily hold your selected dates while you complete payment. You won&apos;t be charged yet.
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
              "inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold shadow-sm transition",
              reserveBusy || !datesValid
                ? "cursor-not-allowed bg-warm-alt text-muted"
                : "bg-brand text-accent-text hover:bg-brand-hover",
            )}
          >
            {reserveBusy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-text/40 border-t-accent-text" />
                Reserving dates…
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Reserve dates &amp; continue
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
      <div className="flex items-start gap-4 rounded-2xl bg-success/10 px-5 py-5 ring-1 ring-success/20">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-success" />
        <div>
          <div className="font-semibold text-primary">You&apos;re all set!</div>
          <p className="mt-1 text-sm text-secondary">
            Your booking is confirmed. Redirecting to your booking details…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-transparent">
        {/* Decorative bg glow */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-40 left-1/4 h-125 w-125 rounded-full bg-linear-to-br from-indigo-500/8 to-violet-500/5 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 h-100 w-100 rounded-full bg-linear-to-tl from-violet-500/6 to-brand/5 blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          {/* Back */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm text-secondary transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            {props.slug ? "Back to property" : "Back to properties"}
          </Link>

          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
            {/* ── LEFT: stacked step cards ── */}
            <div className="space-y-3">

              {/* ─── Card 1: Account ─── */}
              <div className={[
                "overflow-hidden rounded-3xl transition-all duration-300",
                step > 1
                  ? "premium-card-tinted ring-1 ring-success/20 shadow-[0_8px_32px_rgba(11,15,25,0.08)]"
                  : "premium-card premium-card-tinted ring-2 ring-brand/20 shadow-[0_20px_60px_rgba(79,70,229,0.13)]",
              ].join(" ")}>
                {/* Gradient top bar */}
                <div className={[
                  "h-[3px]",
                  step > 1
                    ? "bg-linear-to-r from-emerald-400 to-teal-500"
                    : "bg-linear-to-r from-indigo-500 via-violet-500 to-purple-500",
                ].join(" ")} />
                <div className="flex items-center gap-4 p-6 pb-4">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      step > 1
                        ? "bg-linear-to-br from-emerald-400 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.30)]"
                        : "bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_20px_rgba(79,70,229,0.35)]",
                    ].join(" ")}
                  >
                    {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-bold">1</span>}
                  </div>
                  <span className="text-base font-semibold text-primary">Account</span>
                </div>
                <div className="px-6 pb-6">
                  {renderStep1()}
                </div>
              </div>

              {/* ─── Card 2: Payment ─── */}
              <div className={[
                "overflow-hidden rounded-3xl transition-all duration-300",
                step > 2
                  ? "premium-card-tinted ring-1 ring-success/20 shadow-[0_8px_32px_rgba(11,15,25,0.08)]"
                  : step === 2
                    ? "premium-card premium-card-tinted ring-2 ring-brand/20 shadow-[0_20px_60px_rgba(79,70,229,0.13)]"
                    : "premium-card-tinted opacity-70 ring-1 ring-black/8 shadow-[0_4px_16px_rgba(11,15,25,0.06)]",
              ].join(" ")}>
                {/* Gradient top bar — only when active or done */}
                {step >= 2 && (
                  <div className={[
                    "h-[3px]",
                    step > 2
                      ? "bg-linear-to-r from-emerald-400 to-teal-500"
                      : "bg-linear-to-r from-indigo-500 via-violet-500 to-purple-500",
                  ].join(" ")} />
                )}
                <div className="flex items-center gap-4 p-6 pb-4">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      step > 2
                        ? "bg-linear-to-br from-emerald-400 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.30)]"
                        : step === 2
                          ? "bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-[0_6px_20px_rgba(79,70,229,0.35)]"
                          : "bg-line/30 text-muted",
                    ].join(" ")}
                  >
                    {step > 2 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : step === 2 ? (
                      <CreditCard className="h-4 w-4" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`text-base font-semibold ${step >= 2 ? "text-primary" : "text-muted"}`}>
                    Payment
                  </span>
                </div>
                <div className="px-6 pb-6">
                  {step >= 2 ? renderStep2() : (
                    <p className="text-sm text-muted">Complete the account step to continue.</p>
                  )}
                </div>
              </div>

              {/* ─── Card 3: Confirmation ─── */}
              <div className={[
                "overflow-hidden rounded-3xl transition-all duration-300",
                step === 3
                  ? "premium-card-tinted ring-1 ring-success/20 shadow-[0_8px_32px_rgba(11,15,25,0.08)]"
                  : "premium-card-tinted opacity-70 ring-1 ring-black/8 shadow-[0_4px_16px_rgba(11,15,25,0.06)]",
              ].join(" ")}>
                {step === 3 && (
                  <div className="h-[3px] bg-linear-to-r from-emerald-400 to-teal-500" />
                )}
                <div className={`flex items-center gap-4 p-6 ${step === 3 ? "pb-4" : ""}`}>
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300",
                      step === 3
                        ? "bg-linear-to-br from-emerald-400 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.30)]"
                        : "bg-line/30 text-muted",
                    ].join(" ")}
                  >
                    {step === 3 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-bold">3</span>
                    )}
                  </div>
                  <span className={`text-base font-semibold ${step === 3 ? "text-primary" : "text-muted"}`}>
                    Confirmation
                  </span>
                </div>
                {step === 3 && (
                  <div className="px-6 pb-6">
                    {renderStep3()}
                  </div>
                )}
              </div>

              {/* Security note */}
              <div className="flex items-center justify-center pt-2">
                <div className="flex items-center gap-1.5 rounded-full bg-success/8 px-3.5 py-1.5 ring-1 ring-success/15">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" />
                  <span className="text-xs font-medium text-success/90">Payments secured by Stripe</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: sticky property summary ── */}
            <div className="lg:sticky lg:top-22">
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

      {editModalOpen && (
        <CheckoutEditModal
          propertyId={props.propertyId}
          slug={props.slug}
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
