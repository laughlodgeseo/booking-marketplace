"use client";

import { useEffect, useState } from "react";
import { CreditCard, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getVendorPropertyFees, type VendorPropertyFeesResponse } from "@/lib/api/portal/vendor";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: VendorPropertyFeesResponse };

function FeeBadge({ status }: { status: string }) {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
      <AlertCircle className="h-3 w-3" /> Unpaid
    </span>
  );
}

function FeeTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = {
    ACTIVATION: "Activation Fee",
    INSURANCE: "Property Insurance",
    FURNISHING: "Furnishing Fee",
  };
  return <span>{map[type] ?? type}</span>;
}

function PropertyFeeStatus({ status }: { status: string }) {
  if (status === "paid") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">All paid</span>;
  }
  if (status === "partially_paid") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-bold text-brand">Partial</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">Outstanding</span>;
}

export default function VendorPropertyFeesPage() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    getVendorPropertyFees()
      .then((data) => setView({ kind: "ready", data }))
      .catch((e: unknown) =>
        setView({ kind: "error", message: e instanceof Error ? e.message : "Failed to load fees." })
      );
  }, []);

  return (
    <PortalShell role="vendor" title="Property Fees" subtitle="Fee obligations across your approved properties">
      {view.kind === "loading" && (
        <div className="space-y-4">
          <SkeletonBlock className="h-28 rounded-3xl" />
          <SkeletonBlock className="h-48 rounded-3xl" />
          <SkeletonBlock className="h-48 rounded-3xl" />
        </div>
      )}

      {view.kind === "error" && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
          {view.message}
        </div>
      )}

      {view.kind === "ready" && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                <CreditCard className="h-3.5 w-3.5" /> Total Fees
              </div>
              <div className="text-2xl font-bold text-primary">{view.data.summary.totalDueFormatted}</div>
              <div className="mt-1 text-xs text-secondary">{view.data.summary.propertiesWithFees} propert{view.data.summary.propertiesWithFees === 1 ? "y" : "ies"} with fees</div>
            </div>
            <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Paid
              </div>
              <div className="text-2xl font-bold text-success">{view.data.summary.totalPaidFormatted}</div>
            </div>
            <div className="rounded-3xl border border-line/50 bg-surface p-5 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted">
                <AlertCircle className="h-3.5 w-3.5 text-warning" /> Outstanding
              </div>
              <div className="text-2xl font-bold text-warning">{view.data.summary.outstandingFormatted}</div>
            </div>
          </div>

          {/* Per-property fee tables */}
          {view.data.items.length === 0 ? (
            <div className="rounded-3xl border border-line/50 bg-surface p-10 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted opacity-40" />
              <p className="text-sm text-secondary">No fee records yet. Fees are generated when a property is approved by admin.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {view.data.items.map((entry) => (
                <div key={entry.propertyId} className="rounded-3xl border border-line/50 bg-surface shadow-sm overflow-hidden">
                  {/* Property header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/50 px-6 py-4">
                    <div>
                      <div className="font-semibold text-primary">{entry.propertyTitle}</div>
                      <div className="mt-0.5 text-xs text-secondary">
                        {entry.propertyCity} &middot; {entry.furnishingStatus === "FURNISHED" ? "Furnished" : entry.furnishingStatus === "UNFURNISHED" ? "Unfurnished" : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PropertyFeeStatus status={entry.feeStatus} />
                      <span className="text-xs text-muted">Outstanding: <span className="font-semibold text-primary">{entry.outstandingMinor > 0 ? `AED ${(entry.outstandingMinor / 100).toFixed(2)}` : "—"}</span></span>
                    </div>
                  </div>

                  {/* Fee rows */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line/30 bg-warm-base">
                        <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Fee type</th>
                        <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Amount</th>
                        <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.fees.map((fee) => (
                        <tr key={fee.id} className="border-b border-line/20 last:border-0">
                          <td className="px-6 py-3 text-sm text-primary"><FeeTypeLabel type={fee.type} /></td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-primary">{fee.amountFormatted}</td>
                          <td className="px-6 py-3 text-right"><FeeBadge status={fee.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-warm-base">
                        <td className="px-6 py-3 text-sm font-bold text-primary">Total</td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-primary">AED {(entry.totalDueMinor / 100).toFixed(2)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}
