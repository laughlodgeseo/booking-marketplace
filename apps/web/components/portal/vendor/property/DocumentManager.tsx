"use client";

import { useMemo, useRef, useState } from "react";
import type {
  VendorPropertyDetail,
  VendorPropertyDocument,
  PropertyDocumentType,
} from "@/lib/api/portal/vendor";
import {
  deleteVendorPropertyDocument,
  downloadVendorPropertyDocument,
  uploadVendorPropertyDocument,
  viewVendorPropertyDocument,
} from "@/lib/api/portal/vendor";
import { StatusPill } from "@/components/portal/ui/StatusPill";

type Props = {
  property: VendorPropertyDetail;
  onChanged: (next: VendorPropertyDetail) => void;
};

const REQUIRED_TYPES: Array<{ type: PropertyDocumentType; title: string; required: boolean }> = [
  { type: "OWNERSHIP_PROOF", title: "Ownership proof", required: true },
  { type: "OWNER_ID", title: "Owner ID", required: true },
  { type: "AUTHORIZATION_PROOF", title: "Authorization letter", required: true },
  { type: "ADDRESS_PROOF", title: "Address proof", required: false },
  { type: "HOLIDAY_HOME_PERMIT", title: "Holiday home permit", required: false },
  { type: "OTHER", title: "Other", required: false },
];

function prettyDocType(type: PropertyDocumentType): string {
  const entry = REQUIRED_TYPES.find((item) => item.type === type);
  return entry?.title ?? type;
}

function safeFilename(document: VendorPropertyDocument): string {
  const base = (document.originalName ?? "").trim();
  if (base.length > 0) return base;

  const ext =
    document.mimeType?.includes("pdf")
      ? ".pdf"
      : document.mimeType?.includes("png")
      ? ".png"
      : document.mimeType?.includes("jpeg") || document.mimeType?.includes("jpg")
      ? ".jpg"
      : "";

  return `${document.type.toLowerCase()}_${document.id}${ext}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function latestByType(documents: VendorPropertyDocument[]): Map<PropertyDocumentType, VendorPropertyDocument> {
  const map = new Map<PropertyDocumentType, VendorPropertyDocument>();

  for (const document of documents) {
    const current = map.get(document.type);
    if (!current) {
      map.set(document.type, document);
      continue;
    }

    const currentAt = new Date(current.createdAt).getTime();
    const nextAt = new Date(document.createdAt).getTime();
    if (nextAt > currentAt) map.set(document.type, document);
  }

  return map;
}

export function DocumentManager({ property, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<PropertyDocumentType>("OWNERSHIP_PROOF");
  const [uploadingDocName, setUploadingDocName] = useState<string | null>(null);

  const latestMap = useMemo(() => latestByType(property.documents), [property.documents]);

  const requiredProgress = useMemo(() => {
    const required = REQUIRED_TYPES.filter((item) => item.required);
    const uploaded = required.filter((item) => latestMap.has(item.type)).length;
    return { uploaded, total: required.length };
  }, [latestMap]);

  async function upload(type: PropertyDocumentType, file: File | null) {
    if (!file) return;

    setError(null);
    setUploadingDocName(file.name);
    setBusy(`Uploading ${prettyDocType(type)}...`);

    try {
      const created = await uploadVendorPropertyDocument(property.id, type, file);
      const current = Array.isArray(property.documents) ? property.documents : [];
      onChanged({ ...property, documents: [created, ...current] });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setBusy(null);
      setUploadingDocName(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function download(document: VendorPropertyDocument) {
    setError(null);
    setBusy("Downloading...");

    try {
      const blob = await downloadVendorPropertyDocument(property.id, document.id);
      triggerDownload(blob, safeFilename(document));
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Download failed");
    } finally {
      setBusy(null);
    }
  }

  async function view(document: VendorPropertyDocument) {
    setError(null);
    setBusy("Opening preview...");
    try {
      const blob = await viewVendorPropertyDocument(property.id, document.id);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) {
        triggerDownload(blob, safeFilename(document));
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : "Preview failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(document: VendorPropertyDocument) {
    const confirmed = window.confirm("Delete this document?");
    if (!confirmed) return;

    setError(null);
    setBusy("Deleting...");
    try {
      await deleteVendorPropertyDocument(property.id, document.id);
      const next = property.documents.filter((item) => item.id !== document.id);
      onChanged({ ...property, documents: next });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-primary">Documents</h3>
          <p className="mt-1 text-sm text-secondary">
            Documents are private and never public. Required for review: ownership proof,
            owner ID, and authorization letter.
          </p>
          <div className="mt-2 text-xs font-semibold text-secondary">
            Required uploaded: {requiredProgress.uploaded}/{requiredProgress.total}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value as PropertyDocumentType)}
            className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-primary"
          >
            {REQUIRED_TYPES.map((item) => (
              <option key={item.type} value={item.type}>
                {item.title}
                {item.required ? " (required)" : ""}
              </option>
            ))}
          </select>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            id="vendor-doc-upload"
            onChange={(event) => {
              const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
              void upload(selectedType, file);
            }}
          />

          <label
            htmlFor="vendor-doc-upload"
            className="cursor-pointer rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover"
          >
            Upload document
          </label>
        </div>
      </div>

      {busy ? (
        <div className="rounded-xl border border-line bg-warm-alt p-3 text-sm text-secondary">
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full border-2 border-brand/25 border-t-brand animate-spin" />
            <span>{busy}</span>
          </div>
          {uploadingDocName ? (
            <div className="mt-1 text-xs text-muted break-all">File: {uploadingDocName}</div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="whitespace-pre-wrap rounded-xl border border-danger/30 bg-danger/12 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {REQUIRED_TYPES.map((item) => {
          const uploaded = latestMap.get(item.type) ?? null;
          return (
            <div key={item.type} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-primary">{item.title}</div>
                  <div className="mt-1 text-xs text-muted">
                    {item.required ? "Required" : "Optional"}
                  </div>
                </div>

                <StatusPill tone={uploaded ? "success" : item.required ? "danger" : "neutral"}>
                  {uploaded ? "Uploaded" : item.required ? "Missing" : "Optional"}
                </StatusPill>
              </div>

              {uploaded ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-warm-alt p-3">
                  <div className="min-w-0 text-xs text-secondary">
                    <div className="truncate font-semibold text-primary">
                      {uploaded.originalName ?? "Unnamed file"}
                    </div>
                    <div className="mt-1">{uploaded.mimeType ?? "Unknown mime"}</div>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void view(uploaded)}
                      className="shrink-0 rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-50"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void download(uploaded)}
                      className="shrink-0 rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void remove(uploaded)}
                      className="shrink-0 rounded-xl border border-danger/30 bg-danger/12 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/12 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-xl bg-warm-alt p-3 text-xs text-secondary">
                  No document uploaded for this type yet.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-semibold text-primary">All documents</div>

        {property.documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface p-4 text-sm text-secondary">
            No documents uploaded yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {property.documents.map((document) => (
              <li key={document.id} className="rounded-xl border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-primary">
                      {prettyDocType(document.type)}
                    </div>
                    <div className="mt-1 break-words text-sm text-secondary">
                      {document.originalName ?? "Unnamed"} - {document.mimeType ?? "unknown"}
                    </div>
                    <div className="mt-1 text-xs text-muted">ID: {document.id}</div>
                  </div>

                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => view(document)}
                      className="shrink-0 rounded-xl border border-line/80 bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-warm-alt disabled:opacity-50"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void download(document)}
                      className="shrink-0 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void remove(document)}
                      className="shrink-0 rounded-xl border border-danger/30 bg-danger/12 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/12 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
