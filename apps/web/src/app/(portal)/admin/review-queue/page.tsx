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
import {
  approveAdminProperty,
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
  if (s === "CHANGES_REQUESTED") return "danger";
  if (s === "REJECTED") return "danger";
  return "neutral";
}

function safeLower(v: string | null | undefined): string {
  return (v ?? "").toLowerCase();
}

function canApprove(status: ReviewQueueStatus): boolean {
  return status === "UNDER_REVIEW";
}

export default function AdminReviewQueuePage() {
  const [status, setStatus] = useState<ReviewQueueStatus>("UNDER_REVIEW");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [busy, setBusy] = useState<string | null>(null);
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
        render: (row) => <StatusPill tone={toneForStatus(row.status)}>{row.status}</StatusPill>,
      },
    ],
    []
  );

  const statusTabs: ReviewQueueStatus[] = ["UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED"];

  return (
    <RequireAuth>
      <PortalShell
        role="admin"
        title="Review Queue"
        subtitle="Approve, reject, or request changes for vendor listings."
        right={
          busy ? (
            <div className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-accent-text">{busy}</div>
          ) : null
        }
      >
        <div className="space-y-6">
          <Toolbar
            title="Listings awaiting review"
            subtitle="Open a listing to review photos, documents, and location details."
            searchPlaceholder="Search by title, vendor, city, or ID…"
            onSearch={setQ}
            right={
              <div className="flex flex-wrap gap-2">
                {statusTabs.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatus(s);
                      setPage(1);
                      setQ("");
                    }}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      status === s ? "bg-brand text-accent-text" : "bg-surface text-primary ring-1 ring-line/90 hover:bg-warm-alt",
                    ].join(" ")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            }
          />

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
                    className="rounded-2xl border border-line/80 bg-surface px-3 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
                  >
                    Review
                  </Link>

                  {canApprove(row.status) ? (
                    <button
                      onClick={() => {
                        void (async () => {
                          setBusy("Approving…");
                          try {
                            await approveAdminProperty(row.id);
                            await load();
                          } finally {
                            setBusy(null);
                          }
                        })();
                      }}
                      className="rounded-2xl bg-brand px-3 py-2 text-sm font-semibold text-accent-text shadow-sm hover:opacity-95"
                    >
                      Approve
                    </button>
                  ) : null}
                </>
              )}
            />
          )}
        </div>
      </PortalShell>
    </RequireAuth>
  );
}
