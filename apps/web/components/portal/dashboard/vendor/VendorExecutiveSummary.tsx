"use client";

import { Building2, CalendarDays, DollarSign, Receipt } from "lucide-react";
import { formatCurrencyMinor, formatCount } from "../dashboard-formatters";

interface Props {
  propertiesPublished: number;
  upcomingStays: number;
  netPayoutMinor: number;
  outstandingFeesMinor: number;
  range: string;
}

function HeroStat({
  icon,
  value,
  label,
  tone = "white",
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: "white" | "gold" | "amber" | "rose";
}) {
  const toneStyles = {
    white: "border-white/14 bg-white/10 text-white",
    gold: "border-[#b87333]/40 bg-[#b87333]/16",
    amber: "border-[#f59e0b]/30 bg-[#f59e0b]/12",
    rose: "border-rose-400/30 bg-rose-400/12",
  };
  const valColor = {
    white: "text-white",
    gold: "text-[#f5c08a]",
    amber: "text-amber-200",
    rose: "text-rose-200",
  };
  return (
    <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${toneStyles[tone]}`}>
      <div className="shrink-0 opacity-70">{icon}</div>
      <div>
        <div className={`text-lg font-bold leading-none ${valColor[tone]}`}>{value}</div>
        <div className="mt-0.5 text-[10px] opacity-60">{label}</div>
      </div>
    </div>
  );
}

export function VendorExecutiveSummary({
  propertiesPublished,
  upcomingStays,
  netPayoutMinor,
  outstandingFeesMinor,
  range,
}: Props) {
  return (
    <div className="site-hero-shell relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-white/8 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Host Dashboard
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Vendor Dashboard
          </h2>
          <p className="mt-1 text-sm text-white/68">
            Properties, earnings, stays, and fees — {range} overview.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <HeroStat
            icon={<Building2 className="h-4 w-4 text-white" />}
            value={formatCount(propertiesPublished)}
            label="Live Properties"
            tone="white"
          />
          <HeroStat
            icon={<CalendarDays className="h-4 w-4 text-[#f5c08a]" />}
            value={formatCount(upcomingStays)}
            label="Upcoming Stays"
            tone="gold"
          />
          <HeroStat
            icon={<DollarSign className="h-4 w-4 text-emerald-200" />}
            value={formatCurrencyMinor(netPayoutMinor, true)}
            label="Net Payout Earnings"
            tone="amber"
          />
          {outstandingFeesMinor > 0 && (
            <HeroStat
              icon={<Receipt className="h-4 w-4 text-rose-200" />}
              value={formatCurrencyMinor(outstandingFeesMinor, true)}
              label="Outstanding Fees"
              tone="rose"
            />
          )}
        </div>
      </div>
    </div>
  );
}
