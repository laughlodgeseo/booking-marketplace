"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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

function BreakdownCard(props: {
  title: string;
  rows: Record<string, number> | undefined;
  icon: React.ReactNode;
  noDataLabel: string;
}) {
  const entries = Object.entries(props.rows ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="premium-card premium-card-tinted rounded-3xl p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-primary">
        <span className="card-icon-plate h-8 w-8">{props.icon}</span>
        {props.title}
      </div>
      {entries.length === 0 ? (
        <div className="mt-3 text-sm text-secondary">{props.noDataLabel}</div>
      ) : (
        <div className="mt-4 space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-surface px-3 py-2 ring-1 ring-line/50">
              <div className="truncate text-xs font-semibold uppercase tracking-wide text-secondary">
                {key.replaceAll("_", " ")}
              </div>
              <div className="text-sm font-semibold text-primary">{value}</div>
            </div>
          ))}
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
        <div className="portal-card rounded-3xl bg-surface/90 p-8 text-sm text-secondary">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {tPortal("loading.dashboard")}
          </div>
        </div>
      );
    }

    if (state.kind === "error") {
      return (
        <div className="portal-card rounded-3xl bg-danger/10 p-6">
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

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

        <div className="grid gap-4 xl:grid-cols-2">
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.bookingStatus")}
            rows={analytics.breakdowns?.bookingStatus}
            icon={<CheckCircle2 className="h-4 w-4" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.opsTaskStatus")}
            rows={analytics.breakdowns?.opsTaskStatus}
            icon={<Wrench className="h-4 w-4" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.paymentStatus")}
            rows={analytics.breakdowns?.paymentStatus}
            icon={<CreditCard className="h-4 w-4" />}
            noDataLabel={tPortal("adminDashboard.noData")}
          />
          <BreakdownCard
            title={tPortal("adminDashboard.breakdowns.refundStatus")}
            rows={analytics.breakdowns?.refundStatus}
            icon={<AlertTriangle className="h-4 w-4" />}
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
