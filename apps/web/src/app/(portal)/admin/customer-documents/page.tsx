"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileCheck, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { portalActionDanger, portalRowPrimary, portalRowSecondary, portalRowSuccess } from "@/components/portal/ui/portal-actions";
import {
  approveAdminCustomerDocument,
  fetchAdminCustomerDocumentBlob,
  getAdminCustomerDocuments,
  rejectAdminCustomerDocument,
  triggerPortalDocumentDownload,
  type AdminCustomerDocument,
  type AdminCustomerDocumentStatus,
  type AdminCustomerDocumentType,
} from "@/lib/api/portal/admin";
import { PortalDocumentViewerModal } from "@/components/portal/documents/PortalDocumentViewerModal";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getAdminCustomerDocuments>> };

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminCustomerDocumentsPage() {
  const [status, setStatus] = useState<AdminCustomerDocumentStatus | "ALL">("PENDING");
  const [type, setType] = useState<AdminCustomerDocumentType | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [viewer, setViewer] = useState<{
    open: boolean;
    title: string;
    filename: string | null;
    contentType: string | null;
    blobUrl: string | null;
    loading: boolean;
    error: string | null;
    document: AdminCustomerDocument | null;
  }>({
    open: false,
    title: "Document preview",
    filename: null,
    contentType: null,
    blobUrl: null,
    loading: false,
    error: null,
    document: null,
  });

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminCustomerDocuments({ page: 1, pageSize: 100, status, type });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load customer documents" });
      }
    }
    void run();
    return () => { alive = false; };
  }, [status, type]);

  useEffect(() => {
    return () => {
      if (viewer.blobUrl) URL.revokeObjectURL(viewer.blobUrl);
    };
  }, [viewer.blobUrl]);

  const items = useMemo(() => {
    if (state.kind !== "ready") return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return state.data.items;
    return state.data.items.filter((item) => {
      const haystack = [item.id, item.type, item.status, item.user.email, item.user.fullName ?? "", item.notes ?? ""]
        .join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [query, state]);

  async function download(item: AdminCustomerDocument) {
    setBusy(`Downloading ${item.id}...`);
    try {
      const result = await fetchAdminCustomerDocumentBlob(item.id, "download");
      triggerPortalDocumentDownload(result);
    } finally {
      setBusy(null);
    }
  }

  async function view(item: AdminCustomerDocument) {
    setBusy(`Opening ${item.id}...`);
    if (viewer.blobUrl) URL.revokeObjectURL(viewer.blobUrl);
    setViewer({
      open: true,
      title: prettyStatus(item.type),
      filename: item.originalName,
      contentType: item.mimeType,
      blobUrl: null,
      loading: true,
      error: null,
      document: item,
    });
    try {
      const result = await fetchAdminCustomerDocumentBlob(item.id, "view");
      const url = URL.createObjectURL(result.blob);
      setViewer((current) => ({
        ...current,
        filename: result.filename,
        contentType: result.contentType,
        blobUrl: url,
        loading: false,
        error: null,
      }));
    } catch (error) {
      setViewer((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to preview document.",
      }));
    }
    finally { setBusy(null); }
  }

  function closeViewer() {
    if (viewer.blobUrl) URL.revokeObjectURL(viewer.blobUrl);
    setViewer((current) => ({ ...current, open: false, blobUrl: null, loading: false }));
  }

  async function approve(item: AdminCustomerDocument) {
    const notes = window.prompt("Approval note (optional):", "") ?? "";
    setBusy(`Approving ${item.id}...`);
    try {
      await approveAdminCustomerDocument(item.id, notes);
      setState({ kind: "loading" });
      const data = await getAdminCustomerDocuments({ page: 1, pageSize: 100, status, type });
      setState({ kind: "ready", data });
    } finally { setBusy(null); }
  }

  async function reject(item: AdminCustomerDocument) {
    const notes = window.prompt("Rejection reason (optional):", "") ?? "";
    setBusy(`Rejecting ${item.id}...`);
    try {
      await rejectAdminCustomerDocument(item.id, notes);
      setState({ kind: "loading" });
      const data = await getAdminCustomerDocuments({ page: 1, pageSize: 100, status, type });
      setState({ kind: "ready", data });
    } finally { setBusy(null); }
  }

  return (
    <PortalShell role="admin" title="Guest Documents" subtitle="Review customer compliance documents for confirmed stays">
      <PortalDocumentViewerModal
        open={viewer.open}
        onClose={closeViewer}
        title={viewer.title}
        filename={viewer.filename}
        contentType={viewer.contentType}
        blobUrl={viewer.blobUrl}
        isLoading={viewer.loading}
        error={viewer.error}
        onDownload={viewer.document ? () => void download(viewer.document as AdminCustomerDocument) : undefined}
      />
      <div className="space-y-4">
        {busy ? <div className="text-xs font-semibold text-secondary">{busy}</div> : null}

        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by guest email, type, booking..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value as AdminCustomerDocumentType | "ALL")} className="portal-select">
            <option value="ALL">All types</option>
            <option value="PASSPORT">Passport</option>
            <option value="EMIRATES_ID">Emirates ID</option>
            <option value="VISA">Visa</option>
            <option value="SELFIE">Selfie</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as AdminCustomerDocumentStatus | "ALL")} className="portal-select">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{items.length} documents</div>
          ) : null}
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
              <FileCheck className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No documents found</div>
            <div className="mt-1 text-xs text-muted">Try adjusting type or status filters.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="portal-record-card">
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-primary">
                            {prettyStatus(item.type)} · {item.user.fullName || item.user.email}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {item.user.email} · Uploaded {formatDateTime(item.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.requirement.urgent ? <StatusPill status="URGENT">Urgent</StatusPill> : null}
                          <StatusPill status={item.status}>{prettyStatus(item.status)}</StatusPill>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-secondary sm:grid-cols-4">
                        <span>Verified: {formatDateTime(item.verifiedAt)}</span>
                        <span>Reviewed: {formatDateTime(item.reviewedAt)}</span>
                        <span>Missing: {item.requirement.missingTypes.join(", ") || "None"}</span>
                        <span>Next booking: {item.requirement.nextBooking ? formatDateTime(item.requirement.nextBooking.checkIn) : "—"}</span>
                      </div>

                      {item.reviewNotes ? (
                        <div className="mt-2 rounded-xl border border-line/50 bg-warm-base p-2.5 text-xs text-secondary">
                          Admin note: {item.reviewNotes}
                        </div>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/admin/customer-documents/${encodeURIComponent(item.id)}`} className={portalRowPrimary}>
                          Open page
                        </Link>
                        <button type="button" disabled={busy !== null} onClick={() => void view(item)} className={portalRowSecondary}>
                          View
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void download(item)} className={portalRowSecondary}>
                          Download
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void approve(item)} className={`${portalRowSuccess} disabled:opacity-50`}>
                          Approve
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void reject(item)} className={portalActionDanger}>
                          Reject
                        </button>
                      </div>
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
