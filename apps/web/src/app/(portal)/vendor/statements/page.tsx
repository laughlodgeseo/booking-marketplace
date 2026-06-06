"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Search } from "lucide-react";

import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { AnalyticsIllustration } from "@/components/portal/ui/PortalIllustration";
import { portalRowPrimary, portalRowSecondary } from "@/components/portal/ui/portal-actions";
import { vendorListStatements, type VendorStatementListItem } from "@/lib/api/portal/finance";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; items: VendorStatementListItem[]; page: number; pageSize: number; total: number };

function safeInt(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return "—";
  const cur = (currency ?? "AED").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${amount.toLocaleString()}`;
  }
}

export default function VendorStatementsPage() {
  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let alive = true;
    async function run() {
      setState({ kind: "loading" });
      try {
        const res = await vendorListStatements({ page, pageSize });
        const items = Array.isArray(res.items) ? res.items : [];
        if (!alive) return;
        setState({
          kind: "ready",
          items,
          page: safeInt(res.page, page),
          pageSize: safeInt(res.pageSize, pageSize),
          total: safeInt(res.total, items.length),
        });
      } catch (e) {
        if (!alive) return;
        setState({ kind: "error", message: e instanceof Error ? e.message : "Failed to load statements" });
      }
    }
    void run();
    return () => { alive = false; };
  }, [page]);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const qq = q.trim().toLowerCase();
    if (!qq) return state.items;
    return state.items.filter((s) =>
      [s.id, s.vendorId, s.status, s.currency, s.periodStart, s.periodEnd].join(" | ").toLowerCase().includes(qq)
    );
  }, [state, q]);

  const canPrev = state.kind === "ready" ? state.page > 1 : false;
  const canNext = state.kind === "ready" ? state.page * state.pageSize < state.total : false;

  return (
    <PortalShell role="vendor" title="Statements" subtitle="Monthly payout summaries — gross, fees, refunds, adjustments">
      <div className="space-y-4">
        {/* Command bar */}
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by ID, month, status..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{filtered.length} statements</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
            <div className="text-sm font-semibold text-primary">Could not load statements</div>
            <div className="mt-1 text-sm text-secondary">{state.message}</div>
            <button type="button" onClick={() => setState({ kind: "loading" })} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 px-6 py-12 text-center">
            <AnalyticsIllustration className="opacity-90" />
            <div className="mt-4 text-sm font-semibold text-primary">No statements yet</div>
            <div className="mt-1 max-w-xs text-xs leading-relaxed text-muted">Monthly statements appear here once generated.</div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((statement) => (
              <article key={statement.id} className="portal-record-card">
                <div className="px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-primary">{monthLabel(statement.periodStart)}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-muted">{statement.id}</div>
                        </div>
                        <StatusPill status={statement.status}>{prettyStatus(statement.status)}</StatusPill>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <div className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            Net: {formatMoney(statement.netPayable, statement.currency)}
                          </div>
                          <div className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] text-secondary">
                            Gross: {formatMoney(statement.grossBookings, statement.currency)}
                          </div>
                        </div>
                        <Link
                          href={`/vendor/statements/${encodeURIComponent(statement.id)}`}
                          className={portalRowPrimary}
                        >
                          View statement
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {state.kind === "ready" && (canPrev || canNext) ? (
          <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
            <div className="text-xs text-muted">Page {state.page} · {state.total} total</div>
            <div className="flex gap-2">
              <button type="button" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))} className={portalRowSecondary}>Previous</button>
              <button type="button" disabled={!canNext} onClick={() => setPage((p) => p + 1)} className={portalRowSecondary}>Next</button>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
