"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Wallet,
  Waves,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatCard } from "@/components/portal/StatCard";
import { SimpleBarChart, type BarPoint } from "@/components/portal/SimpleBarChart";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import { getVendorAnalytics, getVendorOverview } from "@/lib/api/portal/vendor";

type VendorOverviewData = Awaited<ReturnType<typeof getVendorOverview>>;
type VendorAnalyticsData = Awaited<ReturnType<typeof getVendorAnalytics>>;

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
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
  const points = chart?.series?.find((s) => s.key === seriesKey)?.points
    ?? analytics.series?.find((s) => s.key === seriesKey)?.points;
  return toPoints(labels, points);
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
        const [overview, analytics] = await Promise.all([
          getVendorOverview(),
          getVendorAnalytics({ range }),
        ]);
        if (!alive) return;
        setState({ kind: "ready", overview, analytics });
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
      title={tPortal("vendorDashboard.title")}
      subtitle={tPortal("vendorDashboard.subtitle")}
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
