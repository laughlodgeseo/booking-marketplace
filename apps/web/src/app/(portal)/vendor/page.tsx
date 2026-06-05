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
    <motion.div initial="hidden" animate="show" variants={STAGGER} className="space-y-6">
      {/* Hero card */}
      <motion.div
        variants={FADE_UP}
        className="relative overflow-hidden rounded-3xl bg-[linear-gradient(135deg,rgb(var(--color-surface-rgb)),rgb(var(--color-bg-2-rgb)/0.85))] p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_300px_at_50%_-40px,rgb(var(--color-accent-rgb)/0.14),transparent_60%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-brand">
            <Sparkles className="h-3 w-3" />
            Welcome to hosting
          </div>
          <h2 className="mt-4 text-2xl font-bold text-primary sm:text-3xl">
            Let&apos;s prepare your first property
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-secondary sm:text-base">
            Create a polished listing, add high-quality photos, set your pricing and availability, and submit for our team to review. Dubai-focused, mobile-first, and built for professional hosts.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {hasDraft && draftPropertyId ? (
              <Link
                href={`/vendor/properties/${encodeURIComponent(draftPropertyId)}/edit`}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text hover:bg-brand-hover transition"
              >
                Continue your listing <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/vendor/properties/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-accent-text hover:bg-brand-hover transition"
              >
                Start your first listing <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/vendor/properties"
              className="inline-flex items-center gap-1 rounded-2xl border border-line/60 bg-surface px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-warm-alt transition"
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
          desc="Verified payments, guest screening, and secure booking management."
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

      {/* What to expect */}
      <motion.div variants={FADE_UP} className="rounded-3xl border border-line/40 bg-surface/60 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">Steps to publish</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            "Tell us about your property",
            "Location and address",
            "Photos and amenities",
            "Pricing and availability",
            "Ownership documents",
            "Submit for admin review",
          ].map((label, i) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/12 text-[11px] font-bold text-brand">
                {i + 1}
              </div>
              <span className="text-sm text-secondary">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SubmittedHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-3xl border border-brand/20 bg-brand/5 p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand/12 text-brand">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-primary">Your listing is under review</div>
          <div className="mt-1 text-sm leading-relaxed text-secondary">
            Our team reviews listings within 24–48 business hours. You will be notified as soon as a decision is made.
          </div>
          <Link
            href="/vendor/properties"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            View your listing status <ArrowRight className="h-3.5 w-3.5" />
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
      transition={{ duration: 0.38 }}
      className="rounded-3xl border border-warning/30 bg-warning/8 p-6"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold text-primary">Changes requested on your listing</div>
          <div className="mt-1 text-sm leading-relaxed text-secondary">
            Our review team has requested changes. Update your listing and resubmit for approval.
          </div>
          <Link
            href={`/vendor/properties/${encodeURIComponent(propertyId)}/edit`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
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

    const revenuePoints = pickSeries(analytics, "revenuePerPeriod", "revenueCaptured");
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
            label={tPortal("vendorDashboard.kpi.revenueCaptured")}
            value={kpis.revenueCaptured ?? 0}
            helper={tPortal("vendorDashboard.kpiHelpers.capturedPayments")}
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
