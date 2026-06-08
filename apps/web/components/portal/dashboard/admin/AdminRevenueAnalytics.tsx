"use client";

import type { AdminAnalyticsResponse } from "@/lib/api/portal/admin";
import { extractPoints, toMajorPoints, breakdownToSlices, CHART_PALETTE } from "../dashboard-chart-mappers";
import { formatTooltipCurrency } from "../dashboard-chart-mappers";
import { ChartCard } from "../ChartCard";
import { AreaTrendChart, type AreaSeries } from "../AreaTrendChart";
import { BarTrendChart, type BarSeries } from "../BarTrendChart";
import { DonutBreakdownChart } from "../DonutBreakdownChart";

interface Props {
  analytics: AdminAnalyticsResponse;
}

export function AdminRevenueAnalytics({ analytics }: Props) {
  const revenuePts = toMajorPoints(extractPoints(analytics, "revenuePerPeriod", "revenueCaptured"));
  const commissionPts = toMajorPoints(extractPoints(analytics, "revenuePerPeriod", "platformCommission"));
  const payoutPts = toMajorPoints(extractPoints(analytics, "payoutLiability", "vendorPayable"));
  const capturePts = extractPoints(analytics, "paymentVsRefunds", "paymentCaptures");
  const refundPts = extractPoints(analytics, "paymentVsRefunds", "refundsSucceeded");
  const confirmedPts = extractPoints(analytics, "bookingsPerPeriod", "bookingsConfirmed");
  const cancelledPts = extractPoints(analytics, "bookingsPerPeriod", "bookingsCancelled");
  const bookingsTotalPts = extractPoints(analytics, "bookingsPerPeriod", "bookingsTotal");

  const revSeries: AreaSeries[] = [
    {
      key: "revenue",
      label: "Revenue Captured",
      color: CHART_PALETTE.indigo,
      fillColor: CHART_PALETTE.indigo,
      points: revenuePts,
      isCurrency: true,
    },
    {
      key: "commission",
      label: "Platform Commission",
      color: CHART_PALETTE.bronze,
      fillColor: CHART_PALETTE.bronze,
      points: commissionPts,
      isCurrency: true,
    },
  ];

  const payoutSeries: AreaSeries[] = [
    {
      key: "payout",
      label: "Vendor Payable",
      color: CHART_PALETTE.sage,
      fillColor: CHART_PALETTE.sage,
      points: payoutPts,
      isCurrency: true,
    },
  ];

  const bookingsSeries: BarSeries[] = [
    { key: "confirmed", label: "Confirmed", color: CHART_PALETTE.indigo, points: confirmedPts },
    { key: "cancelled", label: "Cancelled", color: CHART_PALETTE.rose, points: cancelledPts },
  ];

  const refundSeries: BarSeries[] = [
    { key: "captures", label: "Captures", color: CHART_PALETTE.sage, points: capturePts },
    { key: "refunds", label: "Refunds", color: CHART_PALETTE.rose, points: refundPts },
  ];

  const paymentSlices = breakdownToSlices(analytics.breakdowns?.paymentStatus);
  const bookingSlices = breakdownToSlices(analytics.breakdowns?.bookingStatus);
  const opsSlices = breakdownToSlices(analytics.breakdowns?.opsTaskStatus);
  const refundSlices = breakdownToSlices(analytics.breakdowns?.refundStatus);

  return (
    <div className="space-y-4">
      {/* Row 1: Revenue & Payout — large cards */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Revenue & Commission"
          subtitle="Gross captured revenue vs platform commission (18%)"
          className="xl:col-span-1"
        >
          <div className="mb-2 flex flex-wrap gap-4">
            <SeriesLegendItem color={CHART_PALETTE.indigo} label="Revenue Captured" />
            <SeriesLegendItem color={CHART_PALETTE.bronze} label="Commission (18%)" />
          </div>
          <AreaTrendChart series={revSeries} formatValue={formatTooltipCurrency} />
        </ChartCard>

        <ChartCard
          title="Vendor Payout Liability"
          subtitle="Net payable to vendors over time"
        >
          <AreaTrendChart series={payoutSeries} formatValue={formatTooltipCurrency} />
        </ChartCard>
      </div>

      {/* Row 2: Bookings & Payments */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Bookings Trend"
          subtitle="Confirmed vs cancelled bookings per period"
        >
          <div className="mb-2 flex flex-wrap gap-4">
            <SeriesLegendItem color={CHART_PALETTE.indigo} label="Confirmed" />
            <SeriesLegendItem color={CHART_PALETTE.rose} label="Cancelled" />
          </div>
          <BarTrendChart series={bookingsSeries} />
        </ChartCard>

        <ChartCard
          title="Payments & Refunds"
          subtitle="Payment captures vs refunds over time"
        >
          <div className="mb-2 flex flex-wrap gap-4">
            <SeriesLegendItem color={CHART_PALETTE.sage} label="Captures" />
            <SeriesLegendItem color={CHART_PALETTE.rose} label="Refunds" />
          </div>
          <BarTrendChart series={refundSeries} />
        </ChartCard>
      </div>

      {/* Row 3: Status breakdowns */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ChartCard title="Booking Status">
          <DonutBreakdownChart slices={bookingSlices} size={110} />
        </ChartCard>
        <ChartCard title="Payment Status">
          <DonutBreakdownChart slices={paymentSlices} size={110} />
        </ChartCard>
        <ChartCard title="Ops Task Status">
          <DonutBreakdownChart slices={opsSlices} size={110} />
        </ChartCard>
        <ChartCard title="Refund Status">
          <DonutBreakdownChart slices={refundSlices} size={110} />
        </ChartCard>
      </div>
    </div>
  );
}

function SeriesLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[11px] text-[#6b7280]">{label}</span>
    </div>
  );
}
