"use client";

import type { VendorAnalyticsResponse } from "@/lib/api/portal/vendor";
import { extractPoints, toMajorPoints, breakdownToSlices, CHART_PALETTE } from "../dashboard-chart-mappers";
import { formatTooltipCurrency } from "../dashboard-chart-mappers";
import { ChartCard } from "../ChartCard";
import { AreaTrendChart, type AreaSeries } from "../AreaTrendChart";
import { BarTrendChart, type BarSeries } from "../BarTrendChart";
import { DonutBreakdownChart } from "../DonutBreakdownChart";

interface Props {
  analytics: VendorAnalyticsResponse;
}

export function VendorEarningsAnalytics({ analytics }: Props) {
  const revenuePts = toMajorPoints(extractPoints(analytics, "revenuePerPeriod", "revenueCaptured"));
  const bookingsTotalPts = extractPoints(analytics, "bookingsPerPeriod", "bookingsTotal");
  const bookingsCancelledPts = extractPoints(analytics, "bookingsPerPeriod", "bookingsCancelled");
  const bookingsConfirmedPts = extractPoints(analytics, "bookingsPerPeriod", "bookingsConfirmed");
  const upcomingPts = extractPoints(analytics, "opsAndUpcoming", "upcomingStays");
  const occupancyPts = extractPoints(analytics, "occupancyTrend", "occupancyNights");

  const revSeries: AreaSeries[] = [
    {
      key: "revenue",
      label: "Net Payout Earnings",
      color: CHART_PALETTE.indigo,
      fillColor: CHART_PALETTE.indigo,
      points: revenuePts,
      isCurrency: true,
    },
  ];

  const bookingsSeries: BarSeries[] = [
    { key: "confirmed", label: "Confirmed", color: CHART_PALETTE.indigo, points: bookingsConfirmedPts },
    { key: "cancelled", label: "Cancelled", color: CHART_PALETTE.rose, points: bookingsCancelledPts },
  ];

  const occupancySeries: BarSeries[] = [
    { key: "upcoming", label: "Upcoming Stays", color: CHART_PALETTE.teal, points: upcomingPts },
    { key: "occupancy", label: "Occupied Nights", color: CHART_PALETTE.indigoLight, points: occupancyPts },
  ];

  const bookingSlices = breakdownToSlices(analytics.breakdowns?.bookingStatus);
  const opsSlices = breakdownToSlices(analytics.breakdowns?.opsTaskStatus);

  return (
    <div className="space-y-4">
      {/* Row 1: Earnings + Bookings */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Net Payout Earnings"
          subtitle="Your vendor net payout trend"
        >
          <AreaTrendChart series={revSeries} formatValue={formatTooltipCurrency} />
        </ChartCard>

        <ChartCard
          title="Bookings Trend"
          subtitle="Confirmed vs cancelled bookings per period"
        >
          <div className="mb-2 flex flex-wrap gap-4">
            <SeriesLegend color={CHART_PALETTE.indigo} label="Confirmed" />
            <SeriesLegend color={CHART_PALETTE.rose} label="Cancelled" />
          </div>
          <BarTrendChart series={bookingsSeries} />
        </ChartCard>
      </div>

      {/* Row 2: Occupancy + Breakdowns */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Occupancy & Upcoming Stays"
          subtitle="Upcoming check-ins and occupied nights per period"
        >
          <div className="mb-2 flex flex-wrap gap-4">
            <SeriesLegend color={CHART_PALETTE.teal} label="Upcoming Stays" />
            <SeriesLegend color={CHART_PALETTE.indigoLight} label="Occupied Nights" />
          </div>
          <BarTrendChart series={occupancySeries} />
        </ChartCard>

        <div className="grid gap-4 sm:grid-cols-2">
          <ChartCard title="Booking Status">
            <DonutBreakdownChart slices={bookingSlices} size={110} />
          </ChartCard>
          <ChartCard title="Ops Task Status">
            <DonutBreakdownChart slices={opsSlices} size={110} />
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function SeriesLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span className="text-[11px] text-[#6b7280]">{label}</span>
    </div>
  );
}
