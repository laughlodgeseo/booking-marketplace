"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileCheck, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
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
    if (!newTab) { alert("Please allow popups to view documents."); setBusy(null); return; }
    newTab.opener = null;
    try {
      const blob = await viewAdminCustomerDocument(item.id);
      const url = URL.createObjectURL(blob);
      newTab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch { newTab.close(); }
    finally { setBusy(null); }
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
                        <Link href={`/admin/customer-documents/${encodeURIComponent(item.id)}`} className="inline-flex h-8 items-center rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition">
                          Open page
                        </Link>
                        <button type="button" disabled={busy !== null} onClick={() => void view(item)} className="inline-flex h-8 items-center rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60 transition">
                          View
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void download(item)} className="inline-flex h-8 items-center rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60 transition">
                          Download
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void approve(item)} className="inline-flex h-8 items-center rounded-lg bg-success/90 px-3 text-xs font-semibold text-white hover:bg-success disabled:opacity-60 transition">
                          Approve
                        </button>
                        <button type="button" disabled={busy !== null} onClick={() => void reject(item)} className="inline-flex h-8 items-center rounded-lg bg-danger/90 px-3 text-xs font-semibold text-white hover:bg-danger disabled:opacity-60 transition">
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
