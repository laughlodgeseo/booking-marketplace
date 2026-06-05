"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getHostOnboardingState,
  startHostOnboarding,
  type OnboardingStateResponse,
} from "@/lib/api/portal/onboarding";

// ---------------------------------------------------------------------------
// Motion helpers
// ---------------------------------------------------------------------------
const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase =
  | "loading"
  | "error"
  | "customer-welcome"
  | "vendor-first-time"
  | "vendor-has-draft"
  | "vendor-submitted"
  | "vendor-changes-requested"
  | "vendor-rejected";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrustCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <motion.div variants={FADE_UP} className="flex items-start gap-3 rounded-2xl border border-line/40 bg-surface/60 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-secondary">{desc}</div>
      </div>
    </motion.div>
  );
}

function StepPreviewRow({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-bold text-brand">
        {step}
      </div>
      <span className="text-sm text-secondary">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

function CustomerWelcomeView({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  return (
    <motion.div className="flex min-h-[calc(100dvh-64px)] flex-col" initial="hidden" animate="show" variants={STAGGER}>
      {/* Hero */}
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)),rgb(var(--color-bg-2-rgb)/0.85))] px-5 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_400px_at_50%_-60px,rgb(var(--color-accent-rgb)/0.15),transparent_65%)]" />
        <div className="relative mx-auto max-w-lg">
          <motion.div variants={FADE_UP} className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand">
            <Sparkles className="h-3 w-3" />
            Laugh &amp; Lodge Hosting
          </motion.div>

          <motion.h1 variants={FADE_UP} className="mt-4 text-3xl font-bold leading-tight text-primary sm:text-4xl lg:text-5xl">
            List your Dubai<br />property with us
          </motion.h1>

          <motion.p variants={FADE_UP} className="mt-3 text-base leading-relaxed text-secondary sm:text-lg">
            Create a polished listing, set your calendar and pricing, upload photos, and submit for admin review — all in one guided flow.
          </motion.p>

          <motion.div variants={FADE_UP} className="mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
            <TrustCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Secure bookings"
              desc="Verified payments, guest screening, and secure booking management."
            />
            <TrustCard
              icon={<CheckCircle2 className="h-4 w-4" />}
              title="Admin-reviewed quality"
              desc="Every listing is reviewed before going live so guests trust your property."
            />
            <TrustCard
              icon={<Building2 className="h-4 w-4" />}
              title="Vendor dashboard"
              desc="Manage bookings, calendar, maintenance, and statements in one place."
            />
          </motion.div>
        </div>
      </div>

      {/* Step preview */}
      <div className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-lg">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">What to expect</div>
          <div className="mt-3 space-y-3 rounded-2xl border border-line/40 bg-surface/60 p-4">
            <StepPreviewRow step={1} label="Tell us about your property" />
            <StepPreviewRow step={2} label="Add photos and amenities" />
            <StepPreviewRow step={3} label="Set your pricing and availability" />
            <StepPreviewRow step={4} label="Upload ownership documents" />
            <StepPreviewRow step={5} label="Submit for admin review" />
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted">
            Your listing will be reviewed by our team within 24–48 hours. You can save your progress at any step and return later.
          </p>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 border-t border-line/30 bg-warm-base/95 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-base font-semibold text-accent-text shadow-sm hover:bg-brand-hover disabled:opacity-50 transition sm:w-auto sm:flex-1"
          >
            {starting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Setting up your account…</>
            ) : (
              <>Start your listing <ArrowRight className="h-5 w-5" /></>
            )}
          </button>
          <Link
            href="/owners"
            className="inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-line/60 bg-surface px-4 py-3.5 text-sm font-semibold text-secondary hover:bg-warm-alt transition sm:w-auto"
          >
            Learn how hosting works
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function FirstTimeVendorView() {
  return (
    <motion.div className="flex min-h-[calc(100dvh-64px)] flex-col" initial="hidden" animate="show" variants={STAGGER}>
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)),rgb(var(--color-bg-2-rgb)/0.85))] px-5 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_400px_at_50%_-60px,rgb(var(--color-accent-rgb)/0.15),transparent_65%)]" />
        <div className="relative mx-auto max-w-lg">
          <motion.div variants={FADE_UP} className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand">
            <Star className="h-3 w-3" />
            Welcome to hosting
          </motion.div>

          <motion.h1 variants={FADE_UP} className="mt-4 text-3xl font-bold leading-tight text-primary sm:text-4xl">
            Let&apos;s prepare your<br />first property
          </motion.h1>

          <motion.p variants={FADE_UP} className="mt-3 text-base leading-relaxed text-secondary">
            Create a polished listing, add high-quality photos, set your pricing and availability, and submit for our team to review.
          </motion.p>

          <motion.div variants={FADE_UP} className="mt-6 grid gap-3 sm:grid-cols-2 lg:hidden">
            <TrustCard icon={<ShieldCheck className="h-4 w-4" />} title="Secure bookings" desc="Verified payments and guest management built in." />
            <TrustCard icon={<CheckCircle2 className="h-4 w-4" />} title="Admin-reviewed" desc="Your listing is reviewed before going live to guests." />
            <TrustCard icon={<CalendarCheck className="h-4 w-4" />} title="Full calendar control" desc="Manage availability, block dates, and set advance notice." />
          </motion.div>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-lg">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Your steps</div>
          <div className="mt-3 space-y-3 rounded-2xl border border-line/40 bg-surface/60 p-4">
            <StepPreviewRow step={1} label="Property type and basics" />
            <StepPreviewRow step={2} label="Location and address" />
            <StepPreviewRow step={3} label="Photos and amenities" />
            <StepPreviewRow step={4} label="Pricing and availability" />
            <StepPreviewRow step={5} label="Documents and review" />
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-line/30 bg-warm-base/95 px-5 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-lg flex-col gap-2 sm:flex-row">
          <Link
            href="/vendor/properties/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-base font-semibold text-accent-text shadow-sm hover:bg-brand-hover transition sm:flex-1"
          >
            Start your first listing <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function HasDraftView({ propertyId }: { propertyId: string }) {
  return (
    <motion.div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-5 py-10 sm:px-8" initial="hidden" animate="show" variants={STAGGER}>
      <div className="mx-auto w-full max-w-md">
        <motion.div variants={FADE_UP} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/12 text-warning">
          <Edit3 className="h-7 w-7" />
        </motion.div>
        <motion.h2 variants={FADE_UP} className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
          You have a listing in progress
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Your draft has been saved. Pick up where you left off — all your progress is still there.
        </motion.p>

        <motion.div variants={FADE_UP} className="mt-8 flex flex-col gap-3">
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-base font-semibold text-accent-text shadow-sm hover:bg-brand-hover transition"
          >
            Continue your listing <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/vendor/properties/new"
            className="inline-flex w-full items-center justify-center gap-1 rounded-2xl border border-line/60 bg-surface px-6 py-3.5 text-sm font-semibold text-secondary hover:bg-warm-alt transition"
          >
            Start a new listing
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SubmittedView() {
  return (
    <motion.div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-5 py-10 sm:px-8" initial="hidden" animate="show" variants={STAGGER}>
      <div className="mx-auto w-full max-w-md text-center">
        <motion.div variants={FADE_UP} className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/12 text-brand">
          <Clock className="h-7 w-7" />
        </motion.div>
        <motion.h2 variants={FADE_UP} className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
          Your listing is under review
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Our team typically reviews new listings within 24–48 business hours. We&apos;ll notify you as soon as a decision is made.
        </motion.p>

        <motion.div variants={FADE_UP} className="mt-8 flex flex-col items-center gap-3">
          <Link
            href="/vendor"
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-semibold text-accent-text hover:bg-brand-hover transition"
          >
            Go to vendor dashboard <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ChangesRequestedView({ propertyId }: { propertyId: string }) {
  return (
    <motion.div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-5 py-10 sm:px-8" initial="hidden" animate="show" variants={STAGGER}>
      <div className="mx-auto w-full max-w-md">
        <motion.div variants={FADE_UP} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/12 text-warning">
          <Edit3 className="h-7 w-7" />
        </motion.div>
        <motion.h2 variants={FADE_UP} className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
          Changes requested
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Our review team has requested changes to your listing. Please update it and resubmit for approval.
        </motion.p>

        <motion.div variants={FADE_UP} className="mt-8">
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-base font-semibold text-accent-text shadow-sm hover:bg-brand-hover transition"
          >
            Update your listing <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

function RejectedView({ propertyId }: { propertyId: string }) {
  return (
    <motion.div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center px-5 py-10 sm:px-8" initial="hidden" animate="show" variants={STAGGER}>
      <div className="mx-auto w-full max-w-md">
        <motion.div variants={FADE_UP} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/12 text-danger">
          <XCircle className="h-7 w-7" />
        </motion.div>
        <motion.h2 variants={FADE_UP} className="mt-5 text-2xl font-bold text-primary sm:text-3xl">
          Listing not approved
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Unfortunately, your listing was not approved in its current form. You can review the feedback in your vendor dashboard and update your listing for resubmission.
        </motion.p>

        <motion.div variants={FADE_UP} className="mt-8 flex flex-col gap-3">
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-base font-semibold text-accent-text shadow-sm hover:bg-brand-hover transition"
          >
            Update and resubmit <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/vendor/properties"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-line/60 bg-surface px-6 py-3.5 text-sm font-semibold text-secondary hover:bg-warm-alt transition"
          >
            View all my listings
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Desktop side panel (trust + steps)
// ---------------------------------------------------------------------------
function DesktopSidePanel({ phase }: { phase: Phase }) {
  const showSteps = phase === "customer-welcome" || phase === "vendor-first-time";
  return (
    <aside className="hidden lg:flex lg:w-[340px] lg:flex-shrink-0 lg:flex-col lg:gap-4 lg:py-10 lg:pl-2 lg:pr-4">
      <div className="sticky top-8 space-y-4">
        {/* Trust cards */}
        <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted">Why Laugh &amp; Lodge</div>
          <TrustCard icon={<ShieldCheck className="h-4 w-4" />} title="Secure bookings" desc="Verified payments, guest screening, and secure booking management." />
          <TrustCard icon={<CheckCircle2 className="h-4 w-4" />} title="Admin-reviewed quality" desc="Every listing is reviewed before going live to guests." />
          <TrustCard icon={<CalendarCheck className="h-4 w-4" />} title="Full calendar control" desc="Manage availability, block dates, and set advance notice periods." />
          <TrustCard icon={<Building2 className="h-4 w-4" />} title="Vendor dashboard" desc="Bookings, maintenance, calendar, and financial statements in one place." />
        </motion.div>

        {showSteps && (
          <div className="rounded-2xl border border-line/40 bg-surface/60 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted mb-3">What happens next</div>
            <div className="space-y-3">
              <StepPreviewRow step={1} label="Tell us about your property" />
              <StepPreviewRow step={2} label="Location and address" />
              <StepPreviewRow step={3} label="Photos and amenities" />
              <StepPreviewRow step={4} label="Pricing and availability" />
              <StepPreviewRow step={5} label="Documents and legal" />
              <StepPreviewRow step={6} label="Review and submit" />
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-brand/15 bg-[linear-gradient(135deg,rgba(248,242,232,0.8),rgba(240,232,219,0.6))] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-brand/50 mb-1">Dubai-first platform</div>
          <p className="text-xs text-secondary leading-relaxed">
            Laugh &amp; Lodge is built specifically for the UAE short-term rental market — with Dirhams, Arabic support, and a review process aligned with Dubai regulations.
          </p>
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function VendorOnboardingPage() {
  const { user, status, refresh } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [onboardingState, setOnboardingState] = useState<OnboardingStateResponse | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (status === "loading") return;
    if (status === "anonymous") return; // layout handles redirect

    setPhase("loading");
    try {
      const state = await getHostOnboardingState();
      setOnboardingState(state);

      switch (state.status) {
        case "CUSTOMER":
          setPhase("customer-welcome");
          break;
        case "FIRST_TIME":
          setPhase("vendor-first-time");
          break;
        case "HAS_DRAFT":
          setPhase("vendor-has-draft");
          break;
        case "SUBMITTED":
          setPhase("vendor-submitted");
          break;
        case "CHANGES_REQUESTED":
          setPhase("vendor-changes-requested");
          break;
        case "REJECTED":
          setPhase("vendor-rejected");
          break;
        case "HAS_PROPERTIES":
          router.replace("/vendor/properties");
          return;
      }
    } catch {
      setPhase("error");
    }
  }, [status, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStartOnboarding = useCallback(async () => {
    setStartError(null);
    setStarting(true);
    try {
      await startHostOnboarding(user?.fullName ?? user?.firstName ?? undefined);
      await refresh();
      router.push("/vendor/properties/new");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStarting(false);
    }
  }, [user, refresh, router]);

  const mainContent = useMemo(() => {
    if (phase === "loading") {
      return (
        <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-brand" />
            <div className="text-sm text-muted">Loading your hosting status…</div>
          </div>
        </div>
      );
    }

    if (phase === "error") {
      return (
        <div className="flex min-h-[calc(100dvh-64px)] items-center justify-center px-5">
          <div className="w-full max-w-md rounded-2xl border border-danger/30 bg-danger/8 p-6 text-center">
            <div className="text-sm font-semibold text-primary">Could not load hosting status</div>
            <div className="mt-2 text-sm text-secondary">Please refresh the page to try again.</div>
            <button
              onClick={() => void load()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover transition"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    switch (phase) {
      case "customer-welcome":
        return (
          <>
            {startError && (
              <div className="mx-5 mt-4 rounded-2xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger sm:mx-8">
                {startError}
              </div>
            )}
            <CustomerWelcomeView onStart={() => void handleStartOnboarding()} starting={starting} />
          </>
        );
      case "vendor-first-time":
        return <FirstTimeVendorView />;
      case "vendor-has-draft":
        return <HasDraftView propertyId={onboardingState?.propertyId ?? ""} />;
      case "vendor-submitted":
        return <SubmittedView />;
      case "vendor-changes-requested":
        return <ChangesRequestedView propertyId={onboardingState?.propertyId ?? ""} />;
      case "vendor-rejected":
        return <RejectedView propertyId={onboardingState?.propertyId ?? ""} />;
      default:
        return null;
    }
  }, [phase, startError, starting, onboardingState, handleStartOnboarding, load]);

  return (
    <div className="portal-density min-h-screen overflow-x-clip">
      {/* Soft background gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 portal-shell-bg" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-120px,rgb(var(--color-accent-rgb)/0.16),transparent_62%),radial-gradient(900px_500px_at_12%_12%,rgb(var(--color-accent-rgb)/0.10),transparent_58%)]" />

      {/* Minimal top bar */}
      <header className="sticky top-0 z-50 border-b border-line/30 bg-warm-base/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="text-base font-bold text-primary tracking-tight">
            Laugh &amp; Lodge
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden text-xs text-muted sm:block truncate max-w-[180px]">
                {user.email}
              </span>
            )}
            <Link
              href={user?.role === "VENDOR" ? "/vendor" : "/account"}
              className="rounded-xl border border-line/60 bg-surface px-3.5 py-1.5 text-xs font-semibold text-secondary hover:bg-warm-alt transition"
            >
              {user?.role === "VENDOR" ? "Dashboard" : "My account"}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto flex w-full max-w-[1100px] gap-8 lg:items-start lg:px-8">
        {/* Main */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {mainContent}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Desktop right panel */}
        <DesktopSidePanel phase={phase} />
      </div>
    </div>
  );
}
