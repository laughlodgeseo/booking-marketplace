"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Search } from "lucide-react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";
import {
  getAdminReviewQueue,
  type AdminReviewQueueItem,
  type ReviewQueueStatus,
} from "@/lib/api/admin/reviewQueue";
import { ReviewQueueIllustration } from "@/components/portal/ui/PortalIllustration";

type StatusFilter = "ALL" | ReviewQueueStatus;

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: AdminReviewQueueItem[]; page: number; pageSize: number; total: number };

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function toneForStatus(s: ReviewQueueStatus): "neutral" | "success" | "warning" | "danger" {
  if (s === "APPROVED") return "success";
  if (s === "UNDER_REVIEW") return "warning";
  if (s === "APPROVED_PENDING_ACTIVATION_PAYMENT") return "warning";
  if (s === "CHANGES_REQUESTED") return "danger";
  if (s === "REJECTED") return "danger";
  return "neutral";
}

function safeLower(v: string | null | undefined): string {
  return (v ?? "").toLowerCase();
}

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "CHANGES_REQUESTED", label: "Changes Requested" },
  { value: "APPROVED_PENDING_ACTIVATION_PAYMENT", label: "Pending Payment" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AdminReviewQueuePage() {
  const [status, setStatus] = useState<StatusFilter>("UNDER_REVIEW");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [q, setQ] = useState("");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await getAdminReviewQueue({
        status: status === "ALL" ? undefined : status,
        page,
        pageSize,
      });
      setState({
        kind: "ready",
        items: res.items ?? [],
        page: res.page,
        pageSize: res.pageSize,
        total: res.total,
      });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Failed to load review queue",
      });
    }
  }, [status, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (state.kind !== "ready") return [];
    const qq = q.trim().toLowerCase();
    if (!qq) return state.items;

    return state.items.filter((p) =>
      [
        safeLower(p.title),
        safeLower(p.slug),
        safeLower(p.id),
        safeLower(p.city),
        safeLower(p.area),
        safeLower(p.vendorName ?? null),
        safeLower(p.vendorId ?? null),
      ]
        .join(" | ")
        .includes(qq)
    );
  }, [state, q]);

  const columns: Array<Column<AdminReviewQueueItem>> = useMemo(
    () => [
      {
        key: "property",
        header: "Property",
        className: "col-span-5",
        render: (row) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-primary">{row.title}</div>
            <div className="mt-1 truncate font-mono text-xs text-muted">{row.id}</div>
          </div>
        ),
      },
      {
        key: "location",
        header: "Location",
        className: "col-span-3",
        render: (row) => (
          <div>
            <div className="text-primary">{row.city}</div>
            <div className="truncate text-xs text-muted">{row.area ?? "—"}</div>
          </div>
        ),
      },
      {
        key: "vendor",
        header: "Vendor",
        className: "col-span-2",
        render: (row) => (
          <div>
            <div className="truncate text-primary">{row.vendorName ?? "—"}</div>
            <div className="truncate text-xs text-muted">{row.vendorId ?? "—"}</div>
          </div>
        ),
      },
      {
        key: "status",
        header: "Status",
        className: "col-span-2",
        render: (row) => (
          <StatusPill tone={toneForStatus(row.status)}>{prettyStatus(row.status)}</StatusPill>
        ),
      },
    ],
    []
  );

  const totalCount = state.kind === "ready" ? state.total : 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;

  return (
    <RequireAuth>
      <PortalShell
        role="admin"
        title="Review Queue"
        subtitle="Approve, reject, or request changes for vendor listings."
      >
        <div className="space-y-4">
          {/* Search command bar */}
          <div className="portal-command-bar">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                type="search"
                placeholder="Search by title, vendor, city, or ID..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted"
              />
            </div>
            <div className="shrink-0 text-xs text-muted">
              {state.kind === "ready"
                ? `${filteredItems.length} result${filteredItems.length !== 1 ? "s" : ""}`
                : "..."}
            </div>
          </div>

          {/* Status filter pills */}
          <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 sm:flex-wrap">
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                  setQ("");
                }}
                className={`h-8 shrink-0 rounded-lg px-3 text-xs font-semibold transition ${
                  status === value
                    ? "bg-brand text-white shadow-sm"
                    : "border border-line/50 bg-surface text-primary hover:bg-warm-alt"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Content states */}
          {state.kind === "loading" ? (
            <SkeletonTable rows={8} />
          ) : state.kind === "error" ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/8 p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-danger/12 text-danger">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-danger">Failed to load review queue</div>
                  <div className="mt-1 text-xs text-danger/80">{state.message}</div>
                  <button
                    type="button"
                    onClick={() => { void load(); }}
                    className="mt-3 inline-flex h-8 items-center rounded-lg bg-danger/90 px-3 text-xs font-semibold text-white transition hover:bg-danger"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 px-6 py-12 text-center">
              <ReviewQueueIllustration className="opacity-90" />
              <div className="mt-4 text-sm font-semibold text-primary">No listings in this queue</div>
              <div className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
                {q.trim()
                  ? `No results for "${q.trim()}" in the selected status.`
                  : "There are no properties matching the selected status."}
              </div>
            </div>
          ) : (
            <DataTable<AdminReviewQueueItem>
              title="Review queue"
              count={filteredItems.length}
              subtitle={
                <>
                  Showing <span className="font-semibold text-primary">{filteredItems.length}</span>{" "}
                  of <span className="font-semibold text-primary">{totalCount}</span>
                </>
              }
              columns={columns}
              rows={filteredItems}
              variant="cards"
              rowActions={(row) => (
                <Link
                  href={`/admin/review-queue/${encodeURIComponent(row.id)}`}
                  className="inline-flex h-8 items-center rounded-lg bg-brand px-3 text-xs font-semibold text-accent-text shadow-sm transition hover:bg-brand-hover hover:shadow-md active:scale-95"
                >
                  Review
                </Link>
              )}
            />
          )}

          {/* Pagination */}
          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 rounded-lg border border-line/60 px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 rounded-lg border border-line/60 px-3 text-xs font-semibold text-primary transition hover:bg-warm-alt disabled:opacity-40"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </PortalShell>
    </RequireAuth>
  );
}
