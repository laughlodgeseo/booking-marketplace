"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Loader2,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/portal/StatCard";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import { getAdminAnalytics, getAdminOverview } from "@/lib/api/portal/admin";
import { AnalyticsIllustration } from "@/components/portal/ui/PortalIllustration";

type AdminOverviewData = Awaited<ReturnType<typeof getAdminOverview>>;
type AdminAnalyticsData = Awaited<ReturnType<typeof getAdminAnalytics>>;

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; overview: AdminOverviewData; analytics: AdminAnalyticsData };

type RangeKey = "30d" | "90d" | "365d";

function toPoints(labels?: string[], points?: number[]): BarPoint[] {
  if (!labels?.length || !points?.length) return [];
  return labels.map((label, index) => ({ label, value: points[index] ?? 0 }));
}

function pickSeries(
  analytics: AdminAnalyticsData,
  chartKey: string,
  seriesKey: string,
): BarPoint[] {
  const chart = analytics.charts?.[chartKey];
  const labels = chart?.labels ?? analytics.labels ?? [];
  const points = chart?.series?.find((s) => s.key === seriesKey)?.points
    ?? analytics.series?.find((s) => s.key === seriesKey)?.points;
  return toPoints(labels, points);
}

function PriorityAction(props: {
  label: string;
  count: number;
  href: string;
  color: "amber" | "red" | "indigo" | "slate";
  icon: React.ReactNode;
}) {
  const colorMap = {
    amber: { bg: "bg-amber-50", border: "border-amber-200/60", text: "text-amber-700", count: "bg-amber-100 text-amber-700", icon: "bg-amber-100 text-amber-600" },
    red:   { bg: "bg-red-50",   border: "border-red-200/60",   text: "text-red-700",   count: "bg-red-100 text-red-700",   icon: "bg-red-100 text-red-600" },
    indigo:{ bg: "bg-indigo-50",border: "border-indigo-200/60",text: "text-indigo-700",count: "bg-indigo-100 text-indigo-700",icon:"bg-indigo-100 text-indigo-600" },
    slate: { bg: "bg-slate-50", border: "border-slate-200/60", text: "text-slate-700", count: "bg-slate-100 text-slate-700", icon: "bg-slate-100 text-slate-600" },
  };
  const c = colorMap[props.color];

  return (
    <Link
      href={props.href}
      className={`flex items-center justify-between gap-3 rounded-xl border ${c.border} ${c.bg} px-3.5 py-3 transition hover:brightness-98`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
          {props.icon}
        </div>
        <span className={`truncate text-sm font-medium ${c.text}`}>{props.label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.count}`}>{props.count}</span>
        <ArrowRight className={`h-3.5 w-3.5 ${c.text}`} />
      </div>
    </Link>
  );
}

function BreakdownCard(props: {
  title: string;
  rows: Record<string, number> | undefined;
  icon: React.ReactNode;
  noDataLabel: string;
}) {
  const entries = Object.entries(props.rows ?? {}).sort((a, b) => b[1] - a[1]);

  function labelFromKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <div className="premium-card premium-card-tinted rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <span className="card-icon-plate h-7 w-7 shrink-0">{props.icon}</span>
        {props.title}
      </div>
      {entries.length === 0 ? (
        <div className="mt-3 text-sm text-secondary">{props.noDataLabel}</div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {entries.map(([key, value]) => {
            const pct = Math.round((value / (entries[0]?.[1] ?? 1)) * 100);
            return (
              <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl bg-surface/70 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium text-secondary">{labelFromKey(key)}</div>
                  <div className="mt-0.5 h-1 w-full rounded-full bg-line/30">
                    <div
                      className="h-1 rounded-full bg-brand/60 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-semibold text-primary">{value}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboardPage() {
  const tPortal = useTranslations("portal");
  const [range, setRange] = useState<RangeKey>("90d");
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const [overview, analytics] = await Promise.all([
          getAdminOverview(),
          getAdminAnalytics({ range }),
        ]);
        if (!alive) return;
        setState({ kind: "ready", overview, analytics });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : tPortal("adminDashboard.errors.load"),
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
      return (
        <div className="rounded-2xl bg-surface/80 p-8 text-sm text-secondary">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tPortal("loading.dashboard")}
          </div>
        </div>
      );
    }

    if (state.kind === "error") {
      return (
        <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
          <div className="text-sm font-semibold text-danger">{tPortal("adminDashboard.errors.title")}</div>
          <div className="mt-2 text-sm text-danger">{state.message}</div>
        </div>
      );
    }

    const kpis = state.overview.kpis ?? {};
    const analytics = state.analytics;

    const bookingsPoints = pickSeries(analytics, "bookingsPerPeriod", "bookingsTotal");
    const revenuePoints = pickSeries(analytics, "revenuePerPeriod", "revenueCaptured");
    const capturePoints = pickSeries(analytics, "paymentVsRefunds", "paymentCaptures");
    const refundPoints = pickSeries(analytics, "paymentVsRefunds", "refundsSucceeded");
    const confirmedPoints = pickSeries(analytics, "bookingsPerPeriod", "bookingsConfirmed");
    const cancelledPoints = pickSeries(analytics, "bookingsPerPeriod", "bookingsCancelled");

    const hasPriorityActions =
      (kpis.propertiesUnderReview ?? 0) > 0 ||
      (kpis.refundsPending ?? 0) > 0 ||
      (kpis.vendorsPending ?? 0) > 0 ||
      (kpis.opsTasksOpen ?? 0) > 0;

    return (
      <div className="space-y-6">
        {/* Command-center hero — deep indigo brand */}
        <div className="site-hero-shell relative overflow-hidden rounded-2xl p-5 sm:p-6">
          {/* Geometry grid overlay */}
          <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-white/8 blur-3xl" />
          <div className="pointer-events-none absolute left-1/4 top-0 h-32 w-32 rounded-full bg-indigo-300/18 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Analytics illustration */}
              <div className="hidden shrink-0 sm:block">
                <AnalyticsIllustration className="h-[80px] w-auto opacity-80" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Operations Center
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {tPortal("adminDashboard.title")}
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  {tPortal("adminDashboard.subtitle")}
                </p>
              </div>
            </div>

            {/* Live counters */}
            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl border border-white/14 bg-white/10 px-3 py-2 text-center">
                <div className="text-2xl font-bold text-white">{kpis.propertiesPublished ?? 0}</div>
                <div className="text-[10px] text-white/60">Live Properties</div>
              </div>
              <div className="rounded-xl border border-white/14 bg-white/10 px-3 py-2 text-center">
                <div className="text-2xl font-bold text-white">{kpis.usersTotal ?? 0}</div>
                <div className="text-[10px] text-white/60">Total Users</div>
              </div>
              <div className="rounded-xl border border-[#b87333]/40 bg-[#b87333]/16 px-3 py-2 text-center">
                <div className="text-2xl font-bold text-[#f5c08a]">{kpis.propertiesUnderReview ?? 0}</div>
                <div className="text-[10px] text-[#f5c08a]/80">Awaiting Review</div>
              </div>
            </div>
          </div>
        </div>

        {/* Priority action queue */}
        {hasPriorityActions ? (
          <div className="premium-card rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="text-sm font-semibold text-primary">Action Queue</div>
              <div className="ml-auto text-[11px] text-muted">Items requiring attention</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(kpis.propertiesUnderReview ?? 0) > 0 && (
                <PriorityAction
                  label="Properties Under Review"
                  count={kpis.propertiesUnderReview ?? 0}
                  href="/admin/review-queue"
                  color="amber"
                  icon={<ShieldCheck className="h-3.5 w-3.5" />}
                />
              )}
              {(kpis.refundsPending ?? 0) > 0 && (
                <PriorityAction
                  label="Refunds Pending"
                  count={kpis.refundsPending ?? 0}
                  href="/admin/refunds"
                  color="red"
                  icon={<AlertTriangle className="h-3.5 w-3.5" />}
                />
              )}
              {(kpis.vendorsPending ?? 0) > 0 && (
                <PriorityAction
                  label="Vendors Pending"
                  count={kpis.vendorsPending ?? 0}
                  href="/admin/vendors"
                  color="indigo"
                  icon={<Users className="h-3.5 w-3.5" />}
                />
              )}
              {(kpis.opsTasksOpen ?? 0) > 0 && (
                <PriorityAction
                  label="Open Ops Tasks"
                  count={kpis.opsTasksOpen ?? 0}
                  href="/admin/ops-tasks"
                  color="slate"
                  icon={<Wrench className="h-3.5 w-3.5" />}
                />
              )}
            </div>
          </div>
        ) : null}

        {/* KPI metrics */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={tPortal("adminDashboard.kpi.propertiesUnderReview")}
            value={kpis.propertiesUnderReview ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.awaitingApproval")}
            icon={<ShieldCheck className="h-4 w-4" />}
            variant="dark"
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.publishedProperties")}
            value={kpis.propertiesPublished ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.liveInventory")}
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.confirmedBookings")}
            value={kpis.bookingsConfirmed ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.platformTotal")}
            icon={<ClipboardCheck className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.revenueCaptured")}
            value={kpis.revenueCaptured ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.capturedPayments")}
            icon={<Wallet className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.users")}
            value={kpis.usersTotal ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.allRoles")}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.pendingVendors")}
            value={kpis.vendorsPending ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.needReview")}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.opsTasksOpen")}
            value={kpis.opsTasksOpen ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.opsTaskStates")}
            icon={<Wrench className="h-4 w-4" />}
          />
          <StatCard
            label={tPortal("adminDashboard.kpi.refundsPending")}
            value={kpis.refundsPending ?? 0}
            helper={tPortal("adminDashboard.kpiHelpers.needsAction")}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        {/* Charts */}
        <div className="grid gap-4 xl:grid-cols-2">
          <SimpleBarChart
            title={tPortal("adminDashboard.charts.bookingsPerPeriod.title")}
            subtitle={tPortal("adminDashboard.charts.bookingsPerPeriod.subtitle")}
            points={bookingsPoints}
          />
          <SimpleBarChart
            title={tPortal("adminDashboard.charts.revenuePerPeriod.title")}
            subtitle={tPortal("adminDashboard.charts.revenuePerPeriod.subtitle")}
            points={revenuePoints}
          />
          <SimpleBarChart
            title={tPortal("adminDashboard.charts.paymentCapturesTrend.title")}
            subtitle={tPortal("adminDashboard.charts.paymentCapturesTrend.subtitle")}
            points={capturePoints}
          />
          <SimpleBarChart
            title={tPortal("adminDashboard.charts.refundsTrend.title")}
            subtitle={tPortal("adminDashboard.charts.refundsTrend.subtitle")}
            points={refundPoints}
          />
          <SimpleBarChart
            title={tPortal("adminDashboard.charts.confirmedBookingsTrend.title")}
            subtitle={tPortal("adminDashboard.charts.confirmedBookingsTrend.subtitle")}
            points={confirmedPoints}
          />
          <SimpleBarChart
            title={tPortal("adminDashboard.charts.cancelledBookingsTrend.title")}
            subtitle={tPortal("adminDashboard.charts.cancelledBookingsTrend.subtitle")}
            points={cancelledPoints}
          />
        </div>

        {/* Breakdowns */}
        <div className="grid gap-4 xl:grid-cols-2">
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.bookingStatus")}
            rows={analytics.breakdowns?.bookingStatus}
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.opsTaskStatus")}
            rows={analytics.breakdowns?.opsTaskStatus}
            icon={<Wrench className="h-3.5 w-3.5" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.paymentStatus")}
            rows={analytics.breakdowns?.paymentStatus}
            icon={<CreditCard className="h-3.5 w-3.5" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.refundStatus")}
            rows={analytics.breakdowns?.refundStatus}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
        </div>
      </div>
    );
  }, [state, tPortal]);

  return (
    <PortalShell
      role="admin"
      title={tPortal("adminDashboard.title")}
      subtitle={tPortal("adminDashboard.subtitle")}
      right={(
        <FilterChips
          options={[
            { value: "30d", label: "30d" },
            { value: "90d", label: "90d" },
            { value: "365d", label: "365d" },
          ]}
          value={range}
          onChange={(value) => setRange(value)}
        />
      )}
    >
      {content}
    </PortalShell>
  );
}
