"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import {
  getAdminContactSubmissions,
  updateAdminContactSubmissionStatus,
  type AdminContactSubmission,
} from "@/lib/api/portal/admin";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: { page: number; pageSize: number; total: number; items: AdminContactSubmission[] } };

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdminContactSubmissionsPage() {
  const [status, setStatus] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [topic, setTopic] = useState<"ALL" | "BOOKING" | "OWNERS" | "PARTNERS" | "OTHER">("ALL");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const data = await getAdminContactSubmissions({ page: 1, pageSize: 100, status, topic });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load contact submissions" });
      }
    }
    void run();
    return () => { alive = false; };
  }, [status, topic]);

  const items = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.data.items;
    return state.data.items.filter((item) => JSON.stringify(item).toLowerCase().includes(q));
  }, [state, query]);

  async function toggleResolved(item: AdminContactSubmission) {
    setBusyId(item.id);
    try {
      await updateAdminContactSubmissionStatus(item.id, { status: item.status === "RESOLVED" ? "OPEN" : "RESOLVED" });
      setState({ kind: "loading" });
      const data = await getAdminContactSubmissions({ page: 1, pageSize: 100, status, topic });
      setState({ kind: "ready", data });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalShell role="admin" title="Contact Submissions" subtitle="Incoming website inquiries with topic/status filters">
      <div className="space-y-4">
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone, message..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          <select value={topic} onChange={(e) => setTopic(e.target.value as typeof topic)} className="portal-select">
            <option value="ALL">All topics</option>
            <option value="BOOKING">Booking</option>
            <option value="OWNERS">Owners</option>
            <option value="PARTNERS">Partners</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="portal-select">
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{items.length} submissions</div>
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
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-semibold text-primary">No submissions found</div>
            <div className="mt-1 text-xs text-muted">Try adjusting the topic or status filter.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="portal-record-card">
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-primary">{item.name}</div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            {item.email}{item.phone ? ` · ${item.phone}` : ""} · {formatDate(item.createdAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StatusPill status={item.topic}>{prettyStatus(item.topic)}</StatusPill>
                          <StatusPill status={item.status}>{prettyStatus(item.status)}</StatusPill>
                        </div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-xs text-secondary">{item.message}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/admin/contact-submissions/${encodeURIComponent(item.id)}`}
                          className="inline-flex h-8 items-center rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt transition"
                        >
                          Open detail
                        </Link>
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          onClick={() => void toggleResolved(item)}
                          className="inline-flex h-8 items-center rounded-lg border border-line/50 bg-surface px-3 text-xs font-semibold text-primary hover:bg-warm-alt disabled:opacity-60 transition"
                        >
                          {item.status === "RESOLVED" ? "Mark open" : "Mark resolved"}
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
