"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { Toolbar } from "@/components/portal/ui/Toolbar";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  approveAdminCustomerDocument,
  downloadAdminCustomerDocument,
  getAdminCustomerDocuments,
  rejectAdminCustomerDocument,
  viewAdminCustomerDocument,
  type AdminCustomerDocument,
  type AdminCustomerDocumentStatus,
  type AdminCustomerDocumentType,
} from "@/lib/api/portal/admin";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getAdminCustomerDocuments>> };

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminCustomerDocumentsPage() {
  const [status, setStatus] = useState<AdminCustomerDocumentStatus | "ALL">("PENDING");
  const [type, setType] = useState<AdminCustomerDocumentType | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState<ViewState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await getAdminCustomerDocuments({
        page: 1,
        pageSize: 100,
        status,
        type,
      });
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load customer documents",
      });
    }
  }, [status, type]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    if (state.kind !== "ready") return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.data.items;
    return state.data.items.filter((item) => {
      const haystack = [
        item.id,
        item.type,
        item.status,
        item.user.email,
        item.user.fullName ?? "",
        item.notes ?? "",
        item.reviewNotes ?? "",
        item.requirement.nextBooking?.id ?? "",
        item.requirement.nextBooking?.property.title ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, state]);

  async function download(item: AdminCustomerDocument) {
    setBusy(`Downloading ${item.id}...`);
    try {
      const blob = await downloadAdminCustomerDocument(item.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.originalName || `${item.type.toLowerCase()}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  }

  async function view(item: AdminCustomerDocument) {
    setBusy(`Opening ${item.id}...`);
    const newTab = window.open("", "_blank");
    if (!newTab) {
      alert("Please allow popups to view documents.");
      setBusy(null);
      return;
    }

    newTab.opener = null;
    try {
      const blob = await viewAdminCustomerDocument(item.id);
      const url = URL.createObjectURL(blob);
      newTab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      newTab.close();
    } finally {
      setBusy(null);
    }
  }

  async function approve(item: AdminCustomerDocument) {
    const notes = window.prompt("Approval note (optional):", "") ?? "";
    setBusy(`Approving ${item.id}...`);
    try {
      await approveAdminCustomerDocument(item.id, notes);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function reject(item: AdminCustomerDocument) {
    const notes = window.prompt("Rejection reason (optional):", "") ?? "";
    setBusy(`Rejecting ${item.id}...`);
    try {
      await rejectAdminCustomerDocument(item.id, notes);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell
      role="admin"
      title="Guest Documents"
      subtitle="Review customer compliance documents for confirmed stays"
    >
      <div className="space-y-5">
        <Toolbar
          title="Document Queue"
          subtitle="Approve or reject uploaded guest identity documents."
          searchPlaceholder="Search by guest email, type, booking..."
          onSearch={setQuery}
          right={(
            <div className="flex flex-wrap gap-2">
              <select
                value={type}
                onChange={(event) => setType(event.target.value as AdminCustomerDocumentType | "ALL")}
                className="h-10 rounded-xl border border-line/80 bg-surface px-3 text-sm font-semibold text-primary"
              >
                <option value="ALL">All types</option>
                <option value="PASSPORT">Passport</option>
                <option value="EMIRATES_ID">Emirates ID</option>
                <option value="VISA">Visa</option>
                <option value="SELFIE">Selfie</option>
                <option value="OTHER">Other</option>
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as AdminCustomerDocumentStatus | "ALL")}
                className="h-10 rounded-xl border border-line/80 bg-surface px-3 text-sm font-semibold text-primary"
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="VERIFIED">Verified</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}
        />

        {busy ? <div className="text-xs font-semibold text-secondary">{busy}</div> : null}

        {state.kind === "loading" ? (
          <div className="grid gap-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-5 text-sm text-danger">
            {state.message}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-line/60 bg-surface p-5 text-sm text-secondary">
            No documents found for this filter.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <section key={item.id} className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-primary">
                      {item.type} · {item.user.fullName || item.user.email}
                    </div>
                    <div className="mt-1 text-xs text-secondary">{item.user.email}</div>
                    <div className="mt-1 text-xs text-muted">
                      Uploaded {formatDateTime(item.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.requirement.urgent ? (
                      <StatusPill status="URGENT">URGENT</StatusPill>
                    ) : null}
                    <StatusPill status={item.status}>{item.status}</StatusPill>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 text-xs text-secondary sm:grid-cols-2 lg:grid-cols-4">
                  <span>Verified: {formatDateTime(item.verifiedAt)}</span>
                  <span>Reviewed: {formatDateTime(item.reviewedAt)}</span>
                  <span>Missing required: {item.requirement.missingTypes.join(", ") || "None"}</span>
                  <span>
                    Next booking:{" "}
                    {item.requirement.nextBooking
                      ? formatDateTime(item.requirement.nextBooking.checkIn)
                      : "-"}
                  </span>
                </div>

                {item.reviewNotes ? (
                  <div className="mt-3 rounded-2xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">
                    Admin note: {item.reviewNotes}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/customer-documents/${encodeURIComponent(item.id)}`}
                    className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                  >
                    Open page
                  </Link>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void view(item)}
                    className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void download(item)}
                    className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void approve(item)}
                    className="rounded-xl bg-success px-3 py-2 text-xs font-semibold text-inverted hover:bg-success disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void reject(item)}
                    className="rounded-xl bg-danger px-3 py-2 text-xs font-semibold text-inverted hover:bg-danger disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
