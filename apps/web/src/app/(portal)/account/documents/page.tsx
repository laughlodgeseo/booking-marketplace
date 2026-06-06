"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, RefreshCw, ShieldCheck, Trash2, Upload } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  deleteUserCustomerDocument,
  downloadUserCustomerDocument,
  getUserCustomerDocuments,
  uploadUserCustomerDocument,
  type CustomerDocumentType,
  type UserCustomerDocument,
} from "@/lib/api/portal/user";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserCustomerDocuments>> };

const DOCUMENT_TYPES: Array<{ value: CustomerDocumentType; label: string }> = [
  { value: "PASSPORT", label: "Passport" },
  { value: "EMIRATES_ID", label: "Emirates ID" },
  { value: "VISA", label: "Visa" },
  { value: "SELFIE", label: "Selfie" },
  { value: "OTHER", label: "Other" },
];

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyDocType(t: string): string {
  return t.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export default function AccountDocumentsPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [uploadType, setUploadType] = useState<CustomerDocumentType>("PASSPORT");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await getUserCustomerDocuments();
      setState({ kind: "ready", data });
    } catch (error) {
      setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load documents" });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function upload() {
    if (!uploadFile) {
      setMessage({ kind: "error", text: "Please select a file before uploading." });
      return;
    }
    setBusy("Uploading document...");
    setUploadingFileName(uploadFile.name);
    setMessage(null);
    try {
      await uploadUserCustomerDocument({ file: uploadFile, type: uploadType, notes: uploadNotes });
      setUploadFile(null);
      setUploadNotes("");
      setMessage({ kind: "success", text: "Document uploaded successfully." });
      await load();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Failed to upload document" });
    } finally {
      setBusy(null);
      setUploadingFileName(null);
    }
  }

  async function download(doc: UserCustomerDocument) {
    setBusy(`Downloading ${doc.type}...`);
    setMessage(null);
    try {
      const blob = await downloadUserCustomerDocument(doc.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = doc.originalName || `${doc.type.toLowerCase()}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Failed to download document" });
    } finally {
      setBusy(null);
    }
  }

  async function remove(doc: UserCustomerDocument) {
    if (!window.confirm("Delete this document?")) return;
    setBusy("Deleting document...");
    setMessage(null);
    try {
      await deleteUserCustomerDocument(doc.id);
      await load();
      setMessage({ kind: "success", text: "Document deleted." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Failed to delete document" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell role="customer" title="My Documents" subtitle="Upload and track guest verification documents">
      <div className="space-y-5">
        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-44" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
            <div className="text-sm font-semibold text-primary">Could not load documents</div>
            <div className="mt-1 text-sm text-secondary">{state.message}</div>
            <button type="button" onClick={() => void load()} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Compliance status banner */}
            {state.data.requirement.requiresUpload ? (
              <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/8 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/16 text-warning">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-primary">Action required — upload guest documents</div>
                  <div className="mt-0.5 text-xs text-secondary">
                    Missing: {state.data.requirement.missingTypes.map(prettyDocType).join(", ")}
                    {state.data.requirement.urgent ? " · Urgent: check-in within 48 hours" : ""}
                  </div>
                  {state.data.requirement.nextBooking ? (
                    <div className="mt-1 text-[11px] text-muted">
                      Next check-in: {formatDateTime(state.data.requirement.nextBooking.checkIn)} at {state.data.requirement.nextBooking.property.title}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/8 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-success/14 text-success">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-primary">Documents verified</div>
                  <div className="mt-0.5 text-xs text-secondary">No pending uploads required for upcoming confirmed bookings.</div>
                </div>
              </div>
            )}

            {/* Upload form */}
            <div className="rounded-2xl border border-line/40 bg-surface/90 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Upload className="h-3.5 w-3.5" />
                </div>
                <div className="text-sm font-semibold text-primary">Upload document</div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value as CustomerDocumentType)}
                  className="portal-select h-10 text-sm"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  className="h-10 rounded-xl border border-line/40 bg-neutral-50 px-3 text-sm text-primary file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-brand"
                />
              </div>
              <textarea
                rows={2}
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Notes for admin (optional)"
                className="mt-3 w-full resize-none rounded-xl border border-line/40 bg-neutral-50 px-3 py-2 text-sm text-primary outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/12 transition-all"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] text-muted">PDF, JPG, PNG, WEBP, HEIC · max 15 MB</div>
                <button
                  type="button"
                  disabled={busy !== null || !uploadFile}
                  onClick={() => void upload()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60 transition"
                >
                  {busy ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {busy ? "Uploading..." : "Upload"}
                </button>
              </div>

              {uploadingFileName ? (
                <div className="mt-3 text-[11px] text-muted break-all">File: {uploadingFileName}</div>
              ) : null}

              {message ? (
                <div className={`mt-3 rounded-xl border px-3 py-2 text-sm ${message.kind === "success" ? "border-success/25 bg-success/8 text-success" : "border-danger/20 bg-danger/8 text-danger"}`}>
                  {message.text}
                </div>
              ) : null}
            </div>

            {/* Document list */}
            <div>
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Uploaded documents ({state.data.items.length})
              </div>

              {state.data.items.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-muted">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-primary">No documents uploaded yet</div>
                  <div className="mt-1 text-xs text-muted">Upload your first document using the form above.</div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {state.data.items.map((doc) => (
                    <article
                      key={doc.id}
                      onClick={() => router.push(`/account/documents/${encodeURIComponent(doc.id)}`)}
                      className="portal-record-card group cursor-pointer"
                    >
                      <div className="px-4 py-4 sm:px-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-100">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold text-primary">{prettyDocType(doc.type)}</div>
                                <div className="mt-0.5 text-[11px] text-muted">Uploaded {formatDateTime(doc.createdAt)}</div>
                                {doc.reviewNotes ? (
                                  <div className="mt-1 text-[11px] text-secondary">Admin note: {doc.reviewNotes}</div>
                                ) : null}
                              </div>
                              <StatusPill status={doc.status}>{prettyStatus(doc.status)}</StatusPill>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Link
                                href={`/account/documents/${encodeURIComponent(doc.id)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={(e) => { e.stopPropagation(); void download(doc); }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60 transition"
                              >
                                <Download className="h-3 w-3" /> Download
                              </button>
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={(e) => { e.stopPropagation(); void remove(doc); }}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-danger/20 bg-danger/8 px-3 text-xs font-semibold text-danger hover:bg-danger/14 disabled:opacity-60 transition"
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </button>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted">
                              {doc.verifiedAt ? <span>Verified {formatDateTime(doc.verifiedAt)}</span> : null}
                              {doc.reviewedAt ? <span>Reviewed {formatDateTime(doc.reviewedAt)}</span> : null}
                              {doc.originalName ? <span className="font-mono truncate max-w-[180px]">{doc.originalName}</span> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
