"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshCw, Search, Wallet } from "lucide-react";
import { PortalShell } from "@/components/portal/PortalShell";
import { StatusPill } from "@/components/portal/ui/StatusPill";
import { SkeletonBlock } from "@/components/portal/ui/Skeleton";
import { RefundIllustration } from "@/components/portal/ui/PortalIllustration";
import { portalRowSecondary } from "@/components/portal/ui/portal-actions";
import { useAuth } from "@/lib/auth/auth-context";
import { getUserRefunds } from "@/lib/api/portal/user";

type Refund = Awaited<ReturnType<typeof getUserRefunds>>["items"][number];

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: Awaited<ReturnType<typeof getUserRefunds>> };

function toInt(v: string | null, fallback: number): number {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function prettyStatus(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatMoney(amount: number, currency?: string | null): string {
  const cur = (currency ?? "AED").trim().toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur} ${amount}`;
  }
}

function RefundCard({ refund }: { refund: Refund }) {
  return (
    <article className="portal-record-card">
      <div className="px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-primary">
                  Refund #{refund.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  Booking #{refund.bookingId.slice(0, 8).toUpperCase()} · {formatDate(refund.createdAt)}
                </div>
              </div>
              <StatusPill status={refund.status}>{prettyStatus(refund.status)}</StatusPill>
            </div>
            <div className="mt-2">
              <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-secondary">
                {formatMoney(refund.amount, refund.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AccountRefundsPage() {
  return (
    <Suspense
      fallback={
        <PortalShell role="customer" title="Refunds" subtitle="Track refund states and payouts">
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        </PortalShell>
      }
    >
      <AccountRefundsContent />
    </Suspense>
  );
}

function AccountRefundsContent() {
  const { status: authStatus } = useAuth();
  const searchParams = useSearchParams();
  const page = toInt(searchParams.get("page"), 1);
  const pageSize = toInt(searchParams.get("pageSize"), 10);

  const [state, setState] = useState<ViewState>({ kind: "loading" });
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (authStatus === "loading") return;
      setState({ kind: "loading" });
      try {
        const data = await getUserRefunds({ page, pageSize });
        if (!alive) return;
        setState({ kind: "ready", data });
      } catch (error) {
        if (!alive) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : "Failed to load refunds" });
      }
    }
    void load();
    return () => { alive = false; };
  }, [authStatus, page, pageSize]);

  const filtered = useMemo(() => {
    if (state.kind !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.data.items;
    return state.data.items.filter((r) => [r.id, r.bookingId, r.status].join(" ").toLowerCase().includes(q));
  }, [state, query]);

  const pageMeta = useMemo(() => {
    if (state.kind !== "ready") return null;
    return {
      totalPages: Math.max(1, Math.ceil(state.data.total / state.data.pageSize)),
      currentPage: state.data.page,
      pageSize: state.data.pageSize,
    };
  }, [state]);

  return (
    <PortalShell role="customer" title="Refunds" subtitle="Track statuses for refund operations">
      <div className="space-y-4">
        {/* Command bar */}
        <div className="portal-command-bar">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by refund or booking ID..."
              className="h-9 w-full rounded-lg bg-neutral-50 pl-8 pr-3 text-sm text-primary outline-none ring-1 ring-neutral-200/60 focus:ring-2 focus:ring-brand/20 focus:bg-white transition-all"
            />
          </div>
          {state.kind === "ready" ? (
            <div className="ml-auto text-[11px] text-muted">{filtered.length} refunds</div>
          ) : null}
        </div>

        {state.kind === "loading" ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
        ) : state.kind === "error" ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/8 p-5">
            <div className="text-sm font-semibold text-primary">Could not load refunds</div>
            <div className="mt-1 text-sm text-secondary">{state.message}</div>
            <button
              type="button"
              onClick={() => setState({ kind: "loading" })}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/60 px-6 py-12 text-center">
            <RefundIllustration className="opacity-90" />
            <div className="mt-4 text-sm font-semibold text-primary">
              {query ? "No refunds match" : "No refunds yet"}
            </div>
            <div className="mt-1 max-w-xs text-xs leading-relaxed text-muted">
              {query ? "Try a different search term." : "Refunds from booking operations appear here."}
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((refund) => (
              <RefundCard key={refund.id} refund={refund} />
            ))}
          </div>
        )}

        {pageMeta && pageMeta.totalPages > 1 ? (
          <div className="flex items-center justify-between rounded-xl border border-line/40 bg-surface/80 px-4 py-3">
            <div className="text-xs text-muted">Page {pageMeta.currentPage} of {pageMeta.totalPages}</div>
            <div className="flex gap-2">
              <Link
                href={`/account/refunds?page=${Math.max(1, pageMeta.currentPage - 1)}&pageSize=${pageMeta.pageSize}`}
                aria-disabled={pageMeta.currentPage <= 1}
                className={`${portalRowSecondary} ${pageMeta.currentPage <= 1 ? "pointer-events-none opacity-50" : ""}`}
              >
                Previous
              </Link>
              <Link
                href={`/account/refunds?page=${Math.min(pageMeta.totalPages, pageMeta.currentPage + 1)}&pageSize=${pageMeta.pageSize}`}
                aria-disabled={pageMeta.currentPage >= pageMeta.totalPages}
                className={`${portalRowSecondary} ${pageMeta.currentPage >= pageMeta.totalPages ? "pointer-events-none opacity-50" : ""}`}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}
