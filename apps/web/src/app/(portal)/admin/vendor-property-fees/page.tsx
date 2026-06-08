"use client";

import { useEffect, useState, useCallback } from "react";
import { Building2, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getAdminVendorPropertyFees, type AdminPropertyFeesResponse } from "@/lib/api/portal/admin";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminPropertyFeesResponse };

const STATUS_OPTS = [
  { label: "All statuses", value: "" },
  { label: "Unpaid", value: "UNPAID" },
  { label: "Paid", value: "PAID" },
  { label: "Waived", value: "WAIVED" },
];

const FURNISHING_OPTS = [
  { label: "All types", value: "" },
  { label: "Furnished", value: "FURNISHED" },
  { label: "Unfurnished", value: "UNFURNISHED" },
];

function FeeBadge({ status }: { status: string }) {
  if (status === "PAID") return <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">Paid</span>;
  if (status === "WAIVED") return <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand">Waived</span>;
  return <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">Unpaid</span>;
}

const FEE_TYPE_LABELS: Record<string, string> = {
  ACTIVATION: "Activation",
  INSURANCE: "Insurance",
  FURNISHING: "Furnishing",
};

export default function AdminVendorPropertyFeesPage() {
  const [view, setView] = useState<ViewState>({ kind: "loading" });
  const [status, setStatus] = useState("");
  const [furnishingStatus, setFurnishingStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    setView({ kind: "loading" });
    getAdminVendorPropertyFees({ status: status || undefined, furnishingStatus: furnishingStatus || undefined, page, pageSize: 20 })
      .then((data) => setView({ kind: "ready", data }))
      .catch((e: unknown) =>
        setView({ kind: "error", message: e instanceof Error ? e.message : "Failed to load." })
      );
  }, [status, furnishingStatus, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = view.kind === "ready" ? Math.ceil(view.data.total / view.data.pageSize) : 1;

  return (
    <PortalShell role="admin" title="Vendor Property Fees" subtitle="Track fee obligations across all approved vendor properties">
      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={furnishingStatus}
          onChange={(e) => { setFurnishingStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        >
          {FURNISHING_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-secondary shadow-sm hover:bg-warm-alt transition"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        {view.kind === "ready" && (
          <span className="ml-auto text-xs text-muted">{view.data.total} propert{view.data.total === 1 ? "y" : "ies"} with fees</span>
        )}
      </div>

      {view.kind === "loading" && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-40 rounded-3xl" />)}
        </div>
      )}

      {view.kind === "error" && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger">
          {view.message}
        </div>
      )}

      {view.kind === "ready" && (
        <>
          {view.data.items.length === 0 ? (
            <div className="rounded-3xl border border-line/50 bg-surface p-10 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted opacity-40" />
              <p className="text-sm text-secondary">No fee records found.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {view.data.items.map((entry) => (
                <div key={entry.propertyId} className="rounded-3xl border border-line/50 bg-surface shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/50 px-6 py-4">
                    <div>
                      <div className="font-semibold text-primary">{entry.propertyTitle}</div>
                      <div className="mt-0.5 text-xs text-secondary">
                        {entry.propertyCity} &middot; {entry.furnishingStatus === "FURNISHED" ? "Furnished" : entry.furnishingStatus === "UNFURNISHED" ? "Unfurnished" : "—"} &middot; {entry.propertyStatus.replace(/_/g, " ")}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        Vendor: <span className="text-primary">{entry.vendor.fullName ?? entry.vendor.email}</span>
                        {entry.vendor.fullName && <span> &middot; {entry.vendor.email}</span>}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted space-y-1">
                      <div>Total: <span className="font-semibold text-primary">{entry.totalDueFormatted}</span></div>
                      <div className="flex items-center gap-1.5 justify-end"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Paid: <span className="font-semibold text-success">{entry.paidFormatted}</span></div>
                      {entry.outstandingMinor > 0 && (
                        <div className="flex items-center gap-1.5 justify-end"><AlertCircle className="h-3.5 w-3.5 text-warning" /> Outstanding: <span className="font-semibold text-warning">{entry.outstandingFormatted}</span></div>
                      )}
                    </div>
                  </div>

                  {/* Fee rows */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line/30 bg-warm-base">
                        <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted">Fee type</th>
                        <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Amount</th>
                        <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Status</th>
                        <th className="px-6 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-muted">Paid at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.fees.map((fee) => (
                        <tr key={fee.id} className="border-b border-line/20 last:border-0">
                          <td className="px-6 py-3 text-sm text-primary">{FEE_TYPE_LABELS[fee.type] ?? fee.type}</td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-primary">{fee.amountFormatted}</td>
                          <td className="px-6 py-3 text-right"><FeeBadge status={fee.status} /></td>
                          <td className="px-6 py-3 text-right text-xs text-muted">
                            {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-secondary shadow-sm hover:bg-warm-alt disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm text-muted">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-secondary shadow-sm hover:bg-warm-alt disabled:opacity-30 transition"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </PortalShell>
  );
}
