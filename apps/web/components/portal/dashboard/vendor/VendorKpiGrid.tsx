import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  DollarSign,
  Moon,
  Receipt,
  Wallet,
  Wrench,
} from "lucide-react";
import { KpiCard } from "../KpiCard";
import { formatCurrencyMinor, formatCount } from "../dashboard-formatters";

interface Props {
  kpis: Record<string, number>;
  outstandingFeesMinor?: number;
}

export function VendorKpiGrid({ kpis, outstandingFeesMinor = 0 }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <KpiCard
        label="Published Properties"
        value={formatCount(kpis.propertiesPublished)}
        helper="Live in marketplace"
        icon={<Building2 className="h-4 w-4" />}
        tone="primary"
      />
      <KpiCard
        label="Under Review"
        value={formatCount(kpis.propertiesUnderReview)}
        helper="Pending approval"
        icon={<ClipboardCheck className="h-4 w-4" />}
        tone={kpis.propertiesUnderReview > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Total Bookings"
        value={formatCount(kpis.bookingsTotal)}
        helper="All statuses"
        icon={<CalendarCheck className="h-4 w-4" />}
        tone="default"
      />
      <KpiCard
        label="Net Payout Earnings"
        value={formatCurrencyMinor(kpis.revenueCaptured, true)}
        helper="Vendor net payable"
        icon={<DollarSign className="h-4 w-4" />}
        tone="dark"
      />
      <KpiCard
        label="Upcoming Stays"
        value={formatCount(kpis.bookingsUpcoming)}
        helper="Confirmed check-ins"
        icon={<CalendarDays className="h-4 w-4" />}
        tone="default"
      />
      <KpiCard
        label="Pending Payouts"
        value={formatCurrencyMinor(kpis.pendingPayouts, true)}
        helper="Awaiting disbursement"
        icon={<Wallet className="h-4 w-4" />}
        tone={(kpis.pendingPayouts ?? 0) > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Occupancy Nights"
        value={formatCount(kpis.occupancyNights)}
        helper="Confirmed occupied"
        icon={<Moon className="h-4 w-4" />}
        tone="default"
      />
      <KpiCard
        label="Open Ops Tasks"
        value={formatCount(kpis.opsTasksOpen)}
        helper="Pending operational work"
        icon={<Wrench className="h-4 w-4" />}
        tone={kpis.opsTasksOpen > 0 ? "danger" : "default"}
      />
      {outstandingFeesMinor > 0 && (
        <KpiCard
          label="Outstanding Fees"
          value={formatCurrencyMinor(outstandingFeesMinor, true)}
          helper="Property fees due"
          icon={<Receipt className="h-4 w-4" />}
          tone="warning"
        />
      )}
    </div>
  );
}
