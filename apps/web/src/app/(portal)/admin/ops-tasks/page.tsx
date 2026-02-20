"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";
import { Toolbar } from "@/components/portal/ui/Toolbar";
import { getAdminOpsTasks } from "@/lib/api/portal/admin";

type AdminOpsTasksResponse = Awaited<ReturnType<typeof getAdminOpsTasks>>;
type AdminOpsTaskRow = AdminOpsTasksResponse["items"][number];

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: AdminOpsTasksResponse };

type FilterState = {
  q: string;
  status: string;
  type: string;
};

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

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function safeLower(v: string | null | undefined): string {
  return (v ?? "").toLowerCase();
}

function toneForTaskStatus(s: string | null): "neutral" | "success" | "warning" | "danger" {
  const v = (s ?? "").toUpperCase();
  if (v.includes("DONE") || v.includes("COMPLETE")) return "success";
  if (v.includes("CANCEL")) return "danger";
  if (v.includes("OPEN") || v.includes("PENDING")) return "warning";
  return "neutral";
}

export default function AdminOpsTasksPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  const [filters, setFilters] = useState<FilterState>({ q: "", status: "ALL", type: "ALL" });

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
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Failed to load ops tasks",
        });
      }
    }
    void run();
    return () => {
      alive = false;
    };
  }, [page, pageSize]);

  const nav = useMemo(
    () => [
      { href: "/admin", label: "Overview" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/review-queue", label: "Review Queue" },
      { href: "/admin/vendors", label: "Vendors" },
      { href: "/admin/properties", label: "Properties" },
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/refunds", label: "Refunds" },
      { href: "/admin/ops-tasks", label: "Ops Tasks" },
    ],
    [],
  );

  const derived = useMemo(() => {
    if (state.kind !== "ready") return null;

    const items = state.data.items ?? [];

    const statuses = Array.from(
      new Set(items.map((r) => getString(r, "status")).filter((v): v is string => Boolean(v))),
    ).sort((a, b) => a.localeCompare(b));

    const types = Array.from(
      new Set(items.map((r) => getString(r, "type")).filter((v): v is string => Boolean(v))),
    ).sort((a, b) => a.localeCompare(b));

    const q = filters.q.trim().toLowerCase();

    const filtered = items
      .filter((r) => (filters.status === "ALL" ? true : getString(r, "status") === filters.status))
      .filter((r) => (filters.type === "ALL" ? true : getString(r, "type") === filters.type))
      .filter((r) => {
        if (!q) return true;
        const blob = [
          safeLower(getString(r, "id")),
          safeLower(getString(r, "type")),
          safeLower(getString(r, "status")),
          safeLower(getString(r, "propertyId")),
          safeLower(getString(r, "bookingId")),
          safeLower(getString(r, "dueAt")),
          safeLower(getString(r, "scheduledAt")),
        ].join(" | ");
        return blob.includes(q);
      });

    const total =
      typeof (state.data as unknown as { total?: number }).total === "number"
        ? (state.data as unknown as { total: number }).total
        : filtered.length;

    const totalPages =
      typeof (state.data as unknown as { totalPages?: number }).totalPages === "number"
        ? (state.data as unknown as { totalPages: number }).totalPages
        : Math.max(1, Math.ceil(total / pageSize));

    return { filtered, statuses, types, total, totalPages };
  }, [state, filters, pageSize]);

  const content = useMemo(() => {
    if (state.kind === "loading") return <SkeletonTable rows={10} />;

    if (state.kind === "error") {
      return (
        <div className="rounded-2xl border border-danger/30 bg-danger/12 p-5 text-sm text-danger whitespace-pre-wrap">
          {state.message}
        </div>
      );
    }

    if (!derived) return null;

    return (
      <div className="space-y-5">
        <Toolbar
          title="Ops Tasks"
          subtitle="Operational tasks auto-created from bookings and workflows."
          searchPlaceholder="Search task id, type, status, booking id, property id…"
          onSearch={(q) => setFilters((p) => ({ ...p, q }))}
          right={
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.type}
                onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:h-10 lg:rounded-xl lg:bg-surface lg:px-3 lg:text-sm"
              >
                <option value="ALL">All types</option>
                {derived.types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                className="h-11 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-base font-semibold text-primary lg:h-10 lg:rounded-xl lg:bg-surface lg:px-3 lg:text-sm"
              >
                <option value="ALL">All statuses</option>
                {derived.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          }
        />

        <div className="overflow-hidden rounded-2xl border border-line/40 bg-warm-base/95 lg:bg-surface">
          <div className="border-b border-line/30 bg-warm-alt px-4 py-3 sm:px-5">
            <div className="text-xs font-semibold text-secondary">Tasks</div>
            <div className="mt-1 text-xs text-muted">
              Showing <span className="font-semibold text-primary">{derived.filtered.length}</span> of{" "}
              <span className="font-semibold text-primary">{derived.total}</span>
            </div>
          </div>

          {derived.filtered.length === 0 ? (
            <div className="p-6 text-sm text-secondary">No tasks match this filter.</div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {derived.filtered.map((row: AdminOpsTaskRow, idx) => {
                const id = getString(row, "id") ?? String(idx);
                const status = getString(row, "status");
                const type = getString(row, "type") ?? "—";
                const propertyId = getString(row, "propertyId") ?? "—";
                const bookingId = getString(row, "bookingId") ?? "—";
                const dueAt = getString(row, "dueAt") ?? getString(row, "scheduledAt") ?? null;

                return (
                  <Link
                    key={id}
                    href={`/admin/ops-tasks/${encodeURIComponent(id)}`}
                    onClick={(event) => {
                      event.preventDefault();
                      router.push(`/admin/ops-tasks/${encodeURIComponent(id)}`);
                    }}
                    className="rounded-2xl border border-line/40 bg-warm-base/95 p-4 text-left transition hover:bg-warm-alt lg:border-line/80 lg:bg-surface"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-primary">{id}</div>
                      <StatusPill tone={toneForTaskStatus(status)}>{status ?? "—"}</StatusPill>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-secondary">
                      <div>
                        <span className="font-semibold text-muted">Type:</span> {type}
                      </div>
                      <div>
                        <span className="font-semibold text-muted">Property:</span> {propertyId}
                      </div>
                      <div>
                        <span className="font-semibold text-muted">Booking:</span> {bookingId}
                      </div>
                      <div>
                        <span className="font-semibold text-muted">Due:</span> {fmtDate(dueAt)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-line/30 bg-warm-base/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:bg-surface">
            <div className="text-xs text-secondary">
              Page <span className="font-semibold text-primary">{page}</span> of{" "}
              <span className="font-semibold text-primary">{derived.totalPages}</span>
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary disabled:opacity-50 sm:flex-none lg:h-auto lg:rounded-xl lg:bg-transparent lg:px-3 lg:py-1.5 lg:text-xs lg:text-secondary"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(derived.totalPages, p + 1))}
                disabled={page >= derived.totalPages}
                className="h-11 flex-1 rounded-2xl border border-line/50 bg-warm-base/95 px-4 text-sm font-semibold text-primary disabled:opacity-50 sm:flex-none lg:h-auto lg:rounded-xl lg:bg-transparent lg:px-3 lg:py-1.5 lg:text-xs lg:text-secondary"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [state, derived, filters.status, filters.type, page, router]);

  return (
    <PortalShell role="admin" title="Admin Ops Tasks" nav={nav}>
      {content}
    </PortalShell>
  );
}
