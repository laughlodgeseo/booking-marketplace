"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Receipt,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";

interface QueueItem {
  label: string;
  count: number;
  href: string;
  color: "amber" | "red" | "indigo" | "slate" | "violet" | "orange";
  icon: React.ReactNode;
}

const COLOR_MAP = {
  amber:  { bg: "bg-[#fffbeb]", border: "border-[#fde68a]", text: "text-[#92400e]",   count: "bg-[#fef3c7] text-[#92400e]",   icon: "bg-[#fef3c7] text-[#d97706]" },
  red:    { bg: "bg-[#fef2f2]", border: "border-[#fecaca]", text: "text-[#7f1d1d]",   count: "bg-[#fee2e2] text-[#7f1d1d]",   icon: "bg-[#fee2e2] text-[#dc2626]" },
  indigo: { bg: "bg-[#eef2ff]", border: "border-[#c7d2fe]", text: "text-[#3730a3]",   count: "bg-[#e0e7ff] text-[#3730a3]",   icon: "bg-[#e0e7ff] text-[#4f46e5]" },
  slate:  { bg: "bg-[#f8fafc]", border: "border-[#e2e8f0]", text: "text-[#334155]",   count: "bg-[#e2e8f0] text-[#334155]",   icon: "bg-[#e2e8f0] text-[#64748b]" },
  violet: { bg: "bg-[#f5f3ff]", border: "border-[#ddd6fe]", text: "text-[#4c1d95]",   count: "bg-[#ede9fe] text-[#4c1d95]",   icon: "bg-[#ede9fe] text-[#7c3aed]" },
  orange: { bg: "bg-[#fff7ed]", border: "border-[#fed7aa]", text: "text-[#7c2d12]",   count: "bg-[#ffedd5] text-[#7c2d12]",   icon: "bg-[#ffedd5] text-[#ea580c]" },
};

function QueueCard({ label, count, href, color, icon }: QueueItem) {
  const c = COLOR_MAP[color];
  return (
    <Link
      href={href}
      className={[
        "flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        c.bg, c.border,
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
          {icon}
        </div>
        <span className={`truncate text-sm font-medium ${c.text}`}>{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.count}`}>{count}</span>
        <ArrowRight className={`h-3.5 w-3.5 ${c.text}`} />
      </div>
    </Link>
  );
}

interface Props {
  kpis: Record<string, number>;
}

export function AdminActionQueue({ kpis }: Props) {
  const items: QueueItem[] = [
    kpis.propertiesUnderReview > 0 && {
      label: "Properties Under Review",
      count: kpis.propertiesUnderReview,
      href: "/admin/review-queue",
      color: "amber" as const,
      icon: <ShieldCheck className="h-3.5 w-3.5" />,
    },
    kpis.vendorsPending > 0 && {
      label: "Vendors Pending Approval",
      count: kpis.vendorsPending,
      href: "/admin/vendors",
      color: "indigo" as const,
      icon: <Users className="h-3.5 w-3.5" />,
    },
    kpis.refundsPending > 0 && {
      label: "Refunds Requiring Attention",
      count: kpis.refundsPending,
      href: "/admin/refunds",
      color: "red" as const,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    kpis.opsTasksOpen > 0 && {
      label: "Open Ops Tasks",
      count: kpis.opsTasksOpen,
      href: "/admin/ops-tasks",
      color: "slate" as const,
      icon: <Wrench className="h-3.5 w-3.5" />,
    },
    (kpis.pendingPayoutMethods ?? 0) > 0 && {
      label: "Pending Payout Methods",
      count: kpis.pendingPayoutMethods ?? 0,
      href: "/admin/vendor-payout-methods",
      color: "violet" as const,
      icon: <CreditCard className="h-3.5 w-3.5" />,
    },
  ].filter(Boolean) as QueueItem[];

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#e8e8f0] bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fef3c7] text-[#d97706]">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold text-[#1e1b4b]">Action Queue</div>
        <div className="ml-auto text-[11px] text-[#9ca3af]">
          {items.length} {items.length === 1 ? "item" : "items"} requiring attention
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <QueueCard key={item.href} {...item} />
        ))}
      </div>
    </div>
  );
}
