"use client";

import { AnalyticsIllustration } from "@/components/portal/ui/PortalIllustration";

interface Props {
  propertiesPublished: number;
  usersTotal: number;
  propertiesUnderReview: number;
  revenueCaptured: number;
  range: string;
}

function formatRevenue(minor: number): string {
  const v = minor / 100;
  if (v >= 1_000_000) return `AED ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `AED ${(v / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(v);
}

export function AdminExecutiveSummary({ propertiesPublished, usersTotal, propertiesUnderReview, revenueCaptured, range }: Props) {
  return (
    <div className="site-hero-shell relative overflow-hidden rounded-2xl p-5 sm:p-6">
      {/* Geometry grid overlay */}
      <div className="site-hero-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-white/8 blur-3xl" />
      <div className="pointer-events-none absolute left-1/4 top-0 h-32 w-32 rounded-full bg-indigo-300/18 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        {/* Title block */}
        <div className="flex items-start gap-4">
          <div className="hidden shrink-0 sm:block">
            <AnalyticsIllustration className="h-[72px] w-auto opacity-80" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Operations Center
            </div>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Admin Dashboard
            </h2>
            <p className="mt-1 text-sm text-white/68">
              Revenue, vendors, bookings, and property health — {range} overview.
            </p>
          </div>
        </div>

        {/* Hero stats */}
        <div className="flex flex-wrap gap-2.5">
          <div className="rounded-xl border border-white/14 bg-white/10 px-3 py-2 text-center">
            <div className="text-xl font-bold text-white">{propertiesPublished}</div>
            <div className="mt-0.5 text-[10px] text-white/60">Live Properties</div>
          </div>
          <div className="rounded-xl border border-white/14 bg-white/10 px-3 py-2 text-center">
            <div className="text-xl font-bold text-white">{usersTotal}</div>
            <div className="mt-0.5 text-[10px] text-white/60">Total Users</div>
          </div>
          <div className="rounded-xl border border-[#b87333]/40 bg-[#b87333]/16 px-3 py-2 text-center">
            <div className="text-xl font-bold text-[#f5c08a]">{propertiesUnderReview}</div>
            <div className="mt-0.5 text-[10px] text-[#f5c08a]/80">Awaiting Review</div>
          </div>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/12 px-3 py-2 text-center">
            <div className="text-xl font-bold text-emerald-300">{formatRevenue(revenueCaptured)}</div>
            <div className="mt-0.5 text-[10px] text-emerald-300/70">Revenue Captured</div>
          </div>
        </div>
      </div>
    </div>
  );
}
