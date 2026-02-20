"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { CardList, type CardListItem } from "@/components/portal/ui/CardList";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { FilterChips } from "@/components/portal/ui/FilterChips";
import {
  approveAdminPropertyDeletionRequest,
  getAdminPropertyDeletionRequests,
  rejectAdminPropertyDeletionRequest,
  type AdminPropertyDeletionRequest,
} from "@/lib/api/portal/admin";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: AdminPropertyDeletionRequest[] };

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminDeletionRequestsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminPropertyDeletionRequests({
          status: status === "ALL" ? undefined : status,
          page: 1,
          pageSize: 50,
        });
        if (!alive) return;
        setState({ kind: "ready", items: data.items ?? [] });
      } catch (error) {
        if (!alive) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Failed to load deletion requests",
        });
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [status]);

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await getAdminPropertyDeletionRequests({
        status: status === "ALL" ? undefined : status,
        page: 1,
        pageSize: 50,
      });
      setState({ kind: "ready", items: data.items ?? [] });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to reload",
      });
    }
  }, [status]);

  const items = useMemo<CardListItem[]>(() => {
    if (state.kind !== "ready") return [];

    return state.items.map((request) => {
      const propertyTitle = request.property?.title ?? request.propertyTitleSnapshot;
      const propertyCity = request.property?.city ?? request.propertyCitySnapshot ?? "-";
      const vendor = request.requestedByVendor?.fullName ?? request.requestedByVendor?.email ?? "Vendor";

      return {
        id: request.id,
        title: propertyTitle,
        subtitle: `${propertyCity} • Requested by ${vendor}`,
        status: <StatusPill status={request.status}>{request.status}</StatusPill>,
        meta: (
          <div className="space-y-2 text-xs">
            <div className="text-secondary">Created: {formatDate(request.createdAt)}</div>
            {request.reason ? <div className="text-secondary">Reason: {request.reason}</div> : null}
            {request.adminNotes ? <div className="text-secondary">Admin note: {request.adminNotes}</div> : null}
          </div>
        ),
        actions:
          request.status === "PENDING" ? (
            <>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  const note = window.prompt("Optional approval note:", "") ?? "";
                  setBusy(`Approving ${request.id}...`);
                  void approveAdminPropertyDeletionRequest(request.id, note)
                    .then(() => refresh())
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
                  setBusy(`Rejecting ${request.id}...`);
                  void rejectAdminPropertyDeletionRequest(request.id, note)
                    .then(() => refresh())
                    .finally(() => setBusy(null));
                }}
                className="rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-inverted hover:bg-danger disabled:opacity-60"
              >
                Reject
              </button>
            </>
          ) : null,
      };
    });
  }, [busy, refresh, state]);

  return (
    <PortalShell
      role="admin"
      title="Deletion Requests"
      subtitle="Approve or reject vendor listing deletion requests"
    >
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
            title="Deletion queue"
            subtitle="Approved requests delete the listing after booking-safety checks"
            items={items}
            emptyTitle="No deletion requests"
            emptyDescription="There are no requests for the selected filter."
          />
        )}
      </div>
    </PortalShell>
  );
}
