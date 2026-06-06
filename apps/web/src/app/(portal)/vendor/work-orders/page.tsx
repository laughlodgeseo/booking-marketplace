"use client";

import { useEffect, useMemo, useState } from "react";
import { HardHat, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getVendorMaintenanceRequests, type VendorMaintenanceRequest } from "@/lib/api/portal/vendor";

type WorkOrderRow = {
  requestId: string;
  requestTitle: string;
  requestPriority: VendorMaintenanceRequest["priority"];
  workOrder: VendorMaintenanceRequest["workOrders"][number];
};

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: WorkOrderRow[] };

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCost(amount: number | null, currency: string | null): string {
  if (amount === null) return "—";
  const cur = (currency ?? "AED").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export default function VendorWorkOrdersPage() {
  const [status, setStatus] = useState<"ALL" | "DRAFT" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED">("ALL");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const response = await getVendorMaintenanceRequests({ page: 1, pageSize: 100 });
        if (!alive) return;
        const flattened: WorkOrderRow[] = response.items.flatMap((request) =>
          request.workOrders.map((workOrder) => ({
            requestId: request.id,
            requestTitle: request.title,
            requestPriority: request.priority,
            workOrder,
          }))
        );
        setState({ kind: "ready", items: flattened });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load work orders" });
      }
    }
    void run();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => {
    if (state.kind !== "ready") return [];
    return state.items
      .filter((item) => status === "ALL" || item.workOrder.status === status)
      .filter((item) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return JSON.stringify(item).toLowerCase().includes(q);
      });
  }, [state, status, query]);

  return (
    <PortalShell role="vendor" title="Work Orders" subtitle="Execution status for maintenance work orders on your properties">
      <div className="space-y-4">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by request title, notes, status..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="portal-select">
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{items.length} orders</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">
            {state.message}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <HardHat className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No work orders</div>
            <div className="mt-1 text-xs text-muted">No work orders match the current filter.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.workOrder.id} className="portal-record-card">
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <HardHat className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-primary">{item.requestTitle}</div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            Priority: {prettyStatus(item.requestPriority)} · Created {formatDate(item.workOrder.createdAt)}
                          </div>
                        </div>
                        <StatusPill status={item.workOrder.status}>{prettyStatus(item.workOrder.status)}</StatusPill>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: "Assigned to", value: item.workOrder.assignedToUserId || "—" },
                          { label: "Estimate", value: formatCost(item.workOrder.costEstimate, item.workOrder.currency) },
                          { label: "Actual", value: formatCost(item.workOrder.actualCost, item.workOrder.currency) },
                          { label: "Completed", value: formatDate(item.workOrder.completedAt) },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-xl border border-line/40 bg-warm-base px-2.5 py-2">
                            <div className="text-[10px] font-semibold text-muted">{label}</div>
                            <div className="mt-0.5 text-xs font-semibold text-primary truncate">{value}</div>
                          </div>
                        ))}
                      </div>
                      {item.workOrder.notes ? (
                        <div className="mt-2 rounded-xl border border-line/50 bg-warm-base p-2.5 text-xs text-secondary line-clamp-2">
                          {item.workOrder.notes}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
