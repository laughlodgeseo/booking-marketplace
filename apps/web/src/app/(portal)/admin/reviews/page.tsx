"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  approveAdminGuestReview,
  deleteAdminGuestReview,
  getAdminGuestReviews,
  rejectAdminGuestReview,
  type AdminGuestReview,
} from "@/lib/api/portal/admin";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: AdminGuestReview[] };

function fmtDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminGuestReviewsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let alive = true;
    async function load() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminGuestReviews({ status: status === "ALL" ? undefined : status, page: 1, pageSize: 50 });
        if (!alive) return;
        setState({ kind: "ready", items: data.items ?? [] });
      } catch (e) {
        if (!alive) return;
        setState({ kind: "error", message: e instanceof Error ? e.message : "Failed to load guest reviews" });
      }
    }
    void load();
    return () => { alive = false; };
  }, [reloadTick, status]);

  const FILTERS: Array<{ value: StatusFilter; label: string }> = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "REJECTED", label: "Rejected" },
  ];

  const items = useMemo(() => {
    if (state.kind !== "ready") return [];
    return state.items;
  }, [state]);

  return (
    <PortalShell role="admin" title="Guest Reviews" subtitle="Moderate customer reviews before public visibility">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line/40 bg-surface/80 px-4 py-3">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                status === value
                  ? "bg-brand text-white shadow-sm"
                  : "border border-line/50 bg-surface text-primary hover:bg-warm-alt"
              }`}
            >
              {label}
            </button>
          ))}
          {busy ? <div className="ml-auto text-xs text-muted">{busy}</div> : null}
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Star className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No reviews</div>
            <div className="mt-1 text-xs text-muted">No reviews found for this filter.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((review) => (
              <article key={review.id} className="portal-record-card">
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                      <Star className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-primary">
                            {review.title || `Review for ${review.property.title}`}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {review.property.title} · {review.customer.fullName || review.customer.email} · {fmtDate(review.createdAt)}
                          </div>
                        </div>
                        <StatusPill status={review.status}>{prettyStatus(review.status)}</StatusPill>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-secondary">
                        <span className="rounded-lg bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">★ {review.rating.toFixed(1)}/5</span>
                        <span>Clean {review.cleanlinessRating}</span>
                        <span>Loc {review.locationRating}</span>
                        <span>Comms {review.communicationRating}</span>
                        <span>Value {review.valueRating}</span>
                      </div>
                      {review.comment ? <div className="mt-2 text-xs text-secondary line-clamp-2">{review.comment}</div> : null}
                      {review.adminNotes ? <div className="mt-1 text-xs text-muted">Admin note: {review.adminNotes}</div> : null}
                      {review.status === "PENDING" ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              const note = window.prompt("Optional approval note:", "") ?? "";
                              setBusy(`Approving ${review.id}`);
                              void approveAdminGuestReview(review.id, note)
                                .then(() => setReloadTick((v) => v + 1))
                                .finally(() => setBusy(null));
                            }}
                            className="inline-flex h-8 items-center rounded-lg bg-success/90 px-3 text-xs font-semibold text-white hover:bg-success disabled:opacity-60 transition"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              const note = window.prompt("Reason for rejection:", "") ?? "";
                              setBusy(`Rejecting ${review.id}`);
                              void rejectAdminGuestReview(review.id, note)
                                .then(() => setReloadTick((v) => v + 1))
                                .finally(() => setBusy(null));
                            }}
                            className="inline-flex h-8 items-center rounded-lg bg-danger/90 px-3 text-xs font-semibold text-white hover:bg-danger disabled:opacity-60 transition"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              if (!window.confirm("Permanently delete this review? This cannot be undone.")) return;
                              setBusy(`Deleting ${review.id}`);
                              void deleteAdminGuestReview(review.id)
                                .then(() => setReloadTick((v) => v + 1))
                                .finally(() => setBusy(null));
                            }}
                            className="inline-flex h-8 items-center rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-60 transition"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={() => {
                              if (!window.confirm("Permanently delete this review? This cannot be undone.")) return;
                              setBusy(`Deleting ${review.id}`);
                              void deleteAdminGuestReview(review.id)
                                .then(() => setReloadTick((v) => v + 1))
                                .finally(() => setBusy(null));
                            }}
                            className="inline-flex h-8 items-center rounded-lg border border-danger/40 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-60 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
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
