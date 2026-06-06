"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { portalActionDanger, portalRowPrimary, portalRowSecondary } from "@/components/portal/ui/portal-actions";
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
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AdminDeletionRequestsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [status, setStatus] = useState<StatusFilter>("PENDING");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminPropertyDeletionRequests({ status: status === "ALL" ? undefined : status, page: 1, pageSize: 50 });
        if (!alive) return;
        setState({ kind: "ready", items: data.items ?? [] });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load deletion requests" });
      }
    }
    void load();
    return () => { alive = false; };
  }, [status]);

  async function approve(request: AdminPropertyDeletionRequest) {
    const note = window.prompt("Optional approval note:", "") ?? "";
    setBusy(`Approving ${request.id}...`);
    try {
      await approveAdminPropertyDeletionRequest(request.id, note);
      setState({ kind: "loading" });
      const data = await getAdminPropertyDeletionRequests({ status: status === "ALL" ? undefined : status, page: 1, pageSize: 50 });
      setState({ kind: "ready", items: data.items ?? [] });
    } finally { setBusy(null); }
  }

  async function reject(request: AdminPropertyDeletionRequest) {
    const note = window.prompt("Reason for rejection:", "") ?? "";
    setBusy(`Rejecting ${request.id}...`);
    try {
      await rejectAdminPropertyDeletionRequest(request.id, note);
      setState({ kind: "loading" });
      const data = await getAdminPropertyDeletionRequests({ status: status === "ALL" ? undefined : status, page: 1, pageSize: 50 });
      setState({ kind: "ready", items: data.items ?? [] });
    } finally { setBusy(null); }
  }

  const items = useMemo(() => state.kind === "ready" ? state.items : [], [state]);

  return (
    <PortalShell role="admin" title="Deletion Requests" subtitle="Approve or reject vendor listing deletion requests">
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
                  : portalRowSecondary
              }`}
            >
              {label}
            </button>
          ))}
          {busy ? <div className="ml-auto text-xs text-muted">{busy}</div> : null}
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No deletion requests</div>
            <div className="mt-1 text-xs text-muted">There are no requests for the selected filter.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((request) => {
              const propertyTitle = request.property?.title ?? request.propertyTitleSnapshot ?? "Property";
              const propertyCity = request.property?.city ?? request.propertyCitySnapshot ?? "—";
              const vendor = request.requestedByVendor?.fullName ?? request.requestedByVendor?.email ?? "Vendor";
              return (
                <article key={request.id} className="portal-record-card">
                  <div className="px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Trash2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-primary">{propertyTitle}</div>
                            <div className="mt-0.5 text-[11px] text-muted">
                              {propertyCity} · {vendor} · {formatDate(request.createdAt)}
                            </div>
                          </div>
                          <StatusPill status={request.status}>{prettyStatus(request.status)}</StatusPill>
                        </div>
                        {request.reason ? <div className="mt-2 text-xs text-secondary">Reason: {request.reason}</div> : null}
                        {request.adminNotes ? <div className="mt-1 text-xs text-muted">Admin note: {request.adminNotes}</div> : null}
                        {request.status === "PENDING" ? (
                          <div className="mt-3 flex gap-2">
                            <button type="button" disabled={busy !== null} onClick={() => void approve(request)} className={portalRowPrimary}>Approve</button>
                            <button type="button" disabled={busy !== null} onClick={() => void reject(request)} className={portalActionDanger}>Reject</button>
                          </div>
                        ) : null}
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
