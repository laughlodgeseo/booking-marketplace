import {
  AlertTriangle,
  Building2,
  ClipboardCheck,
  CreditCard,
  DollarSign,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { KpiCard } from "../KpiCard";
import { formatCurrencyMinor, formatCount } from "../dashboard-formatters";

interface Props {
  kpis: Record<string, number>;
}

export function AdminKpiGrid({ kpis }: Props) {
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
        helper="Awaiting approval"
        icon={<ShieldCheck className="h-4 w-4" />}
        tone={kpis.propertiesUnderReview > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Confirmed Bookings"
        value={formatCount(kpis.bookingsConfirmed)}
        helper="Platform total"
        icon={<ClipboardCheck className="h-4 w-4" />}
        tone="default"
      />
      <KpiCard
        label="Revenue Captured"
        value={formatCurrencyMinor(kpis.revenueCaptured, true)}
        helper="Gross captured"
        icon={<DollarSign className="h-4 w-4" />}
        tone="dark"
      />
      <KpiCard
        label="Platform Commission"
        value={formatCurrencyMinor(kpis.platformCommission, true)}
        helper="18% retained"
        icon={<Wallet className="h-4 w-4" />}
        tone="success"
      />
      <KpiCard
        label="Vendor Payable"
        value={formatCurrencyMinor(kpis.vendorPayable, true)}
        helper="82% net liability"
        icon={<Wallet className="h-4 w-4" />}
        tone="default"
      />
      <KpiCard
        label="Pending Payouts"
        value={formatCurrencyMinor(kpis.pendingPayouts, true)}
        helper="Unpaid vendor net"
        icon={<AlertTriangle className="h-4 w-4" />}
        tone={(kpis.pendingPayouts ?? 0) > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Total Users"
        value={formatCount(kpis.usersTotal)}
        helper="All roles"
        icon={<Users className="h-4 w-4" />}
        tone="default"
      />
      <KpiCard
        label="Pending Vendors"
        value={formatCount(kpis.vendorsPending)}
        helper="Need review"
        icon={<Users className="h-4 w-4" />}
        tone={kpis.vendorsPending > 0 ? "warning" : "default"}
      />
      <KpiCard
        label="Open Ops Tasks"
        value={formatCount(kpis.opsTasksOpen)}
        helper="Operational workload"
        icon={<Wrench className="h-4 w-4" />}
        tone={kpis.opsTasksOpen > 0 ? "danger" : "default"}
      />
      <KpiCard
        label="Refunds Pending"
        value={formatCount(kpis.refundsPending)}
        helper="Needs action"
        icon={<AlertTriangle className="h-4 w-4" />}
        tone={kpis.refundsPending > 0 ? "danger" : "default"}
      />
      <KpiCard
        label="Payments Processing"
        value={formatCount(kpis.paymentsProcessing ?? 0)}
        helper="Pending resolution"
        icon={<CreditCard className="h-4 w-4" />}
        tone="default"
      />
    </div>
  );
}
