"use client";

import { useEffect, useState } from "react";
import type { StepProps } from "../types";
import type {
  PropertyDocumentRequirement,
  PropertyDocumentType,
  VendorPropertyDocument,
} from "@/lib/api/portal/vendor";
import {
  deleteVendorPropertyDocument,
  downloadVendorPropertyDocument,
  getPropertyDocumentRequirements,
  uploadVendorPropertyDocument,
  viewVendorPropertyDocument,
} from "@/lib/api/portal/vendor";

function toDateLabel(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function latestByType(documents: VendorPropertyDocument[]): Map<PropertyDocumentType, VendorPropertyDocument> {
  const map = new Map<PropertyDocumentType, VendorPropertyDocument>();
  for (const doc of documents) {
    const existing = map.get(doc.type);
    if (!existing) {
      map.set(doc.type, doc);
      continue;
    }
    if (new Date(doc.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      map.set(doc.type, doc);
    }
  }
  return map;
}

function fileMatchesAccept(file: File, acceptRules: string[]): boolean {
  if (!acceptRules.length) return true;
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return acceptRules.some((ruleRaw) => {
    const rule = ruleRaw.trim().toLowerCase();
    if (!rule) return false;
    if (rule.endsWith("/*")) {
      const prefix = rule.slice(0, -1);
      return mime.startsWith(prefix);
    }
    if (rule.startsWith(".")) return name.endsWith(rule);
    return mime === rule;
  });
}

function filenameForDownload(document: VendorPropertyDocument): string {
  const fallback = `${document.type.toLowerCase()}-${document.id}`;
  const clean = (document.originalName ?? "").trim();
  if (clean.length > 0) return clean;
  if (document.mimeType?.includes("pdf")) return `${fallback}.pdf`;
  if (document.mimeType?.includes("png")) return `${fallback}.png`;
  if (document.mimeType?.includes("jpeg") || document.mimeType?.includes("jpg")) return `${fallback}.jpg`;
  return fallback;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function StepDocuments({ property, onPropertyUpdated }: StepProps) {
  const [requirements, setRequirements] = useState<PropertyDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await getPropertyDocumentRequirements();
        if (!alive) return;
        setRequirements(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load document requirements.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  if (!property) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-primary">Upload documents</h2>
          <p className="mt-1 text-sm text-secondary">
            Document upload becomes available after the property draft is created.
          </p>
        </div>
        <div className="rounded-2xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-warning">
          Save your property first, then return here to upload required verification documents.
        </div>
      </div>
    );
  }

  const currentProperty = property;
  const docs = Array.isArray(currentProperty.documents) ? currentProperty.documents : [];
  const latest = latestByType(docs);
  const required = requirements.filter((item) => item.required);
  const uploadedRequired = required.filter((item) => latest.has(item.id)).length;

  async function upload(req: PropertyDocumentRequirement, file: File | null) {
    if (!file) return;
    setError(null);

    const maxBytes = req.maxSizeMB * 1024 * 1024;
    if (Number.isFinite(maxBytes) && maxBytes > 0 && file.size > maxBytes) {
      setError(`${req.label}: file is too large. Max size is ${req.maxSizeMB}MB.`);
      return;
    }
    if (!fileMatchesAccept(file, req.accept ?? [])) {
      setError(`${req.label}: unsupported file format.`);
      return;
    }

    setBusyType(req.id);
    setBusyMessage(`Uploading ${req.label}...`);
    try {
      const created = await uploadVendorPropertyDocument(currentProperty.id, req.id, file);
      onPropertyUpdated({
        ...currentProperty,
        documents: [created, ...docs],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusyType(null);
      setBusyMessage(null);
    }
  }

  async function remove(document: VendorPropertyDocument) {
    const confirmed = window.confirm("Delete this document?");
    if (!confirmed) return;

    setError(null);
    setBusyType(document.type);
    setBusyMessage(`Deleting ${document.type}...`);
    try {
      await deleteVendorPropertyDocument(currentProperty.id, document.id);
      onPropertyUpdated({
        ...currentProperty,
        documents: docs.filter((item) => item.id !== document.id),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusyType(null);
      setBusyMessage(null);
    }
  }

  async function download(document: VendorPropertyDocument) {
    setError(null);
    setBusyType(document.type);
    setBusyMessage("Downloading...");
    try {
      const blob = await downloadVendorPropertyDocument(currentProperty.id, document.id);
      triggerBlobDownload(blob, filenameForDownload(document));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusyType(null);
      setBusyMessage(null);
    }
  }

  async function view(document: VendorPropertyDocument) {
    setError(null);
    setBusyType(document.type);
    setBusyMessage("Opening preview...");
    const newTab = window.open("", "_blank");
    if (!newTab) {
      alert("Please allow popups to view documents.");
      setBusyType(null);
      setBusyMessage(null);
      return;
    }

    newTab.opener = null;
    try {
      const blob = await viewVendorPropertyDocument(currentProperty.id, document.id);
      const url = URL.createObjectURL(blob);
      newTab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      newTab.close();
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setBusyType(null);
      setBusyMessage(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-primary">Upload documents</h2>
        <p className="mt-1 text-sm text-secondary">
          Requirements are loaded dynamically from backend policy and validated before review.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-warm-alt animate-pulse" />
          ))}
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm text-danger whitespace-pre-wrap">
          {error}
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="rounded-3xl border border-line/50 bg-surface px-5 py-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted">
            Required uploaded: {uploadedRequired}/{required.length}
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/40">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{
                width: required.length > 0 ? `${(uploadedRequired / required.length) * 100}%` : "100%",
              }}
            />
          </div>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {requirements.map((req) => {
            const current = latest.get(req.id) ?? null;
            const isBusy = busyType === req.id;
            const accept = Array.isArray(req.accept) ? req.accept.join(",") : "";

            return (
              <div key={req.id} className="rounded-2xl border border-line/50 bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-primary">
                      {req.label}
                      {req.required ? <span className="ml-1 text-danger">*</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Allowed: {accept || "any"} · Max: {req.maxSizeMB}MB
                    </div>
                  </div>
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      current
                        ? "bg-success/12 text-success"
                        : req.required
                          ? "bg-warning/12 text-warning"
                          : "bg-warm-alt text-secondary",
                    ].join(" ")}
                  >
                    {current ? "Uploaded" : req.required ? "Required" : "Optional"}
                  </span>
                </div>

                {current ? (
                  <div className="mt-3 rounded-xl bg-warm-alt p-3">
                    <div className="text-sm font-semibold text-primary break-all">
                      {current.originalName ?? current.type}
                    </div>
                    <div className="mt-1 text-xs text-secondary">
                      {current.mimeType ?? "Unknown"} · Uploaded {toDateLabel(current.createdAt)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyType !== null}
                        onClick={() => void view(current)}
                        className="rounded-xl border border-line/80 bg-surface px-3 py-2 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-50"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        disabled={busyType !== null}
                        onClick={() => void download(current)}
                        className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover disabled:opacity-50"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={busyType !== null}
                        onClick={() => void remove(current)}
                        className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger/15 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3">
                  <label
                    htmlFor={`doc-upload-${req.id}`}
                    className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-accent-text hover:bg-brand-hover"
                  >
                    {current ? "Replace file" : "Upload file"}
                  </label>
                  <input
                    id={`doc-upload-${req.id}`}
                    type="file"
                    accept={accept}
                    disabled={busyType !== null}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      void upload(req, file);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>

                {isBusy && busyMessage ? (
                  <div className="mt-3 rounded-xl border border-line bg-warm-alt px-3 py-2 text-xs text-secondary">
                    {busyMessage}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
