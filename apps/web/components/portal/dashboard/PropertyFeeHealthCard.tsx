"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, Receipt } from "lucide-react";
import { formatCurrencyMinor } from "./dashboard-formatters";

export interface FeeBreakdown {
  activation?: { status: string; amountMinor: number };
  insurance?: { status: string; amountMinor: number };
  furnishing?: { status: string; amountMinor: number };
}

interface VendorFeeProps {
  outstandingMinor: number;
  paidMinor: number;
  totalDueMinor: number;
  items?: FeeBreakdown[];
  payHref: string;
  viewHref: string;
}

function FeeRow({ label, status }: { label: string; status?: string }) {
  const paid = status === "PAID" || status === "WAIVED";
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-[#6b7280]">{label}</span>
      <span
        className={[
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
          paid
            ? "bg-[#dcfce7] text-[#16a34a]"
            : status
              ? "bg-[#fef9c3] text-[#a16207]"
              : "bg-[#f3f4f6] text-[#6b7280]",
        ].join(" ")}
      >
        {paid ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertTriangle className="h-2.5 w-2.5" />}
        {paid ? "Paid" : status ? "Unpaid" : "N/A"}
      </span>
    </div>
  );
}

export function VendorPropertyFeeCard({
  outstandingMinor,
  paidMinor,
  totalDueMinor,
  items,
  payHref,
  viewHref,
}: VendorFeeProps) {
  const allClear = outstandingMinor === 0;

  return (
    <div
      className={[
        "rounded-2xl border p-4 shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:p-5",
        allClear
          ? "border-[#bbf7d0] bg-[#f0fdf4]"
          : "border-[#fde68a] bg-[#fffdf0]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e1b4b]">
        <div
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            allClear ? "bg-[#16a34a] text-white" : "bg-[#f59e0b] text-white",
          ].join(" ")}
        >
          {allClear ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
        </div>
        Property Fees
      </div>

      {allClear ? (
        <div className="mt-3 text-sm font-medium text-[#16a34a]">
          All property fees are clear.
        </div>
      ) : (
        <div className="mt-3">
          <div className="text-2xl font-bold text-[#78350f]">
            {formatCurrencyMinor(outstandingMinor)}
          </div>
          <div className="text-xs text-[#92400e]">outstanding</div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-white/60 py-2">
          <div className="text-sm font-semibold text-[#1e1b4b]">{formatCurrencyMinor(paidMinor, true)}</div>
          <div className="text-[10px] text-[#9ca3af]">paid</div>
        </div>
        <div className="rounded-xl bg-white/60 py-2">
          <div className="text-sm font-semibold text-[#1e1b4b]">{formatCurrencyMinor(totalDueMinor, true)}</div>
          <div className="text-[10px] text-[#9ca3af]">total due</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!allClear && (
          <Link
            href={payHref}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#4338ca]"
          >
            Pay outstanding <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        <Link
          href={viewHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition hover:bg-[#f9fafb]"
        >
          View property fees
        </Link>
      </div>
    </div>
  );
}

interface AdminFeeProps {
  totalDueMinor: number;
  paidMinor: number;
  outstandingMinor: number;
  viewHref: string;
}

export function AdminPropertyFeeCard({ totalDueMinor, paidMinor, outstandingMinor, viewHref }: AdminFeeProps) {
  const paidPct = totalDueMinor > 0 ? Math.round((paidMinor / totalDueMinor) * 100) : 0;

  return (
    <div className="rounded-2xl border border-[#e8e8f0] bg-white p-4 shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1e1b4b]">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[#d97706]">
          <Receipt className="h-3.5 w-3.5" />
        </div>
        Property Fee Tracking
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-[#f9fafb] py-2.5">
          <div className="text-base font-bold text-[#1e1b4b]">{formatCurrencyMinor(totalDueMinor, true)}</div>
          <div className="text-[10px] text-[#9ca3af]">total issued</div>
        </div>
        <div className="rounded-xl bg-[#f0fdf4] py-2.5">
          <div className="text-base font-bold text-[#16a34a]">{formatCurrencyMinor(paidMinor, true)}</div>
          <div className="text-[10px] text-[#9ca3af]">collected</div>
        </div>
        <div className="rounded-xl bg-[#fef9c3] py-2.5">
          <div className="text-base font-bold text-[#a16207]">{formatCurrencyMinor(outstandingMinor, true)}</div>
          <div className="text-[10px] text-[#9ca3af]">outstanding</div>
        </div>
      </div>

      {totalDueMinor > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] text-[#9ca3af]">
            <span>Collection rate</span>
            <span className="font-semibold text-[#374151]">{paidPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
            <div
              className="h-2 rounded-full bg-[#16a34a] transition-all"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      <Link
        href={viewHref}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-xs font-semibold text-[#374151] transition hover:bg-[#f1f5f9]"
      >
        View property fee tracking <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
