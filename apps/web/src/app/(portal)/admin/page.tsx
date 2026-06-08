"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { PortalShell } from "@/components/portal/PortalShell";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import { getAdminAnalytics, getAdminOverview, getAdminVendorPropertyFees } from "@/lib/api/portal/admin";
import type { AdminAnalyticsResponse, AdminOverviewResponse, AdminPropertyFeesResponse } from "@/lib/api/portal/admin";

import { AdminExecutiveSummary } from "@/components/portal/dashboard/admin/AdminExecutiveSummary";
import { AdminActionQueue } from "@/components/portal/dashboard/admin/AdminActionQueue";
import { AdminKpiGrid } from "@/components/portal/dashboard/admin/AdminKpiGrid";
import { AdminRevenueAnalytics } from "@/components/portal/dashboard/admin/AdminRevenueAnalytics";
import { AdminPropertyFeeCard } from "@/components/portal/dashboard/PropertyFeeHealthCard";

type RangeKey = "30d" | "90d" | "365d";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      overview: AdminOverviewResponse;
      analytics: AdminAnalyticsResponse;
      fees: AdminPropertyFeesResponse | null;
    };

const RANGE_LABELS: Record<RangeKey, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "365d": "Last year",
};

export default function AdminDashboardPage() {
  const tPortal = useTranslations("portal");
  const [range, setRange] = useState<RangeKey>("90d");
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const [overview, analytics, fees] = await Promise.all([
          getAdminOverview(),
          getAdminAnalytics({ range }),
          getAdminVendorPropertyFees({ pageSize: 100 }).catch(() => null),
        ]);
        if (!alive) return;
        setState({ kind: "ready", overview, analytics, fees });
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
        <div className="flex items-center gap-2 rounded-2xl bg-white/80 p-8 text-sm text-[#6b7280]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {tPortal("loading.dashboard")}
        </div>
      );
    }

    if (state.kind === "error") {
      return (
        <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] p-5">
          <div className="text-sm font-semibold text-[#dc2626]">{tPortal("adminDashboard.errors.title")}</div>
          <div className="mt-2 text-sm text-[#dc2626]">{state.message}</div>
        </div>
      );
    }

    const kpis = state.overview.kpis ?? {};
    const { analytics, fees } = state;

    // Aggregate property fees
    const feeItems = fees?.items ?? [];
    const totalDueMinor = feeItems.reduce((s, i) => s + i.totalDueMinor, 0);
    const paidMinor = feeItems.reduce((s, i) => s + i.paidMinor, 0);
    const outstandingMinor = feeItems.reduce((s, i) => s + i.outstandingMinor, 0);

    return (
      <div className="space-y-5">
        {/* Hero */}
        <AdminExecutiveSummary
          propertiesPublished={kpis.propertiesPublished ?? 0}
          usersTotal={kpis.usersTotal ?? 0}
          propertiesUnderReview={kpis.propertiesUnderReview ?? 0}
          revenueCaptured={kpis.revenueCaptured ?? 0}
          range={RANGE_LABELS[range]}
        />

        {/* Action queue */}
        <AdminActionQueue kpis={kpis} />

        {/* KPI grid */}
        <AdminKpiGrid kpis={kpis} />

        {/* Charts */}
        <AdminRevenueAnalytics analytics={analytics} />

        {/* Property fee tracking */}
        <AdminPropertyFeeCard
          totalDueMinor={totalDueMinor}
          paidMinor={paidMinor}
          outstandingMinor={outstandingMinor}
          viewHref="/admin/vendor-property-fees"
        />
      </div>
    );
  }, [state, tPortal, range]);

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
