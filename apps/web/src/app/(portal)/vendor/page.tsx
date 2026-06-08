"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
  Sparkles,
  Waves,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";

import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PortalShell } from "@/components/portal/PortalShell";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import { getVendorAnalytics, getVendorOverview, getVendorPropertyFees } from "@/lib/api/portal/vendor";
import type { VendorAnalyticsResponse, VendorOverviewResponse, VendorPropertyFeesResponse } from "@/lib/api/portal/vendor";
import { getHostOnboardingState } from "@/lib/api/portal/onboarding";

import { VendorExecutiveSummary } from "@/components/portal/dashboard/vendor/VendorExecutiveSummary";
import { VendorKpiGrid } from "@/components/portal/dashboard/vendor/VendorKpiGrid";
import { VendorEarningsAnalytics } from "@/components/portal/dashboard/vendor/VendorEarningsAnalytics";
import { VendorPropertyFeeCard } from "@/components/portal/dashboard/PropertyFeeHealthCard";

type RangeKey = "30d" | "90d" | "365d";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "first-time" }
  | { kind: "has-draft"; propertyId: string }
  | { kind: "submitted" }
  | { kind: "changes-requested"; propertyId: string }
  | {
      kind: "ready";
      overview: VendorOverviewResponse;
      analytics: VendorAnalyticsResponse;
      fees: VendorPropertyFeesResponse | null;
    };

const RANGE_LABELS: Record<RangeKey, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last year",
};

// ─── Onboarding states (preserved from original) ─────────────────────────────

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const STAGGER: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div variants={FADE_UP} className="flex items-start gap-3 rounded-2xl border border-[#e8e8f0] bg-white/60 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-[#1e1b4b]">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-[#6b7280]">{desc}</div>
      </div>
    </motion.div>
  );
}

function FirstTimeWelcome({ hasDraft, draftPropertyId }: { hasDraft?: boolean; draftPropertyId?: string }) {
  return (
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-5">
      <motion.div variants={FADE_UP} className="site-hero-shell relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90">
            <Sparkles className="h-3 w-3 text-amber-300" />
            Welcome to hosting
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">
            {hasDraft ? "Continue your listing" : "Let's prepare your first property"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/72 sm:text-base">
            {hasDraft
              ? "Your draft is saved — pick up where you left off. Complete all steps and submit for admin review."
              : "Create a polished listing, add high-quality photos, set your pricing, and submit for our team to review."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hasDraft && draftPropertyId ? (
              <Link
                href={`/vendor/properties/${encodeURIComponent(draftPropertyId)}/edit`}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/22 bg-white/14 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Continue your listing <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/vendor/properties/new"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/22 bg-white/14 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Start your first listing <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/vendor/properties"
              className="inline-flex items-center gap-1 rounded-2xl border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/14"
            >
              My listings
            </Link>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TrustItem icon={<ShieldCheck className="h-4 w-4" />} title="Secure bookings" desc="Verified payments, guest screening, and dispute protection." />
        <TrustItem icon={<CheckCircle2 className="h-4 w-4" />} title="Admin-reviewed quality" desc="Every listing is reviewed by our team before going live to guests." />
        <TrustItem icon={<CalendarCheck className="h-4 w-4" />} title="Full calendar control" desc="Block dates, set advance notice, and manage availability in real time." />
      </div>

      <motion.div variants={FADE_UP} className="rounded-3xl border border-[#e8e8f0] bg-white p-5 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af]">Steps to publish</div>
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {[
            "Tell us about your property",
            "Location and address",
            "Photos and amenities",
            "Pricing and availability",
            "Ownership documents",
            "Submit for admin review",
          ].map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[11px] font-bold text-[#4f46e5]">
                {i + 1}
              </div>
              <span className="text-sm text-[#6b7280]">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={FADE_UP} className="flex items-start gap-3 rounded-2xl border border-amber-200/50 bg-amber-50 px-4 py-3.5">
        <Waves className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-[#6b7280]">
          <span className="font-semibold text-[#1e1b4b]">Dubai-first platform.</span>{" "}
          Dirham pricing, Arabic support, and a review process aligned with DTCM holiday home permit requirements.
        </p>
      </motion.div>
    </motion.div>
  );
}

function SubmittedHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-[#e8e8f0] bg-white p-6 shadow-[0_1px_4px_rgba(15,23,42,0.06)]"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#4f46e5]">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-[#1e1b4b]">Your listing is under review</div>
          <div className="mt-1 text-sm leading-relaxed text-[#6b7280]">
            Our team reviews new listings within 24–48 business hours. We&apos;ll notify you as soon as a decision is made.
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16a34a]" />
              <span className="text-sm text-[#1e1b4b]">Listing submitted</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="absolute h-4 w-4 animate-ping rounded-full bg-[#4f46e5]/28" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#4f46e5]" />
              </div>
              <span className="text-sm text-[#1e1b4b]">Admin review in progress</span>
            </div>
            <div className="flex items-center gap-2.5 opacity-35">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[#e5e7eb]" />
              <span className="text-sm text-[#6b7280]">Live — visible to guests</span>
            </div>
          </div>
          <Link
            href="/vendor/properties"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4f46e5] hover:underline"
          >
            View listing status <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function ChangesRequestedHero({ propertyId }: { propertyId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-3xl border border-amber-200 bg-amber-50 p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-[#1e1b4b]">Changes requested on your listing</div>
          <div className="mt-1 text-sm leading-relaxed text-[#6b7280]">
            Our review team has requested changes. Review the feedback in your properties page, make the necessary updates, and resubmit for approval.
          </div>
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4f46e5] hover:underline"
          >
            Update your listing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VendorDashboardPage() {
  const tPortal = useTranslations("portal");
  const [range, setRange] = useState<RangeKey>("90d");
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const [overview, analytics, onboarding, fees] = await Promise.all([
          getVendorOverview(),
          getVendorAnalytics({ range }),
          getHostOnboardingState().catch(() => null),
          getVendorPropertyFees().catch(() => null),
        ]);
        if (!alive) return;

        const kpis = overview.kpis ?? {};
        const hasPublished = (kpis.propertiesPublished ?? 0) > 0;
        const hasUnderReview = (kpis.propertiesUnderReview ?? 0) > 0;

        if (onboarding && !hasPublished) {
          if (onboarding.status === "FIRST_TIME") {
            setState({ kind: "first-time" });
            return;
          }
          if (onboarding.status === "HAS_DRAFT" && onboarding.propertyId) {
            setState({ kind: "has-draft", propertyId: onboarding.propertyId });
            return;
          }
          if (onboarding.status === "SUBMITTED" || hasUnderReview) {
            setState({ kind: "submitted" });
            return;
          }
          if (onboarding.status === "CHANGES_REQUESTED" && onboarding.propertyId) {
            setState({ kind: "changes-requested", propertyId: onboarding.propertyId });
            return;
          }
        }

        setState({ kind: "ready", overview, analytics, fees });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : tPortal("vendorDashboard.errors.load"),
        });
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [range, tPortal]);

  const content = useMemo(() => {
    if (state.kind === "loading") return <DashboardSkeleton />;

    if (state.kind === "error") {
      return (
        <div className="rounded-3xl border border-[#fecaca] bg-[#fef2f2] p-6">
          <div className="text-sm font-semibold text-[#dc2626]">{tPortal("vendorDashboard.errors.title")}</div>
          <div className="mt-2 text-sm text-[#dc2626]">{state.message}</div>
        </div>
      );
    }

    if (state.kind === "first-time") return <FirstTimeWelcome />;
    if (state.kind === "has-draft") return <FirstTimeWelcome hasDraft draftPropertyId={state.propertyId} />;
    if (state.kind === "submitted") return <SubmittedHero />;
    if (state.kind === "changes-requested") return <ChangesRequestedHero propertyId={state.propertyId} />;

    const kpis = state.overview.kpis ?? {};
    const feeSummary = state.fees?.summary;
    const outstandingMinor = feeSummary?.outstandingMinor ?? 0;

    return (
      <div className="space-y-5">
        {/* Hero */}
        <VendorExecutiveSummary
          propertiesPublished={kpis.propertiesPublished ?? 0}
          upcomingStays={kpis.bookingsUpcoming ?? 0}
          netPayoutMinor={kpis.revenueCaptured ?? 0}
          outstandingFeesMinor={outstandingMinor}
          range={RANGE_LABELS[range]}
        />

        {/* KPI grid */}
        <VendorKpiGrid kpis={kpis} outstandingFeesMinor={outstandingMinor} />

        {/* Charts */}
        <VendorEarningsAnalytics analytics={state.analytics} />

        {/* Property fees */}
        <VendorPropertyFeeCard
          outstandingMinor={feeSummary?.outstandingMinor ?? 0}
          paidMinor={feeSummary?.totalPaidMinor ?? 0}
          totalDueMinor={feeSummary?.totalDueMinor ?? 0}
          payHref="/vendor/property-fees"
          viewHref="/vendor/property-fees"
        />
      </div>
    );
  }, [state, tPortal, range]);

  return (
    <PortalShell
      role="vendor"
      title={
        state.kind === "first-time" || state.kind === "has-draft"
          ? "Welcome to Laugh & Lodge"
          : tPortal("vendorDashboard.title")
      }
      subtitle={
        state.kind === "first-time" || state.kind === "has-draft"
          ? "Let's prepare your first property for review"
          : tPortal("vendorDashboard.subtitle")
      }
      right={
        state.kind === "ready" ? (
          <FilterChips
            options={[
              { value: "30d", label: "30d" },
              { value: "90d", label: "90d" },
              { value: "365d", label: "365d" },
            ]}
            value={range}
            onChange={(value) => setRange(value)}
          />
        ) : undefined
      }
    >
      {content}
    </PortalShell>
  );
}
