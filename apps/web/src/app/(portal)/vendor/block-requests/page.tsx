"use client";

import { useEffect, useMemo, useState } from "react";
import { Ban, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { getVendorBlockRequests, type VendorBlockRequest } from "@/lib/api/portal/vendor";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: VendorBlockRequest[] };

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function VendorBlockRequestsPage() {
  const [status, setStatus] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getVendorBlockRequests({ page: 1, pageSize: 100, status });
        if (!alive) return;
        setState({ kind: "ready", items: data.items });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load block requests" });
      }
    }
    void run();
    return () => { alive = false; };
  }, [status]);

  const items = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.items;
    return state.items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [state, query]);

  return (
    <PortalShell role="vendor" title="Block Requests" subtitle="Track approval status of date blocking requests">
      <div className="space-y-4">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by property, reason, or date..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="portal-select">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{items.length} requests</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">
            {state.message}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <Ban className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No block requests</div>
            <div className="mt-1 text-xs text-muted">Submit new requests from the vendor calendar page.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="portal-record-card">
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Ban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-primary">{item.property.title}</div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {item.property.city}{item.property.area ? `, ${item.property.area}` : ""}
                          </div>
                        </div>
                        <StatusPill status={item.status}>{prettyStatus(item.status)}</StatusPill>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] text-secondary">
                          {formatDay(item.startDate)} – {formatDay(item.endDate)}
                        </span>
                      </div>
                      {item.reason ? (
                        <div className="mt-2 rounded-xl border border-line/50 bg-warm-base p-2.5 text-xs text-secondary">
                          {item.reason}
                        </div>
                      ) : null}
                      {item.reviewNotes ? (
                        <div className="mt-2 text-[11px] text-secondary">Admin note: {item.reviewNotes}</div>
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
