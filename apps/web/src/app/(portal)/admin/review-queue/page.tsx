"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { PortalShell } from "@/components/portal/PortalShell";
import { DataTable, type Column } from "@/components/portal/ui/DataTable";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonTable } from "@/components/portal/ui/Skeleton";
import { Toolbar } from "@/components/portal/ui/Toolbar";
import { EmptyState } from "@/components/portal/ui/EmptyState";
import NetworkErrorState from "@/components/ui/NetworkErrorState";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import {
  getAdminReviewQueue,
  type AdminReviewQueueItem,
  type ReviewQueueStatus,
} from "@/lib/api/admin/reviewQueue";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: AdminReviewQueueItem[]; page: number; pageSize: number; total: number };

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

function statusLabel(status: ReviewQueueStatus): string {
  return status.replaceAll("_", " ");
}

const STATUS_META: Record<
  ReviewQueueStatus,
  { tone: BadgeTone; activeClass: string; inactiveClass: string }
> = {
  UNDER_REVIEW: {
    tone: "warning",
    activeClass: "border-warning/40 bg-warning/14 text-warning shadow-sm",
    inactiveClass: "border-line/75 bg-surface text-secondary hover:border-warning/35 hover:bg-warning/8 hover:text-warning",
  },
  CHANGES_REQUESTED: {
    tone: "danger",
    activeClass: "border-danger/40 bg-danger/12 text-danger shadow-sm",
    inactiveClass: "border-line/75 bg-surface text-secondary hover:border-danger/35 hover:bg-danger/8 hover:text-danger",
  },
  APPROVED_PENDING_ACTIVATION_PAYMENT: {
    tone: "info",
    activeClass: "border-info/40 bg-info/12 text-info shadow-sm",
    inactiveClass: "border-line/75 bg-surface text-secondary hover:border-info/35 hover:bg-info/8 hover:text-info",
  },
  APPROVED: {
    tone: "success",
    activeClass: "border-success/40 bg-success/12 text-success shadow-sm",
    inactiveClass: "border-line/75 bg-surface text-secondary hover:border-success/35 hover:bg-success/8 hover:text-success",
  },
  REJECTED: {
    tone: "danger",
    activeClass: "border-danger/45 bg-danger/14 text-danger shadow-sm",
    inactiveClass: "border-line/75 bg-surface text-secondary hover:border-danger/35 hover:bg-danger/8 hover:text-danger",
  },
};

export default function AdminReviewQueuePage() {
  const [status, setStatus] = useState<ReviewQueueStatus>("UNDER_REVIEW");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [q, setQ] = useState("");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await getAdminReviewQueue({ status, page, pageSize });
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
    let alive = true;
    (async () => {
      try {
        const res = await getAdminReviewQueue({ status, page, pageSize });
        if (!alive) return;
        setState({
          kind: "ready",
          items: res.items ?? [],
          page: res.page,
          pageSize: res.pageSize,
          total: res.total,
        });
      } catch (e) {
        if (!alive) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load review queue",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [status, page, pageSize]);

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
        render: (row) => <StatusPill tone={toneForStatus(row.status)}>{statusLabel(row.status)}</StatusPill>,
      },
    ],
    []
  );

  const statusTabs: ReviewQueueStatus[] = [
    "UNDER_REVIEW",
    "CHANGES_REQUESTED",
    "APPROVED_PENDING_ACTIVATION_PAYMENT",
    "APPROVED",
    "REJECTED",
  ];

  return (
    <RequireAuth>
      <PortalShell
        role="admin"
        title="Review Queue"
        subtitle="Approve, reject, or request changes for vendor listings."
      >
        <div className="space-y-6">
          <Toolbar
            title="Listings awaiting review"
            subtitle="Open a listing to review photos, documents, and location details."
            searchPlaceholder="Search by title, vendor, city, or ID…"
            onSearch={setQ}
            right={
              <div className="no-scrollbar -mx-1 flex w-full max-w-full gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0 lg:pb-0">
                {statusTabs.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s);
                      setPage(1);
                      setQ("");
                    }}
                    className={[
                      "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.02em] whitespace-nowrap transition-all duration-200 ease-in-out",
                      status === s ? STATUS_META[s].activeClass : STATUS_META[s].inactiveClass,
                    ].join(" ")}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
            }
          />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-2xl border border-line/75 bg-surface p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Active queue</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_META[status].tone}>{statusLabel(status)}</Badge>
                <span className="text-xs text-secondary">
                  {state.kind === "ready" ? `${state.total} listings` : "Loading listings"}
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-line/75 bg-surface p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Visible results</div>
              <div className="mt-1 text-2xl font-semibold text-primary">
                {state.kind === "ready" ? filteredItems.length : "—"}
              </div>
              <div className="text-xs text-secondary">
                {q.trim() ? `Filtered by “${q.trim()}”` : "No text filter applied"}
              </div>
            </section>

            <section className="rounded-2xl border border-line/75 bg-surface p-4 shadow-sm sm:col-span-2 xl:col-span-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted">Review action</div>
              <div className="mt-2 text-sm text-secondary">
                Open any listing to inspect photos, documents, map location, and submit the review decision.
              </div>
            </section>
          </div>

          {state.kind === "loading" ? (
            <SkeletonTable rows={8} />
          ) : state.kind === "error" ? (
            <NetworkErrorState
              title="We're having trouble loading this"
              message={state.message}
              retryLabel="Retry review queue"
              onRetry={() => {
                void load();
              }}
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState title="No listings in this queue" description="There are no properties matching the selected status or search." />
          ) : (
            <DataTable<AdminReviewQueueItem>
              title="Review queue"
              count={filteredItems.length}
              subtitle={
                <>
                  Showing <span className="font-semibold text-primary">{filteredItems.length}</span> of{" "}
                  <span className="font-semibold text-primary">{state.total}</span>
                </>
              }
              columns={columns}
              rows={filteredItems}
              variant="cards"
              rowActions={(row) => (
                <>
                  <Link
                    href={`/admin/review-queue/${encodeURIComponent(row.id)}`}
                    className="inline-flex h-10 items-center rounded-2xl bg-brand px-4 text-sm font-semibold text-accent-text shadow-sm transition-all duration-200 ease-in-out hover:bg-brand-hover hover:shadow-md active:scale-95"
                  >
                    Review
                  </Link>
                </>
              )}
            />
          )}
        </div>
      </PortalShell>
    </RequireAuth>
  );
}
