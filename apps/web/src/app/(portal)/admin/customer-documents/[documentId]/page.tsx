"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  approveAdminCustomerDocument,
  downloadAdminCustomerDocument,
  getAdminCustomerDocument,
  getAdminCustomerDocumentSignedViewUrl,
  rejectAdminCustomerDocument,
  type AdminCustomerDocument,
} from "@/lib/api/portal/admin";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; item: AdminCustomerDocument };

type PreviewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; url?: string }
  | { kind: "ready"; url: string; mimeType: string };

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function labelDocType(type: AdminCustomerDocument["type"]): string {
  if (type === "EMIRATES_ID") return "Emirates ID";
  return type.replaceAll("_", " ");
}

function previewAllowed(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AdminCustomerDocumentDetailPage() {
  const params = useParams<{ documentId: string }>();
  const documentId = typeof params?.documentId === "string" ? params.documentId : "";

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [preview, setPreview] = useState<PreviewState>({ kind: "idle" });
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 4500);
  }, []);

  const load = useCallback(async () => {
    if (!documentId) {
      setState({ kind: "error", message: "Invalid document id." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const item = await getAdminCustomerDocument(documentId);
      setState({ kind: "ready", item });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load document" });
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runView() {
    setPreview({ kind: "loading" });
    try {
      const { url, mimeType } = await getAdminCustomerDocumentSignedViewUrl(documentId);
      setPreview({ kind: "ready", url, mimeType: mimeType ?? "application/octet-stream" });
    } catch (error) {
      setPreview({ kind: "error", message: error instanceof Error ? error.message : "Failed to load preview" });
    }
  }

  async function approve(item: AdminCustomerDocument) {
    const notes = window.prompt("Approval note (optional):", "") ?? "";
    setBusy("Approving…");
    try {
      await approveAdminCustomerDocument(item.id, notes);
      await load();
      showToast("success", "Document approved.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to approve document.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(item: AdminCustomerDocument) {
    const notes = window.prompt("Rejection reason (optional):", "") ?? "";
    setBusy("Rejecting…");
    try {
      await rejectAdminCustomerDocument(item.id, notes);
      await load();
      showToast("success", "Document rejected.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to reject document.");
    } finally {
      setBusy(null);
    }
  }

  async function download(item: AdminCustomerDocument) {
    setBusy("Downloading…");
    try {
      const blob = await downloadAdminCustomerDocument(item.id);
      triggerBlobDownload(blob, item.originalName || `${item.type.toLowerCase()}-${item.id}.pdf`);
      showToast("success", "Download started.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to download document.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell
      role="admin"
      title="Customer Document"
      subtitle="Review document, verify identity, and take action"
      right={
        <Link
          href="/admin/customer-documents"
          className="rounded-2xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-warm-alt"
        >
          Back to documents
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          <Link href="/admin" className="hover:text-primary">Portal Home</Link>
          <span className="mx-2">/</span>
          <Link href="/admin/customer-documents" className="hover:text-primary">Guest Documents</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">Detail</span>
        </div>

        {/* Toast */}
        {toast ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            toast.kind === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}>
            {toast.message}
          </div>
        ) : null}

        {/* Busy banner */}
        {busy ? (
          <div className="rounded-2xl border border-line/70 bg-warm-base px-4 py-3 text-sm font-semibold text-secondary">
            {busy}
          </div>
        ) : null}

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-36" />
            <SkeletonBlock className="h-[460px]" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">{state.message}</div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
            {/* ── Left column ── */}
            <div className="space-y-5">
              {/* Identity + actions */}
              <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-primary">{labelDocType(state.item.type)}</h2>
                      <StatusPill status={state.item.status}>{state.item.status}</StatusPill>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-secondary">
                      {state.item.user.fullName || state.item.user.email}
                    </div>
                    <div className="mt-0.5 text-xs text-muted">{state.item.user.email}</div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-line/50 pt-4">
                  <button
                    type="button"
                    disabled={!previewAllowed(state.item.mimeType) || busy !== null}
                    onClick={() => void runView()}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {preview.kind === "loading" ? "Loading…" : "View Document"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void download(state.item)}
                    className="rounded-xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-50"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void approve(state.item)}
                    className="rounded-xl bg-success px-4 py-2 text-sm font-semibold text-inverted hover:opacity-90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void reject(state.item)}
                    className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-inverted hover:opacity-90 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </section>

              {/* Document viewer */}
              <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                <div className="text-sm font-semibold text-primary">Document Viewer</div>
                {preview.kind === "idle" ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-10 text-center text-sm text-secondary">
                    {previewAllowed(state.item.mimeType)
                      ? "Click \"View Document\" above to load the preview."
                      : "Preview is unavailable for this file type."}
                  </div>
                ) : preview.kind === "loading" ? (
                  <div className="mt-3 space-y-2">
                    <div className="rounded-2xl border border-line/70 bg-warm-base p-6 text-center text-sm text-secondary">
                      Preparing secure document preview…
                    </div>
                    <SkeletonBlock className="h-[480px]" />
                  </div>
                ) : preview.kind === "error" ? (
                  <div className="mt-3 rounded-2xl border border-danger/30 bg-danger/10 p-6">
                    <div className="font-semibold text-danger">Document preview unavailable</div>
                    <div className="mt-1 text-sm text-danger/80">
                      We could not prepare a secure preview for this file. Try opening or downloading it.
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void runView()}
                        className="rounded-xl border border-danger/30 bg-surface px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/10"
                      >
                        Retry preview
                      </button>
                      {preview.url ? (
                        <a
                          href={preview.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                        >
                          Open in new tab
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void download(state.item)}
                        className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                      >
                        Download file
                      </button>
                    </div>
                  </div>
                ) : preview.mimeType.startsWith("image/") ? (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.url}
                      alt={state.item.originalName || "Customer document"}
                      className="max-h-[600px] w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-line/70 bg-warm-base">
                    <iframe src={preview.url} title="Document preview" className="h-[640px] w-full" />
                  </div>
                )}
              </section>

              {/* Review notes */}
              {state.item.reviewNotes ? (
                <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Review Notes</div>
                  <div className="mt-2 text-sm text-primary">{state.item.reviewNotes}</div>
                </section>
              ) : null}
            </div>

            {/* ── Right sidebar ── */}
            <div className="space-y-4">
              {/* Metadata */}
              <aside className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Document Info</div>
                <div className="mt-3 space-y-3">
                  <MetaRow label="Document ID" value={state.item.id} mono />
                  <MetaRow label="MIME Type" value={state.item.mimeType || "unknown"} />
                  <MetaRow label="File name" value={state.item.originalName || "—"} />
                  <MetaRow label="Uploaded" value={fmtDateTime(state.item.createdAt)} />
                  <MetaRow label="Last updated" value={fmtDateTime(state.item.updatedAt)} />
                  <MetaRow label="Reviewed" value={fmtDateTime(state.item.reviewedAt)} />
                  <MetaRow label="Verified" value={fmtDateTime(state.item.verifiedAt)} />
                </div>
              </aside>

              {/* Booking requirement */}
              <aside className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Booking Requirement</div>
                <div className="mt-3 space-y-3">
                  <MetaRow
                    label="Missing types"
                    value={
                      state.item.requirement.missingTypes.length > 0
                        ? state.item.requirement.missingTypes.join(", ")
                        : "None — all satisfied"
                    }
                  />
                  <MetaRow
                    label="Next booking"
                    value={
                      state.item.requirement.nextBooking
                        ? `${state.item.requirement.nextBooking.property.title} — check-in ${fmtDateTime(state.item.requirement.nextBooking.checkIn)}`
                        : "No upcoming bookings"
                    }
                  />
                  {state.item.requirement.urgent ? (
                    <div className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                      Urgent — check-in within 48 hours
                    </div>
                  ) : null}
                </div>
              </aside>

              {/* Guest info */}
              <aside className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Guest</div>
                <div className="mt-3 space-y-2">
                  <MetaRow label="Name" value={state.item.user.fullName || "—"} />
                  <MetaRow label="Email" value={state.item.user.email} />
                  <MetaRow label="Member since" value={fmtDateTime(state.item.user.createdAt)} />
                </div>
              </aside>
            </div>
          </div>
        )}
      </div>
    </PortalShell>
  );
}

function MetaRow(props: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{props.label}</div>
      <div className={`mt-0.5 break-words text-sm font-semibold text-primary ${props.mono ? "font-mono text-xs" : ""}`}>
        {props.value}
      </div>
    </div>
  );
}
