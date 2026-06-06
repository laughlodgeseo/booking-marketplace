"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  Landmark,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
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
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const FADE_IN: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
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
// Design atoms
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
    <motion.div
      variants={FADE_UP}
      className="premium-card premium-card-hover flex items-start gap-3.5 rounded-2xl p-4"
    >
      <div className="card-icon-plate h-10 w-10 shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-secondary">{desc}</div>
      </div>
    </motion.div>
  );
}

function StepRow({ step, label, sublabel }: { step: number; label: string; sublabel?: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-accent-rgb)/0.12)] text-xs font-bold text-[rgb(var(--color-accent-rgb))]">
        {step}
      </div>
      <div className="min-w-0 pt-0.5">
        <div className="text-sm font-semibold text-primary">{label}</div>
        {sublabel && (
          <div className="mt-0.5 text-xs text-secondary">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2 py-3 text-center sm:px-4">
      <div className="text-2xl font-bold tracking-tight text-white drop-shadow-sm sm:text-3xl">
        {value}
      </div>
      <div className="mt-0.5 text-xs font-medium text-white/78">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero section — dark indigo gradient
// ---------------------------------------------------------------------------
function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-hero-shell relative overflow-hidden px-5 py-12 sm:px-8 sm:py-16">
      {/* Subtle grid overlay */}
      <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-40" />
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
      <div className="relative mx-auto max-w-lg">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CustomerWelcomeView
// ---------------------------------------------------------------------------
function CustomerWelcomeView({
  onStart,
  starting,
}: {
  onStart: () => void;
  starting: boolean;
}) {
  return (
    <motion.div
      className="flex min-h-[calc(100dvh-56px)] flex-col"
      initial="hidden"
      animate="show"
      variants={STAGGER}
    >
      {/* Dark hero */}
      <HeroShell>
        <motion.div
          variants={FADE_UP}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90"
        >
          <Star className="h-3 w-3 fill-[rgb(var(--color-gold-rgb))] text-[rgb(var(--color-gold-rgb))]" />
          Laugh &amp; Lodge Hosting
        </motion.div>

        <motion.h1
          variants={FADE_UP}
          className="mt-4 font-heading text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
        >
          List your Dubai<br />property with confidence
        </motion.h1>

        <motion.p
          variants={FADE_UP}
          className="mt-3 text-base leading-relaxed text-white/72 sm:text-lg"
        >
          Professional listings, admin-reviewed quality, and a full host
          dashboard — built for the UAE short-term rental market.
        </motion.p>

        {/* Platform stats */}
        <motion.div
          variants={FADE_UP}
          className="mt-7 overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_32px_rgba(30,27,75,0.18)] backdrop-blur-sm"
        >
          <div className="grid grid-cols-3 divide-x divide-white/10">
            <StatPill value="AED" label="Native currency" />
            <StatPill value="24h" label="Avg. review time" />
            <StatPill value="8" label="Steps to listing" />
          </div>
        </motion.div>

        {/* CTA — desktop/tablet (inside hero, glass style) */}
        <motion.div
          variants={FADE_UP}
          className="mt-7 hidden items-center gap-3 md:flex"
        >
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 disabled:opacity-50"
          >
            {starting ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Setting up your account…</>
            ) : (
              <>Start your listing <ArrowRight className="h-5 w-5" /></>
            )}
          </button>
          <Link
            href="/owners"
            className="inline-flex items-center gap-1 rounded-2xl border border-white/25 bg-white/15 px-5 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/22"
          >
            How hosting works
          </Link>
        </motion.div>
      </HeroShell>

      {/* Trust cards — below hero on mobile/tablet; on desktop the side panel covers this */}
      <div className="px-5 pt-6 sm:px-8 lg:hidden">
        <div className="mx-auto max-w-lg">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted-rgb))]">
            Why Laugh &amp; Lodge
          </div>
          <motion.div
            variants={STAGGER}
            initial="hidden"
            animate="show"
            className="mt-3 grid gap-3 sm:grid-cols-2"
          >
            <TrustCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Secure bookings"
              desc="Verified payments, guest screening, and dispute protection."
            />
            <TrustCard
              icon={<BadgeCheck className="h-4 w-4" />}
              title="Admin-reviewed quality"
              desc="Every listing is reviewed before going live to guests."
            />
            <TrustCard
              icon={<Building2 className="h-4 w-4" />}
              title="Vendor dashboard"
              desc="Bookings, calendar, maintenance, and statements in one place."
            />
            <TrustCard
              icon={<Landmark className="h-4 w-4" />}
              title="UAE-first platform"
              desc="Built for Dubai regulations, permits, and Arabic-speaking guests."
            />
          </motion.div>
        </div>
      </div>

      {/* Step preview */}
      {/* pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] reserves space above the mobile sticky CTA */}
      <div className="px-5 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 md:pb-10">
        <div className="mx-auto max-w-lg">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted-rgb))]">
            What to expect
          </div>
          <motion.div
            variants={FADE_UP}
            className="premium-card mt-3 space-y-4 rounded-2xl p-5"
          >
            <StepRow step={1} label="Property basics" sublabel="Type, beds, baths, and title" />
            <div className="portal-divider" />
            <StepRow step={2} label="Location" sublabel="Address, map pin, and neighbourhood" />
            <div className="portal-divider" />
            <StepRow step={3} label="Photos & amenities" sublabel="At least 5 high-quality photos" />
            <div className="portal-divider" />
            <StepRow step={4} label="Pricing & availability" sublabel="Nightly rate, min stay, and calendar" />
            <div className="portal-divider" />
            <StepRow step={5} label="Ownership documents" sublabel="Title deed, permit, host ID" />
            <div className="portal-divider" />
            <StepRow step={6} label="Review & submit" sublabel="Admin review within 24–48 hours" />
          </motion.div>

          <motion.p variants={FADE_UP} className="mt-3 text-xs leading-relaxed text-[rgb(var(--text-muted-rgb))]">
            You can save your progress at any step and return later. Listings require admin approval before going live.
          </motion.p>
        </div>
      </div>

      {/* Sticky CTA — mobile/tablet only; desktop sees CTA inside the hero above */}
      <div className="sticky bottom-0 border-t border-[rgb(var(--line-rgb)/0.12)] bg-[rgb(var(--color-bg-rgb)/0.95)] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md sm:px-8 md:hidden">
        <div className="mx-auto flex max-w-lg flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="site-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition sm:flex-1"
          >
            {starting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting up your account…
              </>
            ) : (
              <>
                Start your listing
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
          <Link
            href="/owners"
            className="site-cta-muted inline-flex w-full items-center justify-center gap-1 rounded-2xl px-5 py-3.5 text-sm font-semibold transition sm:w-auto"
          >
            How hosting works
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// FirstTimeVendorView
// ---------------------------------------------------------------------------
function FirstTimeVendorView() {
  return (
    <motion.div
      className="flex flex-col"
      initial="hidden"
      animate="show"
      variants={STAGGER}
    >
      <HeroShell>
        <motion.div
          variants={FADE_UP}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90"
        >
          <Sparkles className="h-3 w-3 text-[rgb(var(--color-gold-rgb))]" />
          Welcome to hosting
        </motion.div>

        <motion.h1
          variants={FADE_UP}
          className="mt-4 font-heading text-3xl font-semibold leading-tight text-white sm:text-4xl"
        >
          Let&apos;s prepare your<br />first property
        </motion.h1>

        <motion.p
          variants={FADE_UP}
          className="mt-3 text-base leading-relaxed text-white/75"
        >
          Your host account is ready. Create your first listing and our team will
          review it within 24–48 hours before it goes live.
        </motion.p>

        {/* Desktop CTA — inside hero */}
        <motion.div variants={FADE_UP} className="mt-6 hidden md:block">
          <Link
            href="/vendor/properties/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            Start your first listing
            <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </HeroShell>

      <div className="px-5 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:px-8 md:pb-10">
        <div className="mx-auto max-w-lg space-y-4">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted-rgb))]">
            Your steps
          </div>
          <motion.div
            variants={FADE_UP}
            className="premium-card space-y-4 rounded-2xl p-5"
          >
            <StepRow step={1} label="Property type and basics" />
            <div className="portal-divider" />
            <StepRow step={2} label="Location and address" />
            <div className="portal-divider" />
            <StepRow step={3} label="Photos and amenities" />
            <div className="portal-divider" />
            <StepRow step={4} label="Pricing and availability" />
            <div className="portal-divider" />
            <StepRow step={5} label="Documents and legal" />
            <div className="portal-divider" />
            <StepRow step={6} label="Review and submit" />
          </motion.div>

          <motion.div
            variants={FADE_UP}
            className="premium-card-tinted rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              <div className="card-icon-plate h-9 w-9 shrink-0">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-primary">Save anytime</div>
                <div className="mt-0.5 text-xs leading-relaxed text-secondary">
                  Progress is saved at each step. Come back and continue whenever you&apos;re ready.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sticky CTA — mobile/tablet only */}
      <div className="sticky bottom-0 border-t border-[rgb(var(--line-rgb)/0.12)] bg-[rgb(var(--color-bg-rgb)/0.95)] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md sm:px-8 md:hidden">
        <div className="mx-auto max-w-lg">
          <Link
            href="/vendor/properties/new"
            className="site-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition"
          >
            Start your first listing
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// HasDraftView
// ---------------------------------------------------------------------------
function HasDraftView({ propertyId }: { propertyId: string }) {
  return (
    <motion.div
      className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-5 py-12 sm:px-8"
      initial="hidden"
      animate="show"
      variants={STAGGER}
    >
      <div className="mx-auto w-full max-w-md">
        <motion.div
          variants={FADE_UP}
          className="card-icon-plate h-16 w-16"
        >
          <Edit3 className="h-7 w-7" />
        </motion.div>

        <motion.h2
          variants={FADE_UP}
          className="mt-5 font-heading text-2xl font-semibold text-primary sm:text-3xl"
        >
          Listing in progress
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Your draft has been saved. All your progress is still there — pick up right where you left off.
        </motion.p>

        <motion.div variants={FADE_UP} className="mt-6 premium-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--color-warning-rgb))]" />
            <span className="text-sm font-medium text-primary">Status: Draft saved</span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-secondary">
            Complete all steps and submit for admin review. Your listing won&apos;t be visible to guests until approved.
          </p>
        </motion.div>

        <motion.div variants={FADE_UP} className="mt-5 flex flex-col gap-3">
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="site-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition"
          >
            Continue your listing
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/vendor/properties/new"
            className="site-cta-muted inline-flex w-full items-center justify-center gap-1 rounded-2xl px-6 py-3.5 text-sm font-semibold transition"
          >
            Start a new listing instead
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SubmittedView
// ---------------------------------------------------------------------------
function SubmittedView() {
  return (
    <motion.div
      className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-5 py-12 sm:px-8"
      initial="hidden"
      animate="show"
      variants={STAGGER}
    >
      <div className="mx-auto w-full max-w-md text-center">
        <motion.div
          variants={FADE_UP}
          className="card-icon-plate mx-auto h-16 w-16"
        >
          <Clock className="h-7 w-7" />
        </motion.div>

        <motion.h2
          variants={FADE_UP}
          className="mt-5 font-heading text-2xl font-semibold text-primary sm:text-3xl"
        >
          Under review
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Our team reviews new listings within 24–48 business hours. We&apos;ll notify you as soon as a decision is made.
        </motion.p>

        <motion.div
          variants={FADE_UP}
          className="premium-card mt-6 rounded-2xl p-5 text-left"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[rgb(var(--color-success-rgb))]" />
              <span className="text-sm text-primary">Listing submitted</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 shrink-0 text-[rgb(var(--color-accent-rgb))]" />
              <span className="text-sm text-primary">Admin review in progress</span>
            </div>
            <div className="flex items-center gap-3 opacity-40">
              <TrendingUp className="h-4 w-4 shrink-0 text-[rgb(var(--text-muted-rgb))]" />
              <span className="text-sm text-secondary">Live — visible to guests</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={FADE_UP} className="mt-6">
          <Link
            href="/vendor"
            className="site-cta-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition"
          >
            Go to vendor dashboard
            <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// ChangesRequestedView
// ---------------------------------------------------------------------------
function ChangesRequestedView({ propertyId }: { propertyId: string }) {
  return (
    <motion.div
      className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-5 py-12 sm:px-8"
      initial="hidden"
      animate="show"
      variants={STAGGER}
    >
      <div className="mx-auto w-full max-w-md">
        <motion.div
          variants={FADE_UP}
          className="card-icon-plate h-16 w-16"
          style={{ background: "rgb(var(--color-warning-rgb)/0.14)", borderColor: "rgb(var(--color-warning-rgb)/0.30)", color: "rgb(var(--color-warning-rgb))" } as React.CSSProperties}
        >
          <Edit3 className="h-7 w-7" />
        </motion.div>

        <motion.h2
          variants={FADE_UP}
          className="mt-5 font-heading text-2xl font-semibold text-primary sm:text-3xl"
        >
          Changes requested
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Our review team has requested changes to your listing. Review the feedback, update your listing, and resubmit for approval.
        </motion.p>

        <motion.div
          variants={FADE_UP}
          className="mt-6 rounded-2xl border border-[rgb(var(--color-warning-rgb)/0.22)] bg-[rgb(var(--color-warning-rgb)/0.06)] p-4"
        >
          <div className="flex items-start gap-2.5">
            <Edit3 className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-warning-rgb))]" />
            <p className="text-sm text-primary">
              Check your vendor dashboard for the admin&apos;s feedback on what needs to be updated before your listing can go live.
            </p>
          </div>
        </motion.div>

        <motion.div variants={FADE_UP} className="mt-6">
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="site-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition"
          >
            Update your listing
            <ArrowRight className="h-5 w-5" />
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// RejectedView
// ---------------------------------------------------------------------------
function RejectedView({ propertyId }: { propertyId: string }) {
  return (
    <motion.div
      className="flex min-h-[calc(100dvh-56px)] flex-col items-center justify-center px-5 py-12 sm:px-8"
      initial="hidden"
      animate="show"
      variants={STAGGER}
    >
      <div className="mx-auto w-full max-w-md">
        <motion.div
          variants={FADE_UP}
          className="card-icon-plate h-16 w-16"
          style={{ background: "rgb(var(--color-danger-rgb)/0.12)", borderColor: "rgb(var(--color-danger-rgb)/0.28)", color: "rgb(var(--color-danger-rgb))" } as React.CSSProperties}
        >
          <XCircle className="h-7 w-7" />
        </motion.div>

        <motion.h2
          variants={FADE_UP}
          className="mt-5 font-heading text-2xl font-semibold text-primary sm:text-3xl"
        >
          Listing not approved
        </motion.h2>
        <motion.p variants={FADE_UP} className="mt-2 text-base text-secondary">
          Your listing was not approved in its current form. Review the admin feedback in your dashboard, make the necessary updates, and resubmit.
        </motion.p>

        <motion.div variants={FADE_UP} className="mt-6 flex flex-col gap-3">
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="site-cta-primary inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition"
          >
            Update and resubmit
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/vendor/properties"
            className="site-cta-muted inline-flex w-full items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold transition"
          >
            View all my listings
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Desktop side panel
// ---------------------------------------------------------------------------
function DesktopSidePanel({ phase }: { phase: Phase }) {
  const showSteps = phase === "customer-welcome" || phase === "vendor-first-time";

  return (
    <aside className="hidden lg:flex lg:w-[320px] lg:shrink-0 lg:flex-col lg:py-10">
      <div className="sticky top-8 space-y-4">
        {/* Trust cards */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={STAGGER}
          className="space-y-3"
        >
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted-rgb))]">
            Why Laugh &amp; Lodge
          </div>
          <TrustCard
            icon={<ShieldCheck className="h-4 w-4" />}
            title="Secure bookings"
            desc="Verified payments, guest screening, and dispute protection."
          />
          <TrustCard
            icon={<BadgeCheck className="h-4 w-4" />}
            title="Admin-reviewed quality"
            desc="Every listing reviewed before going live to guests."
          />
          <TrustCard
            icon={<CalendarCheck className="h-4 w-4" />}
            title="Full calendar control"
            desc="Manage availability, block dates, and set advance notice."
          />
          <TrustCard
            icon={<Landmark className="h-4 w-4" />}
            title="UAE-first platform"
            desc="Built for Dubai regulations, AED pricing, and Arabic guests."
          />
        </motion.div>

        {/* Step preview */}
        {showSteps && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={FADE_IN}
            className="premium-card-dark rounded-2xl p-5"
          >
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted-rgb))] mb-3">
              Listing steps
            </div>
            <div className="space-y-3.5">
              <StepRow step={1} label="Property basics" />
              <StepRow step={2} label="Location" />
              <StepRow step={3} label="Photos & amenities" />
              <StepRow step={4} label="Pricing & availability" />
              <StepRow step={5} label="Documents" />
              <StepRow step={6} label="Review & submit" />
            </div>
          </motion.div>
        )}

        {/* Dubai market note */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={FADE_IN}
          className="rounded-2xl border border-[rgb(var(--color-gold-rgb)/0.22)] bg-[rgb(var(--color-gold-rgb)/0.05)] p-4"
        >
          <div className="flex items-start gap-2.5">
            <Star className="mt-0.5 h-4 w-4 shrink-0 fill-[rgb(var(--color-gold-rgb))] text-[rgb(var(--color-gold-rgb))]" />
            <div>
              <div className="text-xs font-semibold text-primary">Dubai-first platform</div>
              <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                Dirham pricing, Arabic support, and a review process aligned with DTCM holiday home permit requirements.
              </p>
            </div>
          </div>
        </motion.div>
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
  const [onboardingState, setOnboardingState] =
    useState<OnboardingStateResponse | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    if (status === "loading") return;
    if (status === "anonymous") return;

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
      await startHostOnboarding(user?.fullName ?? undefined);
      await refresh();
      router.push("/vendor/properties/new");
    } catch (err) {
      setStartError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setStarting(false);
    }
  }, [user, refresh, router]);

  const mainContent = useMemo(() => {
    if (phase === "loading") {
      return (
        <div className="flex min-h-[calc(100dvh-56px)] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[rgb(var(--color-accent-rgb))]" />
            <div className="text-sm text-[rgb(var(--text-muted-rgb))]">
              Loading your hosting status…
            </div>
          </div>
        </div>
      );
    }

    if (phase === "error") {
      return (
        <div className="flex min-h-[calc(100dvh-56px)] items-center justify-center px-5">
          <div className="premium-card w-full max-w-md rounded-2xl p-6 text-center">
            <div className="text-sm font-semibold text-primary">
              Could not load hosting status
            </div>
            <div className="mt-1 text-sm text-secondary">
              Please refresh the page to try again.
            </div>
            <button
              onClick={() => void load()}
              className="site-cta-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
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
              <div className="mx-5 mt-4 rounded-xl border border-[rgb(var(--color-danger-rgb)/0.25)] bg-[rgb(var(--color-danger-rgb)/0.07)] px-4 py-3 text-sm text-[rgb(var(--color-danger-rgb))] sm:mx-8">
                {startError}
              </div>
            )}
            <CustomerWelcomeView
              onStart={() => void handleStartOnboarding()}
              starting={starting}
            />
          </>
        );
      case "vendor-first-time":
        return <FirstTimeVendorView />;
      case "vendor-has-draft":
        return <HasDraftView propertyId={onboardingState?.propertyId ?? ""} />;
      case "vendor-submitted":
        return <SubmittedView />;
      case "vendor-changes-requested":
        return (
          <ChangesRequestedView
            propertyId={onboardingState?.propertyId ?? ""}
          />
        );
      case "vendor-rejected":
        return <RejectedView propertyId={onboardingState?.propertyId ?? ""} />;
      default:
        return null;
    }
  }, [
    phase,
    startError,
    starting,
    onboardingState,
    handleStartOnboarding,
    load,
  ]);

  return (
    <div className="portal-density min-h-screen overflow-x-clip">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 portal-shell-bg" />

      {/* Minimal top bar */}
      <header className="sticky top-0 z-50 border-b border-[rgb(var(--line-rgb)/0.10)] bg-[rgb(var(--color-bg-rgb)/0.92)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="font-heading text-base font-semibold tracking-tight text-primary"
          >
            Laugh &amp; Lodge
          </Link>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden max-w-[180px] truncate text-xs text-[rgb(var(--text-muted-rgb))] sm:block">
                {user.email}
              </span>
            )}
            <Link
              href={user?.role === "VENDOR" ? "/vendor" : "/account"}
              className="site-cta-muted rounded-xl px-3.5 py-1.5 text-xs font-semibold transition"
            >
              {user?.role === "VENDOR" ? "Dashboard" : "My account"}
            </Link>
          </div>
        </div>
      </header>

      {/* Two-column layout on desktop */}
      <div className="mx-auto flex w-full max-w-[1080px] gap-10 lg:items-start lg:px-8">
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {mainContent}
            </motion.div>
          </AnimatePresence>
        </div>

        <DesktopSidePanel phase={phase} />
      </div>
    </div>
  );
}
