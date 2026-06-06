"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, RefreshCw, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { getVendorOpsTasks } from "@/lib/api/portal/vendor";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getVendorOpsTasks>> };

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}
function getString(v: unknown, key: string): string | null {
  const r = asRecord(v);
  if (!r) return null;
  return typeof r[key] === "string" ? (r[key] as string) : null;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyType(t: string): string {
  return t.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function VendorOpsTasksPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getVendorOpsTasks({ page: 1, pageSize: 100 });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (err) {
        if (!alive) return;
        setState({ kind: "error", message: err instanceof Error ? err.message : "Failed to load ops tasks" });
      }
    }
    void run();
    return () => { alive = false; };
  }, []);

  const { statuses, filtered } = useMemo(() => {
    if (state.kind !== "ready") return { statuses: [], filtered: [] };
    const items = state.data.items ?? [];
    const statuses = Array.from(new Set(items.map((r) => getString(r, "status")).filter(Boolean) as string[])).sort();
    const q = query.trim().toLowerCase();
    const filtered = items
      .filter((r) => statusFilter === "ALL" || getString(r, "status") === statusFilter)
      .filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q));
    return { statuses, filtered };
  }, [state, query, statusFilter]);

  return (
    <PortalShell role="vendor" title="Ops Tasks" subtitle="Operational tasks generated from bookings and workflows">
      <div className="space-y-4">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="portal-select">
            <option value="ALL">All statuses</option>
            {statuses.map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{filtered.length} tasks</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
            <div className="text-sm font-semibold text-primary">Could not load tasks</div>
            <div className="mt-1 text-sm text-secondary">{state.message}</div>
            <button type="button" onClick={() => setState({ kind: "loading" })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No ops tasks</div>
            <div className="mt-1 text-xs text-muted">No active tasks found for your listings.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((row, index) => {
              const id = getString(row, "id") ?? `task-${index}`;
              const type = getString(row, "type") ?? "Task";
              const status = getString(row, "status") ?? "UNKNOWN";
              const dueAt = getString(row, "dueAt") ?? getString(row, "scheduledAt");
              const bookingId = getString(row, "bookingId");

              return (
                <article
                  key={id}
                  onClick={() => router.push(`/vendor/ops-tasks/${encodeURIComponent(id)}`)}
                  className="portal-record-card group cursor-pointer"
                >
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand/16">
                        <ClipboardList className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-primary">{prettyType(type)}</div>
                            {dueAt ? <div className="mt-0.5 text-[11px] text-muted">Due {formatDate(dueAt)}</div> : null}
                          </div>
                          <StatusPill status={status}>{prettyStatus(status)}</StatusPill>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-[10px] text-muted">#{id.slice(0, 8)}</span>
                            {bookingId ? <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] text-secondary">Booking #{bookingId.slice(0, 8)}</span> : null}
                          </div>
                          <Link
                            href={`/vendor/ops-tasks/${encodeURIComponent(id)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-8 items-center gap-1 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition"
                          >
                            View task
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
