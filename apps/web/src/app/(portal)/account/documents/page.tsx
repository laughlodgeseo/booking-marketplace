"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import {
  deleteUserCustomerDocument,
  getUserCustomerDocuments,
  uploadUserCustomerDocument,
  type CustomerDocumentType,
  type UserCustomerDocument,
} from "@/lib/api/portal/user";

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserCustomerDocuments>> };

// ─── Constants ────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES: Array<{ value: CustomerDocumentType; label: string; description: string }> = [
  { value: "PASSPORT", label: "Passport", description: "International travel document" },
  { value: "EMIRATES_ID", label: "Emirates ID", description: "UAE national identity card" },
  { value: "VISA", label: "Visa / Residency", description: "UAE visa or residency permit" },
  { value: "SELFIE", label: "Selfie", description: "Clear photo of yourself" },
  { value: "OTHER", label: "Other", description: "Any other verification document" },
];

const REQUIRED_TYPES: CustomerDocumentType[] = ["PASSPORT", "EMIRATES_ID"];

const MAX_SIZE_MB = 15;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function prettyDocType(t: string): string {
  if (t === "EMIRATES_ID") return "Emirates ID";
  return t.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeLabel(mime: string | null | undefined): string {
  if (!mime) return "";
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "WEBP";
  if (mime.includes("heic") || mime.includes("heif")) return "HEIC";
  return mime.split("/")[1]?.toUpperCase() ?? "";
}

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.has(file.type)) {
    return `File type not supported. Please upload PDF, JPG, PNG, WEBP, or HEIC.`;
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). Maximum is ${MAX_SIZE_MB} MB.`;
  }
  return null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "VERIFIED":
      return {
        icon: CheckCircle2,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200/60",
        bar: "bg-emerald-500",
      };
    case "REJECTED":
      return {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200/60",
        bar: "bg-red-500",
      };
    default:
      return {
        icon: Clock,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200/60",
        bar: "bg-amber-400",
      };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RequirementsSidebar() {
  return (
    <aside className="flex flex-col gap-4">
      {/* Required documents checklist */}
      <div className="rounded-2xl border border-[rgb(210_218_240/0.18)] bg-white/95 p-5 shadow-[0_4px_14px_rgba(33,39,53,0.07)]">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Shield className="h-3.5 w-3.5" />
          </div>
          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">Required Documents</div>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-gray-500">
          These documents are required before your first confirmed booking check-in.
        </p>
        <ul className="flex flex-col gap-2">
          {REQUIRED_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-2.5 text-xs text-gray-700">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              {prettyDocType(type)}
            </li>
          ))}
        </ul>
      </div>

      {/* Accepted formats */}
      <div className="rounded-2xl border border-[rgb(210_218_240/0.18)] bg-white/95 p-5 shadow-[0_4px_14px_rgba(33,39,53,0.07)]">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-gray-500">Accepted Formats</div>
        <div className="flex flex-wrap gap-1.5">
          {["PDF", "JPG", "PNG", "WEBP", "HEIC"].map((fmt) => (
            <span key={fmt} className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
              {fmt}
            </span>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-gray-400">Maximum file size: {MAX_SIZE_MB} MB</div>
      </div>

      {/* Privacy note */}
      <div className="rounded-2xl border border-[rgb(210_218_240/0.18)] bg-indigo-50/60 p-4">
        <div className="flex items-start gap-2.5">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
          <p className="text-[11px] leading-relaxed text-indigo-700">
            Documents are stored securely and reviewed only for booking verification purposes. They are never shared with third parties.
          </p>
        </div>
      </div>
    </aside>
  );
}

function StatusSummaryRow({ items }: { items: UserCustomerDocument[] }) {
  const counts = {
    total: items.length,
    verified: items.filter((d) => d.status === "VERIFIED").length,
    pending: items.filter((d) => d.status === "PENDING").length,
    rejected: items.filter((d) => d.status === "REJECTED").length,
  };

  if (counts.total === 0) return null;

  const stats = [
    {
      label: "Uploaded",
      value: counts.total,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      icon: FileText,
    },
    {
      label: "Verified",
      value: counts.verified,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: CheckCircle2,
    },
    {
      label: "Pending",
      value: counts.pending,
      color: "text-amber-600",
      bg: "bg-amber-50",
      icon: Clock,
    },
    {
      label: "Rejected",
      value: counts.rejected,
      color: "text-red-600",
      bg: "bg-red-50",
      icon: XCircle,
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col gap-1.5 rounded-2xl border border-[rgb(210_218_240/0.18)] bg-white/95 p-4 shadow-[0_2px_8px_rgba(33,39,53,0.05)]"
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
            <s.icon className={`h-4 w-4 ${s.color}`} />
          </div>
          <div className={`text-xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
          <div className="text-[11px] font-medium text-gray-400">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountDocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [uploadType, setUploadType] = useState<CustomerDocumentType>("PASSPORT");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const showToast = useCallback((kind: "success" | "error", text: string) => {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 5000);
  }, []);

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

  function handleFileSelect(file: File | null | undefined) {
    setFileError(null);
    if (!file) {
      setUploadFile(null);
      return;
    }
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setUploadFile(file);
  }

  function handleRemoveFile() {
    setUploadFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    if (!uploadFile || uploading) return;
    setUploading(true);
    setFileError(null);
    try {
      await uploadUserCustomerDocument({ file: uploadFile, type: uploadType, notes: uploadNotes });
      setUploadFile(null);
      setUploadNotes("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("success", "Document uploaded successfully and is pending review.");
      await load();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: UserCustomerDocument) {
    if (!window.confirm(`Delete this ${prettyDocType(doc.type)} document?`)) return;
    setBusy(doc.id);
    try {
      await deleteUserCustomerDocument(doc.id);
      await load();
      showToast("success", "Document deleted.");
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : "Failed to delete document.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <PortalShell role="customer" title="My Documents" subtitle="Upload and manage guest verification documents">
      {/* Toast notification */}
      {toast ? (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl transition-all ${
            toast.kind === "success"
              ? "border-emerald-200/60 bg-white text-emerald-700"
              : "border-red-200/60 bg-white text-red-700"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          )}
          <span className="text-sm font-medium">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-1 text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="space-y-6">
        {state.kind === "loading" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-2xl" />)}
            </div>
            <SkeletonBlock className="h-10 rounded-xl" />
            <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
              <SkeletonBlock className="h-72 rounded-2xl" />
              <div className="flex flex-col gap-4">
                <SkeletonBlock className="h-40 rounded-2xl" />
                <SkeletonBlock className="h-28 rounded-2xl" />
              </div>
            </div>
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-red-200/40 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <div className="text-sm font-semibold text-red-800">Could not load documents</div>
                <div className="mt-1 text-sm text-red-600">{state.message}</div>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try again
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Page header eyebrow */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Customer Portal</div>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-gray-900">My Documents</h1>
                <p className="mt-0.5 text-sm text-gray-400">Securely upload guest verification files for upcoming stays.</p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50 px-3 py-1.5">
                <Lock className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-700">Documents secure</span>
              </div>
            </div>

            {/* Compliance banner */}
            {state.data.requirement.requiresUpload ? (
              <div className="flex items-start gap-4 rounded-2xl border border-amber-200/50 bg-amber-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-amber-900">
                    Action required — upload verification documents
                    {state.data.requirement.urgent && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">
                        Urgent
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-amber-700">
                    Missing: {state.data.requirement.missingTypes.map(prettyDocType).join(", ")}
                  </div>
                  {state.data.requirement.nextBooking ? (
                    <div className="mt-1 text-[11px] text-amber-600">
                      Next check-in: {formatDate(state.data.requirement.nextBooking.checkIn)} at{" "}
                      {state.data.requirement.nextBooking.property.title}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/50 bg-emerald-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-emerald-900">All required documents verified</div>
                  <div className="mt-0.5 text-xs text-emerald-600">No pending uploads required for upcoming confirmed bookings.</div>
                </div>
              </div>
            )}

            {/* Status summary row */}
            <StatusSummaryRow items={state.data.items} />

            {/* Main content grid */}
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              {/* Left column */}
              <div className="flex flex-col gap-6">
                {/* ── Upload card ──────────────────────────────────────────── */}
                <section
                  aria-labelledby="upload-heading"
                  className="rounded-2xl border border-[rgb(210_218_240/0.22)] bg-white/98 shadow-[0_4px_20px_rgba(33,39,53,0.07)]"
                >
                  <div className="border-b border-[rgb(210_218_240/0.18)] px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <h2 id="upload-heading" className="text-sm font-bold text-gray-900">Upload document</h2>
                        <p className="text-[11px] text-gray-400">Select a document type and choose a file to upload.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Document type */}
                      <div>
                        <label htmlFor="doc-type" className="mb-1.5 block text-xs font-semibold text-gray-600">
                          Document type
                        </label>
                        <select
                          id="doc-type"
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value as CustomerDocumentType)}
                          disabled={uploading}
                          className="portal-select w-full disabled:opacity-60"
                        >
                          {DOCUMENT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* File picker */}
                      <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                          Document file
                        </label>

                        {uploadFile ? (
                          <div className="flex items-center gap-3 rounded-xl border border-indigo-200/60 bg-indigo-50 px-3 py-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                              <FileText className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-xs font-semibold text-gray-800">{uploadFile.name}</div>
                              <div className="text-[10px] text-gray-400">
                                {mimeLabel(uploadFile.type)} · {formatFileSize(uploadFile.size)}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveFile}
                              disabled={uploading}
                              aria-label="Remove file"
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-500 disabled:opacity-50 transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor="file-upload"
                            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                              fileError
                                ? "border-red-300 bg-red-50 hover:border-red-400"
                                : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40"
                            }`}
                          >
                            <Upload className={`h-5 w-5 ${fileError ? "text-red-400" : "text-gray-400"}`} />
                            <div>
                              <span className="text-xs font-semibold text-indigo-600 hover:underline">Choose file</span>
                              <span className="text-xs text-gray-400"> or drag and drop</span>
                            </div>
                            <span className="text-[10px] text-gray-400">PDF, JPG, PNG, WEBP, HEIC · max {MAX_SIZE_MB} MB</span>
                          </label>
                        )}
                        <input
                          ref={fileInputRef}
                          id="file-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif"
                          onChange={(e) => handleFileSelect(e.target.files?.[0])}
                          disabled={uploading}
                          className="sr-only"
                          aria-label="Upload document file"
                        />
                      </div>
                    </div>

                    {/* File validation error */}
                    {fileError ? (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <p className="text-xs text-red-700">{fileError}</p>
                      </div>
                    ) : null}

                    {/* Notes */}
                    <div className="mt-4">
                      <label htmlFor="upload-notes" className="mb-1.5 block text-xs font-semibold text-gray-600">
                        Notes for admin <span className="font-normal text-gray-400">(optional)</span>
                      </label>
                      <textarea
                        id="upload-notes"
                        rows={2}
                        value={uploadNotes}
                        onChange={(e) => setUploadNotes(e.target.value)}
                        disabled={uploading}
                        placeholder="Any additional context about this document…"
                        maxLength={500}
                        className="w-full resize-none rounded-xl border border-[rgb(210_218_240/0.40)] bg-gray-50 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-60 transition-all"
                      />
                    </div>

                    {/* Upload button — full width, impossible to miss */}
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => void handleUpload()}
                        disabled={!uploadFile || uploading}
                        className={`flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-sm font-bold tracking-wide shadow-sm transition-all ${
                          uploadFile && !uploading
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-[0_4px_12px_rgba(79,70,229,0.30)]"
                            : "cursor-not-allowed bg-gray-100 text-gray-400"
                        }`}
                        aria-disabled={!uploadFile || uploading}
                      >
                        {uploading ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            Uploading document…
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload document
                          </>
                        )}
                      </button>

                      {!uploadFile && !uploading ? (
                        <p className="mt-2 text-center text-[11px] text-gray-400">
                          Select a file above to enable upload
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>

                {/* ── Uploaded documents ────────────────────────────────────── */}
                <section aria-labelledby="docs-heading">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="docs-heading" className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                      Uploaded documents
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                        {state.data.items.length}
                      </span>
                    </h2>
                    <button
                      type="button"
                      onClick={() => void load()}
                      disabled={uploading}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </div>

                  {state.data.items.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-sm font-semibold text-gray-600">No documents uploaded yet</div>
                      <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-gray-400">
                        Upload your first verification document using the form above.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {state.data.items.map((doc) => {
                        const sc = statusConfig(doc.status);
                        return (
                          <article
                            key={doc.id}
                            onClick={() => router.push(`/account/documents/${encodeURIComponent(doc.id)}`)}
                            className="portal-record-card group cursor-pointer"
                          >
                            <div className={`portal-record-card-status-bar ${sc.bar}`} />
                            <div className="px-5 py-4">
                              <div className="flex min-w-0 items-start gap-3">
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${sc.bg} border ${sc.border} transition-all group-hover:scale-105`}>
                                  <FileText className={`h-5 w-5 ${sc.color}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="text-sm font-bold text-gray-900">{prettyDocType(doc.type)}</div>
                                      {doc.originalName ? (
                                        <div className="mt-0.5 truncate text-[11px] font-mono text-gray-400 max-w-[220px]">
                                          {doc.originalName}
                                        </div>
                                      ) : null}
                                    </div>
                                    <StatusPill status={doc.status}>{prettyStatus(doc.status)}</StatusPill>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-400">
                                    <span>Uploaded {formatDate(doc.createdAt)}</span>
                                    {doc.mimeType ? <span>{mimeLabel(doc.mimeType)}</span> : null}
                                    {doc.sizeBytes ? <span>{formatFileSize(doc.sizeBytes)}</span> : null}
                                    {doc.verifiedAt ? (
                                      <span className="text-emerald-600">Verified {formatDate(doc.verifiedAt)}</span>
                                    ) : null}
                                  </div>

                                  {doc.reviewNotes ? (
                                    <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-2.5 py-1.5 text-[11px] text-indigo-700">
                                      <span className="font-semibold">Admin note:</span> {doc.reviewNotes}
                                    </div>
                                  ) : null}

                                  <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <Link
                                      href={`/account/documents/${encodeURIComponent(doc.id)}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgb(210_218_240/0.40)] bg-white px-3 text-[11px] font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                                    >
                                      <FileText className="h-3 w-3" /> View
                                    </Link>
                                    <a
                                      href={`/api${doc.downloadUrl}`}
                                      download
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[rgb(210_218_240/0.40)] bg-white px-3 text-[11px] font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                                    >
                                      <Download className="h-3 w-3" /> Download
                                    </a>
                                    <button
                                      type="button"
                                      disabled={busy === doc.id}
                                      onClick={(e) => { e.stopPropagation(); void handleDelete(doc); }}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200/60 bg-red-50 px-3 text-[11px] font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                    >
                                      {busy === doc.id ? (
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                                      ) : (
                                        <X className="h-3 w-3" />
                                      )}
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Right column — sidebar */}
              <RequirementsSidebar />
            </div>
          </>
        )}
      </div>
    </PortalShell>
  );
}
