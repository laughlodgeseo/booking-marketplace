"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { portalRowPrimary, portalRowSecondary } from "@/components/portal/ui/portal-actions";
import { getAdminOpsTasks } from "@/lib/api/portal/admin";

type AdminOpsTasksResponse = Awaited<ReturnType<typeof getAdminOpsTasks>>;
type AdminOpsTaskRow = AdminOpsTasksResponse["items"][number];

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminOpsTasksResponse };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) return null;
  return value as Record<string, unknown>;
}

function getString(obj: unknown, key: string): string | null {
  const rec = asRecord(obj);
  if (!rec) return null;
  const v = rec[key];
  return typeof v === "string" ? v : null;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminOpsTasksPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminOpsTasks({ page, pageSize });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (err) {
        if (!alive) return;
        setState({ kind: "error", message: err instanceof Error ? err.message : "Failed to load ops tasks" });
      }
    }
    void run();
    return () => { alive = false; };
  }, [page]);

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;
    const items = state.data.items ?? [];

    const statuses = Array.from(new Set(items.map((r) => getString(r, "status")).filter((v): v is string => Boolean(v)))).sort();
    const types = Array.from(new Set(items.map((r) => getString(r, "type")).filter((v): v is string => Boolean(v)))).sort();

    const needle = q.trim().toLowerCase();
    const filtered = items
      .filter((r) => statusFilter === "ALL" || getString(r, "status") === statusFilter)
      .filter((r) => typeFilter === "ALL" || getString(r, "type") === typeFilter)
      .filter((r) => !needle || JSON.stringify(r).toLowerCase().includes(needle));

    const total = typeof (state.data as Record<string, unknown>).total === "number"
      ? (state.data as { total: number }).total
      : filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return { filtered, statuses, types, total, totalPages };
  }, [state, q, statusFilter, typeFilter]);

  return (
    <PortalShell role="admin" title="Ops Tasks" subtitle="Operational tasks auto-created from bookings and workflows">
      <div className="space-y-4">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search task ID, type, status, booking..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="portal-select">
            <option value="ALL">All types</option>
            {(derived?.types ?? []).map((t) => <option key={t} value={t}>{prettyStatus(t)}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="portal-select">
            <option value="ALL">All statuses</option>
            {(derived?.statuses ?? []).map((s) => <option key={s} value={s}>{prettyStatus(s)}</option>)}
          </select>
          {derived ? (
            <div className="ml-auto hidden text-[11px] text-muted sm:block">{derived.filtered.length} tasks</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5 text-sm text-danger">
            {state.message}
          </div>
        ) : !derived || derived.filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No tasks match</div>
            <div className="mt-1 text-xs text-muted">Try adjusting your filters.</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {derived.filtered.map((row: AdminOpsTaskRow, idx) => {
              const id = getString(row, "id") ?? String(idx);
              const status = getString(row, "status");
              const type = getString(row, "type") ?? "—";
              const propertyId = getString(row, "propertyId");
              const bookingId = getString(row, "bookingId");
              const dueAt = getString(row, "dueAt") ?? getString(row, "scheduledAt");

              return (
                <Link
                  key={id}
                  href={`/admin/ops-tasks/${encodeURIComponent(id)}`}
                  onClick={(event) => { event.preventDefault(); router.push(`/admin/ops-tasks/${encodeURIComponent(id)}`); }}
                  className="portal-record-card block"
                >
                  <div className="p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-primary">{prettyStatus(type)}</div>
                            <div className="mt-0.5 font-mono text-[10px] text-muted">#{id.slice(0, 8)}</div>
                          </div>
                          {status ? <StatusPill status={status}>{prettyStatus(status)}</StatusPill> : null}
                        </div>
                        <div className="mt-2 grid gap-1 text-[11px] text-secondary">
                          {propertyId ? <div>Property: <span className="font-mono">{propertyId.slice(0, 8)}</span></div> : null}
                          {bookingId ? <div>Booking: <span className="font-mono">{bookingId.slice(0, 8)}</span></div> : null}
                          {dueAt ? <div>Due: {formatDate(dueAt)}</div> : null}
                        </div>
                        <div className="mt-4">
                          <span className={portalRowPrimary}>Open task</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {derived && derived.totalPages > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
            <div className="text-xs text-muted">Page {page} of {derived.totalPages} · {derived.total} records</div>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={portalRowSecondary}>Previous</button>
              <button type="button" disabled={page >= derived.totalPages} onClick={() => setPage((p) => Math.min(derived.totalPages, p + 1))} className={portalRowSecondary}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
