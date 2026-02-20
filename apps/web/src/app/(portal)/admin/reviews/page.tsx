"use client";

import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { CardList, type CardListItem } from "@/components/portal/ui/CardList";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import {
  approveAdminGuestReview,
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
  return d.toLocaleString();
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
        const data = await getAdminGuestReviews({
          status: status === "ALL" ? undefined : status,
          page: 1,
          pageSize: 50,
        });
        if (!alive) return;
        setState({ kind: "ready", items: data.items ?? [] });
      } catch (e) {
        if (!alive) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Failed to load guest reviews",
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [reloadTick, status]);

  const items = useMemo<CardListItem[]>(() => {
    if (state.kind !== "ready") return [];
    return state.items.map((review) => ({
      id: review.id,
      title: review.title || `Review for ${review.property.title}`,
      subtitle: `${review.property.title} • ${review.customer.fullName || review.customer.email}`,
      status: <StatusPill status={review.status}>{review.status}</StatusPill>,
      meta: (
        <div className="space-y-2 text-xs">
          <div className="font-semibold text-secondary">Rating: {review.rating.toFixed(1)} / 5</div>
          <div className="text-secondary">
            Cleanliness {review.cleanlinessRating}/5 · Location {review.locationRating}/5 · Comms {review.communicationRating}/5 · Value {review.valueRating}/5
          </div>
          {review.comment ? <div className="text-secondary">{review.comment}</div> : null}
          <div className="text-muted">Created: {fmtDate(review.createdAt)}</div>
          {review.adminNotes ? <div className="text-secondary">Admin note: {review.adminNotes}</div> : null}
        </div>
      ),
      actions:
        review.status === "PENDING" ? (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                const note = window.prompt("Optional approval note:", "") ?? "";
                setBusy(`Approving ${review.id}`);
                void approveAdminGuestReview(review.id, note)
                  .then(() => setReloadTick((value) => value + 1))
                  .finally(() => setBusy(null));
              }}
              className="rounded-xl bg-success px-3 py-2 text-xs font-semibold text-inverted hover:bg-success disabled:opacity-60"
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
                  .then(() => setReloadTick((value) => value + 1))
                  .finally(() => setBusy(null));
              }}
              className="rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-inverted hover:bg-danger disabled:opacity-60"
            >
              Reject
            </button>
          </>
        ) : null,
    }));
  }, [busy, state]);

  return (
    <PortalShell role="admin" title="Guest Reviews" subtitle="Moderate customer reviews before public visibility">
      <div className="space-y-5">
        <div className="portal-card rounded-3xl bg-surface/90 p-4">
          <FilterChips
            options={[
              { value: "ALL", label: "All" },
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
            value={status}
            onChange={(value) => setStatus(value)}
          />
          {busy ? <div className="mt-3 text-xs font-semibold text-secondary">{busy}</div> : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="portal-card rounded-3xl bg-danger/12 p-6 text-sm text-danger">
            {state.message}
          </div>
        ) : (
          <CardList
            title="Review moderation queue"
            subtitle="Only approved reviews appear on public property pages"
            items={items}
            emptyTitle="No reviews"
            emptyDescription="No reviews found for this filter."
          />
        )}
      </div>
    </PortalShell>
  );
}
