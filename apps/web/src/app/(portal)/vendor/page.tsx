"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  Sparkles,
  Wallet,
  Waves,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";

import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/portal/StatCard";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import { getVendorAnalytics, getVendorOverview } from "@/lib/api/portal/vendor";
import { getHostOnboardingState } from "@/lib/api/portal/onboarding";

type VendorOverviewData = Awaited<ReturnType<typeof getVendorOverview>>;
type VendorAnalyticsData = Awaited<ReturnType<typeof getVendorAnalytics>>;

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "first-time" }
  | { kind: "has-draft"; propertyId: string }
  | { kind: "submitted" }
  | { kind: "changes-requested"; propertyId: string }
  | { kind: "ready"; overview: VendorOverviewData; analytics: VendorAnalyticsData };

type RangeKey = "30d" | "90d" | "365d";

function toPoints(labels?: string[], points?: number[]): BarPoint[] {
  if (!labels?.length || !points?.length) return [];
  return labels.map((label, index) => ({ label, value: points[index] ?? 0 }));
}

function moneyMinor(value: number | null | undefined): string {
  const amount = (value ?? 0) / 100;
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(amount);
}

function minorPoints(points: BarPoint[]): BarPoint[] {
  return points.map((p) => ({ ...p, value: p.value / 100 }));
}

function pickSeries(
  analytics: VendorAnalyticsData,
  chartKey: string,
  seriesKey: string,
): BarPoint[] {
  const chart = analytics.charts?.[chartKey];
  const labels = chart?.labels ?? analytics.labels ?? [];
  const points =
    chart?.series?.find((s) => s.key === seriesKey)?.points ??
    analytics.series?.find((s) => s.key === seriesKey)?.points;
  return toPoints(labels, points);
}

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const STAGGER: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <motion.div variants={FADE_UP} className="flex items-start gap-3 rounded-2xl border border-line/40 bg-surface/60 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-primary">{title}</div>
        <div className="mt-0.5 text-xs leading-relaxed text-secondary">{desc}</div>
      </div>
    </motion.div>
  );
}

function FirstTimeWelcome({ hasDraft, draftPropertyId }: { hasDraft?: boolean; draftPropertyId?: string }) {
  return (
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-5">
      {/* Hero card — dark indigo gradient */}
      <motion.div
        variants={FADE_UP}
        className="site-hero-shell relative overflow-hidden rounded-3xl p-6 sm:p-8"
      >
        <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -top-16 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/90">
            <Sparkles className="h-3 w-3 text-[rgb(var(--color-gold-rgb))]" />
            Welcome to hosting
          </div>
          <h2 className="mt-4 font-heading text-2xl font-semibold text-white sm:text-3xl">
            {hasDraft ? "Continue your listing" : "Let’s prepare your first property"}
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
                className="inline-flex items-center gap-2 rounded-2xl border border-white/22 bg-white/14 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition"
              >
                Continue your listing <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/vendor/properties/new"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/22 bg-white/14 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition"
              >
                Start your first listing <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/vendor/properties"
              className="inline-flex items-center gap-1 rounded-2xl border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/14 transition"
            >
              My listings
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Trust cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <TrustItem
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Secure bookings"
          desc="Verified payments, guest screening, and dispute protection."
        />
        <TrustItem
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Admin-reviewed quality"
          desc="Every listing is reviewed by our team before going live to guests."
        />
        <TrustItem
          icon={<CalendarCheck className="h-4 w-4" />}
          title="Full calendar control"
          desc="Block dates, set advance notice, and manage availability in real time."
        />
      </div>

      {/* Steps to publish */}
      <motion.div variants={FADE_UP} className="premium-card rounded-3xl p-5">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--text-muted-rgb))]">
          Steps to publish
        </div>
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
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-accent-rgb)/0.12)] text-[11px] font-bold text-[rgb(var(--color-accent-rgb))]">
                {i + 1}
              </div>
              <span className="text-sm text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Dubai market note */}
      <motion.div
        variants={FADE_UP}
        className="flex items-start gap-3 rounded-2xl border border-[rgb(var(--color-gold-rgb)/0.22)] bg-[rgb(var(--color-gold-rgb)/0.05)] px-4 py-3.5"
      >
        <Waves className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-gold-rgb))]" />
        <p className="text-sm text-secondary">
          <span className="font-semibold text-primary">Dubai-first platform.</span>{" "}
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
      className="premium-card rounded-3xl p-6"
    >
      <div className="flex items-start gap-4">
        <div className="card-icon-plate h-11 w-11 shrink-0">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-lg font-semibold text-primary">
            Your listing is under review
          </div>
          <div className="mt-1 text-sm leading-relaxed text-secondary">
            Our team reviews new listings within 24–48 business hours. We&apos;ll notify you as soon as a decision is made.
          </div>

          {/* Progress steps */}
          <div className="mt-4 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[rgb(var(--color-success-rgb))]" />
              <span className="text-sm text-primary">Listing submitted</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                <span className="absolute h-4 w-4 animate-ping rounded-full bg-[rgb(var(--color-accent-rgb)/0.28)]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--color-accent-rgb))]" />
              </div>
              <span className="text-sm text-primary">Admin review in progress</span>
            </div>
            <div className="flex items-center gap-2.5 opacity-35">
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-[rgb(var(--line-rgb))]" />
              <span className="text-sm text-secondary">Live — visible to guests</span>
            </div>
          </div>

          <Link
            href="/vendor/properties"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--color-accent-rgb))] hover:underline"
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
      className="overflow-hidden rounded-3xl border border-[rgb(var(--color-warning-rgb)/0.24)] bg-[rgb(var(--color-warning-rgb)/0.06)] p-6"
    >
      <div className="flex items-start gap-4">
        <div
          className="card-icon-plate h-11 w-11 shrink-0"
          style={{ background: "rgb(var(--color-warning-rgb)/0.14)", borderColor: "rgb(var(--color-warning-rgb)/0.30)", color: "rgb(var(--color-warning-rgb))" } as React.CSSProperties}
        >
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-heading text-lg font-semibold text-primary">
            Changes requested on your listing
          </div>
          <div className="mt-1 text-sm leading-relaxed text-secondary">
            Our review team has requested changes. Review the feedback in your properties page, make the necessary updates, and resubmit for approval.
          </div>
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[rgb(var(--color-accent-rgb))] hover:underline"
          >
            Update your listing <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default function VendorDashboardPage() {
  const tPortal = useTranslations("portal");
  const [range, setRange] = useState<RangeKey>("90d");
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const [overview, analytics, onboarding] = await Promise.all([
          getVendorOverview(),
          getVendorAnalytics({ range }),
          getHostOnboardingState().catch(() => null),
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

        setState({ kind: "ready", overview, analytics });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message:
            error instanceof Error ? error.message : tPortal("vendorDashboard.errors.load"),
        });
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [range, tPortal]);

  const content = useMemo(() => {
    if (state.kind === "loading") {
      return <DashboardSkeleton />;
    }

    if (state.kind === "error") {
      return (
        <div className="portal-card rounded-3xl bg-danger/10 p-6">
          <div className="text-sm font-semibold text-danger">{tPortal("vendorDashboard.errors.title")}</div>
          <div className="mt-2 text-sm text-danger">{state.message}</div>
        </div>
      );
    }

    if (state.kind === "first-time") {
      return <FirstTimeWelcome />;
    }

    if (state.kind === "has-draft") {
      return <FirstTimeWelcome hasDraft draftPropertyId={state.propertyId} />;
    }

    if (state.kind === "submitted") {
      return <SubmittedHero />;
    }

    if (state.kind === "changes-requested") {
      return <ChangesRequestedHero propertyId={state.propertyId} />;
    }

    const kpis = state.overview.kpis ?? {};
    const analytics = state.analytics;

    const revenuePoints = minorPoints(pickSeries(analytics, "revenuePerPeriod", "revenueCaptured"));
    const bookingsPoints = pickSeries(analytics, "bookingsPerPeriod", "bookingsTotal");
    const upcomingPoints = pickSeries(analytics, "opsAndUpcoming", "upcomingStays");
    const opsPoints = pickSeries(analytics, "opsAndUpcoming", "opsTasks");
    const occupancyPoints = pickSeries(analytics, "occupancyTrend", "occupancyNights");

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={tPortal("vendorDashboard.kpi.publishedProperties")}
            value={kpis.propertiesPublished ?? 0}
            helper={tPortal("vendorDashboard.kpiHelpers.liveInMarketplace")}
            icon={<Building2 className="h-4 w-4" />}
            variant="dark"
          />
          <StatCard
            label={tPortal("vendorDashboard.kpi.underReview")}
            value={kpis.propertiesUnderReview ?? 0}
            helper={tPortal("vendorDashboard.kpiHelpers.pendingApproval")}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <StatCard
            label="Net payout earnings"
            value={moneyMinor(kpis.revenueCaptured ?? 0)}
            helper="Vendor net payable"
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("vendorDashboard.kpi.bookingsTotal")}
            value={kpis.bookingsTotal ?? 0}
            helper={tPortal("vendorDashboard.kpiHelpers.allStatuses")}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("vendorDashboard.kpi.upcomingStays")}
            value={kpis.bookingsUpcoming ?? 0}
            helper={tPortal("vendorDashboard.kpiHelpers.confirmedCheckIns")}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("vendorDashboard.kpi.opsTasksOpen")}
            value={kpis.opsTasksOpen ?? 0}
            helper={tPortal("vendorDashboard.kpiHelpers.pendingOperationalWorkload")}
            icon={<Wrench className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SimpleBarChart
            title={tPortal("vendorDashboard.charts.revenueTrend.title")}
            subtitle={tPortal("vendorDashboard.charts.revenueTrend.subtitle")}
            points={revenuePoints}
          />
          <SimpleBarChart
            title={tPortal("vendorDashboard.charts.bookingsTrend.title")}
            subtitle={tPortal("vendorDashboard.charts.bookingsTrend.subtitle")}
            points={bookingsPoints}
          />
          <SimpleBarChart
            title={tPortal("vendorDashboard.charts.upcomingStaysTrend.title")}
            subtitle={tPortal("vendorDashboard.charts.upcomingStaysTrend.subtitle")}
            points={upcomingPoints}
          />
          <SimpleBarChart
            title={tPortal("vendorDashboard.charts.opsTaskTrend.title")}
            subtitle={tPortal("vendorDashboard.charts.opsTaskTrend.subtitle")}
            points={opsPoints}
          />
          <SimpleBarChart
            title={tPortal("vendorDashboard.charts.occupancyNightsTrend.title")}
            subtitle={tPortal("vendorDashboard.charts.occupancyNightsTrend.subtitle")}
            points={occupancyPoints}
          />
          <div className="premium-card premium-card-tinted rounded-3xl p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <span className="card-icon-plate h-8 w-8">
                <Waves className="h-4 w-4" />
              </span>
              {tPortal("vendorDashboard.statusBreakdowns")}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface p-3 ring-1 ring-line/60">
                <div className="text-xs font-semibold tracking-wide text-muted">
                  {tPortal("vendorDashboard.bookingStatuses")}
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-primary">
                  {Object.entries(analytics.breakdowns?.bookingStatus ?? {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs uppercase tracking-wide text-secondary">
                        {key.replaceAll("_", " ")}
                      </span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-surface p-3 ring-1 ring-line/60">
                <div className="text-xs font-semibold tracking-wide text-muted">
                  {tPortal("vendorDashboard.opsTaskStatuses")}
                </div>
                <div className="mt-2 space-y-1.5 text-sm text-primary">
                  {Object.entries(analytics.breakdowns?.opsTaskStatus ?? {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs uppercase tracking-wide text-secondary">
                        {key.replaceAll("_", " ")}
                      </span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [state, tPortal]);

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
