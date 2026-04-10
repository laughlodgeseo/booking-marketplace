"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  | {
      kind: "ready";
      data: Awaited<ReturnType<typeof getUserCustomerDocuments>>;
    };

const DOCUMENT_TYPES: Array<{ value: CustomerDocumentType; label: string }> = [
  { value: "PASSPORT", label: "Passport" },
  { value: "EMIRATES_ID", label: "Emirates ID" },
  { value: "VISA", label: "Visa" },
  { value: "SELFIE", label: "Selfie" },
  { value: "OTHER", label: "Other" },
];

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AccountDocumentsPage() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [uploadType, setUploadType] = useState<CustomerDocumentType>("PASSPORT");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const data = await getUserCustomerDocuments();
      setState({ kind: "ready", data });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to load documents",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload() {
    if (!uploadFile) {
      setMessage("Please select a file before uploading.");
      return;
    }

    setBusy("Uploading document...");
    setUploadingFileName(uploadFile.name);
    setMessage(null);
    try {
      await uploadUserCustomerDocument({
        file: uploadFile,
        type: uploadType,
        notes: uploadNotes,
      });
      setUploadFile(null);
      setUploadNotes("");
      setMessage("Document uploaded successfully.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to upload document");
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
      setMessage(error instanceof Error ? error.message : "Failed to download document");
    } finally {
      setBusy(null);
    }
  }

  async function remove(doc: UserCustomerDocument) {
    const confirmed = window.confirm("Delete this document?");
    if (!confirmed) return;

    setBusy("Deleting document...");
    setMessage(null);
    try {
      await deleteUserCustomerDocument(doc.id);
      await load();
      setMessage("Document deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete document");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell
      role="customer"
      title="My Documents"
      subtitle="Upload and track guest verification documents"
    >
      <div className="space-y-5">
        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-52" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-3xl border border-danger/30 bg-danger/12 p-5 text-sm text-danger">
            {state.message}
          </div>
        ) : (
          <>
            {state.data.requirement.requiresUpload ? (
              <section className="rounded-3xl border border-warning/40 bg-warning/12 p-5">
                <div className="text-sm font-semibold text-primary">
                  Action required: upload guest documents
                </div>
                <div className="mt-2 text-sm text-secondary">
                  Missing: {state.data.requirement.missingTypes.join(", ")}
                </div>
                {state.data.requirement.nextBooking ? (
                  <div className="mt-1 text-xs text-secondary">
                    Next check-in: {formatDateTime(state.data.requirement.nextBooking.checkIn)} at{" "}
                    {state.data.requirement.nextBooking.property.title}
                    {state.data.requirement.urgent ? " (Urgent: check-in within 48 hours)" : ""}
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="rounded-3xl border border-success/35 bg-success/12 p-5">
                <div className="text-sm font-semibold text-primary">
                  Documents are verified
                </div>
                <div className="mt-2 text-sm text-secondary">
                  No pending uploads are required for upcoming confirmed bookings.
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Upload document</div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select
                  value={uploadType}
                  onChange={(event) => setUploadType(event.target.value as CustomerDocumentType)}
                  className="h-10 rounded-xl border border-line/80 bg-surface px-3 text-sm font-semibold text-primary"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  className="h-10 rounded-xl border border-line/80 bg-surface px-3 text-sm text-primary"
                />
              </div>
              <textarea
                rows={3}
                value={uploadNotes}
                onChange={(event) => setUploadNotes(event.target.value)}
                placeholder="Notes for admin (optional)"
                className="mt-3 w-full rounded-xl border border-line/80 bg-surface px-3 py-2 text-sm text-primary"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-secondary">
                  Accepted files: PDF, JPG, PNG, WEBP, HEIC (max 15MB)
                </div>
                <button
                  type="button"
                  disabled={busy !== null || !uploadFile}
                  onClick={() => void upload()}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-60"
                >
                  Upload
                </button>
              </div>
              {busy ? (
                <div className="mt-3 rounded-xl border border-line/70 bg-warm-base p-3 text-xs font-semibold text-secondary">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-brand/25 border-t-brand animate-spin" />
                    <span>{busy}</span>
                  </div>
                  {uploadingFileName ? (
                    <div className="mt-1 text-[11px] text-muted break-all">File: {uploadingFileName}</div>
                  ) : null}
                </div>
              ) : null}
              {message ? (
                <div className="mt-3 rounded-xl border border-line/70 bg-warm-base p-3 text-sm text-secondary">
                  {message}
                </div>
              ) : null}
            </section>

            <section className="rounded-3xl border border-line/70 bg-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-primary">Uploaded documents</div>
              {state.data.items.length === 0 ? (
                <div className="mt-3 rounded-2xl border border-dashed border-line/70 bg-warm-base p-4 text-sm text-secondary">
                  No documents uploaded yet.
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {state.data.items.map((doc) => (
                    <div
                      key={doc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/account/documents/${encodeURIComponent(doc.id)}`)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/account/documents/${encodeURIComponent(doc.id)}`);
                        }
                      }}
                      className="rounded-2xl border border-line/70 bg-warm-base p-4 transition hover:bg-accent-soft/35"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-primary">
                            {doc.type}
                          </div>
                          <div className="mt-1 text-xs text-secondary">
                            Uploaded: {formatDateTime(doc.createdAt)}
                          </div>
                          {doc.reviewNotes ? (
                            <div className="mt-1 text-xs text-secondary">Admin note: {doc.reviewNotes}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusPill status={doc.status}>{doc.status}</StatusPill>
                          <Link
                            href={`/account/documents/${encodeURIComponent(doc.id)}`}
                            onClick={(event) => event.stopPropagation()}
                            className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt"
                          >
                            View
                          </Link>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={(event) => {
                              event.stopPropagation();
                              void download(doc);
                            }}
                            className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            disabled={busy !== null}
                            onClick={(event) => {
                              event.stopPropagation();
                              void remove(doc);
                            }}
                            className="rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/12 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 grid gap-2 text-xs text-muted sm:grid-cols-3">
                        <span>Verified: {formatDateTime(doc.verifiedAt)}</span>
                        <span>Reviewed: {formatDateTime(doc.reviewedAt)}</span>
                        <span>Filename: {doc.originalName || "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PortalShell>
  );
}
